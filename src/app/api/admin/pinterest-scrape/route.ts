import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import {
  resolvePinUrl,
  extractPinMedia,
  extractWithHeadless,
  downloadPinMedia,
  type PinMedia,
} from "@/lib/pinterest";

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function resolveTagIds(tagNames: string[]): Promise<string[]> {
  const ids: string[] = [];
  for (const name of tagNames) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    const slug = slugify(trimmed);
    if (!slug) continue;
    try {
      const tag = await prisma.wallpaperTag.upsert({
        where: { slug }, update: {}, create: { name: trimmed, slug },
      });
      ids.push(tag.id);
    } catch {
      const existing = await prisma.wallpaperTag.findFirst({ where: { slug } });
      if (existing) ids.push(existing.id);
    }
  }
  return ids;
}

// Legacy single/batch URL ingest. Kept for the existing "Paste URLs" mode in
// the admin Import tab and for any external integrations. The newer
// pinterest-search + pinterest-import endpoints power the search-driven flow.

async function extract(pinUrl: string): Promise<PinMedia> {
  let media: PinMedia | null = null;
  try {
    media = await extractPinMedia(pinUrl);
  } catch {
    media = null;
  }
  if (media && (media.videoUrl || media.imageUrl)) return media;

  const headless = await extractWithHeadless(pinUrl);
  if (headless && (headless.videoUrl || headless.imageUrl)) return headless;

  throw new Error("No media found on this pin");
}

export async function POST(request: Request) {
  try {
    const user = await requireAdmin();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const urls: string[] = (Array.isArray(body.urls) ? body.urls : [body.url]).filter(Boolean);
    const forceCategoryId: string | undefined = body.categoryId || undefined;
    const rawTagNames: string[] = Array.isArray(body.tagNames)
      ? body.tagNames.filter((t: unknown): t is string => typeof t === "string")
      : [];
    const tagIds = rawTagNames.length ? await resolveTagIds(rawTagNames) : [];

    if (!urls.length) return NextResponse.json({ error: "urls required" }, { status: 400 });

    const results = [];

    for (const rawUrl of urls.slice(0, 20)) {
      if (!rawUrl?.trim()) continue;
      try {
        const pinUrl = await resolvePinUrl(rawUrl);
        const media = await extract(pinUrl);

        let mediaUrl = media.videoUrl ?? media.imageUrl!;
        let isVideo = !!media.videoUrl;

        if (isVideo && mediaUrl.includes(".m3u8")) {
          if (media.imageUrl) { mediaUrl = media.imageUrl; isVideo = false; }
          else throw new Error("Only HLS stream found — no MP4 to download");
        }

        const { url: fileUrl, actualType } = await downloadPinMedia(mediaUrl, isVideo);

        const wallpaper = await prisma.wallpaper.create({
          data: {
            title: media.title,
            fileUrl,
            type: actualType,
            uploaderId: user.id,
            ...(forceCategoryId ? { categories: { connect: [{ id: forceCategoryId }] } } : {}),
            ...(tagIds.length ? { tags: { connect: tagIds.map((id) => ({ id })) } } : {}),
          },
          select: {
            id: true, title: true, fileUrl: true, type: true, createdAt: true,
            categories: { select: { id: true, name: true, slug: true } },
            tags: { select: { id: true, name: true, slug: true } },
          },
        });

        results.push({ url: rawUrl, status: "ok", wallpaper });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        results.push({ url: rawUrl, status: "error", error: msg });
      }
    }

    return NextResponse.json({ results });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
