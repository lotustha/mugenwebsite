import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { ensureWallpapersBucket } from "@/utils/supabase/admin";

const MAX_BYTES = 100 * 1024 * 1024; // 100 MB

// ─── Normalize any Pinterest URL to full pin URL ──────────────────────────────
async function resolvePinUrl(raw: string): Promise<string> {
  let url = raw.trim();
  if (!url.startsWith("http")) url = `https://${url}`;

  // pin.it short links → follow redirect
  if (/pin\.it\//i.test(url)) {
    const r = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(10_000),
    });
    return r.url;
  }
  return url;
}

// ─── Pinterest internal API fallback: fetch video_list by pin ID ─────────────
async function tryPinterestApi(pinId: string): Promise<string | null> {
  try {
    const apiUrl = `https://www.pinterest.com/resource/PinResource/get/?source_url=/pin/${pinId}/&data=${encodeURIComponent(JSON.stringify({ options: { id: pinId } }))}&_=${Date.now()}`;
    const res = await fetch(apiUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "X-Requested-With": "XMLHttpRequest",
        Accept: "application/json, text/javascript, */*; q=0.01",
        Referer: `https://www.pinterest.com/pin/${pinId}/`,
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const videoList = data?.resource_response?.data?.videos?.video_list as Record<string, { url?: string }> | undefined;
    if (!videoList) return null;
    for (const quality of ["V_1080P", "V_720P", "V_480P", "V_360P"]) {
      const entry = videoList[quality];
      if (entry?.url && !entry.url.includes(".m3u8")) return entry.url;
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Scrape metadata from a single pin page ───────────────────────────────────
async function scrapePinMeta(pinUrl: string): Promise<{
  videoUrl: string | null;
  imageUrl: string | null;
  title: string;
  category: string;
}> {
  const res = await fetch(pinUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      "Cache-Control": "no-cache",
      "Pragma": "no-cache",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Upgrade-Insecure-Requests": "1",
    },
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) throw new Error(`Pinterest returned HTTP ${res.status}`);
  const html = await res.text();

  // Pinterest JSON-encodes forward slashes as / — unescape before matching
  const unescaped = html.replace(/\\u002F/g, "/").replace(/\\u0026/g, "&");

  // ── Video URL — try multiple patterns in priority order ──────────────────
  let videoUrl: string | null =
    // og:video:secure_url
    html.match(/<meta[^>]+property="og:video:secure_url"[^>]+content="([^"]+)"/i)?.[1] ??
    html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:video:secure_url"/i)?.[1] ??
    // og:video (may be HLS or MP4)
    html.match(/<meta[^>]+property="og:video"[^>]+content="([^"]+)"/i)?.[1] ??
    html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:video"/i)?.[1] ??
    // Direct v.pinimg.com MP4 — check unescaped version first (slashes may be /)
    unescaped.match(/https?:\/\/v\.pinimg\.com\/videos\/[^\s"'>]+\.mp4/)?.[0] ??
    html.match(/https?:\/\/v\.pinimg\.com\/videos\/[^\s"'>]+\.mp4/)?.[0] ??
    null;

  // ── Embedded JSON video_list (Pinterest stores data as /-escaped JSON) ─
  if (!videoUrl) {
    for (const quality of ["V_1080P", "V_720P", "V_480P", "V_360P"]) {
      const m = unescaped.match(
        new RegExp(`"${quality}"\\s*:\\s*\\{[^}]*?"url"\\s*:\\s*"(https://v\\.pinimg\\.com[^"]+\\.mp4[^"]*)"`)
      );
      if (m?.[1]) { videoUrl = m[1]; break; }
    }
  }

  // ── Pinterest internal resource API fallback ──────────────────────────────
  if (!videoUrl) {
    const pinId = pinUrl.match(/\/pin\/(\d+)\//)?.[1];
    if (pinId) videoUrl = await tryPinterestApi(pinId);
  }

  // ── Image URL ─────────────────────────────────────────────────────────────
  const imageUrl =
    html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)?.[1] ??
    html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:image"/i)?.[1] ??
    null;

  // ── Title — og:title → strip Pinterest suffix ────────────────────────────
  const rawTitle =
    html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)?.[1] ??
    html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:title"/i)?.[1] ??
    html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ??
    "Pinterest Wallpaper";

  const title = rawTitle
    .replace(/\s*[|\-–]\s*Pinterest\s*$/i, "")
    .replace(/\s+on\s+Pinterest\s*$/i, "")
    .trim() || "Pinterest Wallpaper";

  // ── Category — try board name from embedded JSON, then URL path ──────────
  let category = "Anime Wallpaper";

  // Pinterest embeds JSON in <script id="__PWS_DATA__"> or similar
  const jsonMatch = html.match(/<script[^>]+id="__PWS_DATA__"[^>]*>(\{[\s\S]*?\})<\/script>/i);
  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[1]);
      // Walk common paths where board name lives
      const pinsObj =
        data?.props?.initialReduxState?.pins ??
        data?.initialReduxState?.pins ??
        data?.resourceResponses?.[0]?.response?.data?.board ??
        {};
      const firstPin = Object.values(pinsObj)[0] as any;
      const boardName =
        firstPin?.board?.name ??
        firstPin?.board?.section_display_name ??
        data?.props?.pageProps?.board?.name;
      if (boardName) category = boardName;
    } catch {
      // ignore JSON parse errors
    }
  }

  // Fallback: extract board name from URL path
  // https://pinterest.com/username/board-name/pin/…
  if (category === "Anime Wallpaper") {
    const m = pinUrl.match(/pinterest\.[a-z.]+\/[^/]+\/([^/]+)\//);
    if (m?.[1] && m[1] !== "pin") {
      category = m[1].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    }
  }

  return { videoUrl, imageUrl, title, category };
}

// ─── Download URL → Supabase Storage ─────────────────────────────────────────
async function downloadToSupabase(
  mediaUrl: string,
  isVideo: boolean,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{ url: string; actualType: "IMAGE" | "VIDEO" }> {
  const res = await fetch(mediaUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Referer": "https://www.pinterest.com/",
      "Accept": isVideo ? "video/mp4,video/*;q=0.9,*/*;q=0.8" : "image/webp,image/*,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);

  const contentType = res.headers.get("content-type") ?? (isVideo ? "video/mp4" : "image/jpeg");

  // If we expected video but Pinterest redirected to the thumbnail image,
  // save it as an image rather than failing the whole import
  const actuallyVideo = isVideo && !contentType.startsWith("image/");
  const actualType: "IMAGE" | "VIDEO" = actuallyVideo ? "VIDEO" : "IMAGE";

  // Guard size
  const lengthHeader = res.headers.get("content-length");
  if (lengthHeader && parseInt(lengthHeader) > MAX_BYTES) {
    throw new Error("File too large (max 100 MB)");
  }

  const buffer = await res.arrayBuffer();
  if (buffer.byteLength > MAX_BYTES) throw new Error("File too large (max 100 MB)");

  const ext = actuallyVideo ? "mp4" : (contentType.split("/")[1]?.split(";")[0]?.replace("jpeg", "jpg") ?? "jpg");
  const filename = `pinterest/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  await ensureWallpapersBucket();

  const { error } = await supabase.storage
    .from("wallpapers")
    .upload(filename, Buffer.from(buffer), { contentType, upsert: false });

  if (error) throw new Error(error.message);

  const { data: { publicUrl } } = supabase.storage.from("wallpapers").getPublicUrl(filename);
  return { url: publicUrl, actualType };
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let uploader = await prisma.user.findUnique({ where: { email: user.email! } });
    if (!uploader) {
      uploader = await prisma.user.create({ data: { id: user.id, email: user.email!, role: "ADMIN" } });
    }

    const body = await request.json();
    const urls: string[] = (Array.isArray(body.urls) ? body.urls : [body.url]).filter(Boolean);
    // If the caller passes a categoryId, skip auto-detection and use it directly
    const forceCategoryId: string | undefined = body.categoryId || undefined;

    if (!urls.length) return NextResponse.json({ error: "urls required" }, { status: 400 });

    const results = [];

    for (const rawUrl of urls.slice(0, 20)) {
      if (!rawUrl?.trim()) continue;

      try {
        const pinUrl = await resolvePinUrl(rawUrl);
        const { videoUrl, imageUrl, title } = await scrapePinMeta(pinUrl);

        if (!videoUrl && !imageUrl) {
          results.push({ url: rawUrl, status: "error", error: "No media found on this pin. Make sure it's a public pin URL." });
          continue;
        }

        // Prefer video; skip HLS (.m3u8) streams
        let mediaUrl = videoUrl ?? imageUrl!;
        let isVideo = !!videoUrl;

        if (isVideo && mediaUrl.includes(".m3u8")) {
          if (imageUrl) { mediaUrl = imageUrl; isVideo = false; }
          else {
            results.push({ url: rawUrl, status: "error", error: "Only HLS stream found — not supported. Try a pin with an MP4 video." });
            continue;
          }
        }

        const { url: fileUrl, actualType } = await downloadToSupabase(mediaUrl, isVideo, supabase);

        // Use forced category from UI if provided
        const categoryId = forceCategoryId;

        let wallpaper: any;
        try {
          // Post-migration: many-to-many categories
          wallpaper = await (prisma.wallpaper as any).create({
            data: {
              title, fileUrl, type: actualType, uploaderId: uploader.id,
              ...(categoryId ? { categories: { connect: [{ id: categoryId }] } } : {}),
            },
            select: {
              id: true, title: true, fileUrl: true, type: true, createdAt: true,
              categories: { select: { id: true, name: true, slug: true } },
            },
          });
        } catch {
          // Pre-migration: single categoryId FK
          wallpaper = await prisma.wallpaper.create({
            data: {
              title, fileUrl, type: actualType, uploaderId: uploader.id,
              ...(categoryId ? { categoryId } : {}),
            } as any,
          });
          wallpaper = { ...wallpaper, categories: [] };
        }

        results.push({ url: rawUrl, status: "ok", wallpaper });
      } catch (e: any) {
        results.push({ url: rawUrl, status: "error", error: e?.message ?? "Unknown error" });
      }
    }

    return NextResponse.json({ results });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
