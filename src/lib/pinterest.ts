// Pinterest scraping + search + import helpers, shared by:
//   - /api/admin/pinterest-scrape  (single/multiple pin URL ingest, legacy)
//   - /api/admin/pinterest-search  (keyword search, returns grid metadata)
//   - /api/admin/pinterest-import  (bulk import from selected search results)

import { saveBuffer } from "@/lib/storage";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export const PINTEREST_MAX_BYTES = 100 * 1024 * 1024;

export interface PinSearchResult {
  pinId: string;
  title: string;
  /** Image URL suitable for thumbnail grid (highest available preview). */
  thumbnailUrl: string;
  isVideo: boolean;
  /** Canonical pin URL the import endpoint will scrape. */
  pinUrl: string;
}

export interface PinMedia {
  /** Direct MP4 URL — preferred. Caller can stream-download with fetch. */
  videoUrl: string | null;
  /** HLS playlist URL — requires ffmpeg to remux into MP4. Set when no direct MP4 exists. */
  hlsUrl: string | null;
  imageUrl: string | null;
  title: string;
  category: string;
}

// ─── URL normalisation ───────────────────────────────────────────────────────

/** Resolve pin.it short links to full pinterest.com pin URLs. */
export async function resolvePinUrl(raw: string): Promise<string> {
  let url = raw.trim();
  if (!url.startsWith("http")) url = `https://${url}`;

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

// ─── Search ──────────────────────────────────────────────────────────────────

/** Normalize a raw Pinterest pin/result object into our PinSearchResult shape. */
function normalisePinRecord(raw: unknown): PinSearchResult | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === "string" ? r.id : null;
  if (!id) return null;
  if (r.type && r.type !== "pin") return null;

  const title =
    (typeof r.grid_title === "string" && r.grid_title) ||
    (typeof r.title === "string" && r.title) ||
    (typeof r.description === "string" && r.description.slice(0, 80)) ||
    "Pinterest Wallpaper";

  const isVideo = !!(r.videos && typeof r.videos === "object");

  const images = r.images as Record<string, { url?: string }> | undefined;
  const thumbnailUrl =
    images?.orig?.url ??
    images?.["736x"]?.url ??
    images?.["474x"]?.url ??
    images?.["236x"]?.url ??
    "";
  if (!thumbnailUrl) return null;

  return {
    pinId: id,
    title: String(title).trim().slice(0, 120),
    thumbnailUrl,
    isVideo,
    pinUrl: `https://www.pinterest.com/pin/${id}/`,
  };
}

/** Layer 1: undocumented JSON API. Fast but Pinterest 403s without session. */
async function searchViaApi(query: string, limit: number): Promise<PinSearchResult[]> {
  const data = {
    options: { query, scope: "pins", page_size: Math.min(Math.max(limit, 1), 50) },
  };
  const sourceUrl = `/search/pins/?q=${encodeURIComponent(query)}`;
  const apiUrl =
    `https://www.pinterest.com/resource/BaseSearchResource/get/` +
    `?source_url=${encodeURIComponent(sourceUrl)}` +
    `&data=${encodeURIComponent(JSON.stringify(data))}` +
    `&_=${Date.now()}`;

  const res = await fetch(apiUrl, {
    headers: {
      "User-Agent": UA,
      "X-Requested-With": "XMLHttpRequest",
      "Accept": "application/json, text/javascript, */*; q=0.01",
      "Referer": `https://www.pinterest.com${sourceUrl}`,
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json = await res.json();
  const results: unknown[] = json?.resource_response?.data?.results ?? [];
  return results.map(normalisePinRecord).filter((r): r is PinSearchResult => r !== null);
}

/** Layer 2: server-rendered HTML page. Pinterest embeds initial pin data
 *  in <script id="__PWS_DATA__"> for SEO. We dig for pin records. */
async function searchViaHtml(query: string, limit: number): Promise<PinSearchResult[]> {
  const url = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}&rs=typed`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Upgrade-Insecure-Requests": "1",
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  const out: PinSearchResult[] = [];
  const seen = new Set<string>();

  // Walk every embedded JSON blob we can find.
  const scriptMatches = html.matchAll(
    /<script[^>]*(?:id="__PWS_DATA__"|type="application\/json")[^>]*>([\s\S]*?)<\/script>/gi
  );
  for (const m of scriptMatches) {
    let data: unknown;
    try { data = JSON.parse(m[1].trim()); } catch { continue; }

    // Walk the tree, collecting any object that looks like a pin
    const stack: unknown[] = [data];
    while (stack.length && out.length < limit) {
      const node = stack.pop();
      if (!node || typeof node !== "object") continue;
      if (Array.isArray(node)) { stack.push(...node); continue; }

      const o = node as Record<string, unknown>;
      const id = typeof o.id === "string" ? o.id : null;
      if (id && !seen.has(id) && (o.images || o.image_signature)) {
        const norm = normalisePinRecord(o);
        if (norm) { seen.add(id); out.push(norm); }
      }
      for (const v of Object.values(o)) stack.push(v);
    }
    if (out.length >= limit) break;
  }

  return out.slice(0, limit);
}

/** Layer 3: real browser. Slowest, most reliable. Requires Playwright + Chromium. */
async function searchViaHeadless(query: string, limit: number): Promise<PinSearchResult[]> {
  let chromium: typeof import("playwright").chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    throw new Error("Playwright not installed");
  }

  let browser: import("playwright").Browser | null = null;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-blink-features=AutomationControlled"],
    });
    const ctx = await browser.newContext({
      userAgent: UA,
      viewport: { width: 1280, height: 1800 },
      locale: "en-US",
    });
    const page = await ctx.newPage();

    const url = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}&rs=typed`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });

    // Pinterest renders pin tiles with data-test-id="pin"
    await page.waitForSelector('[data-test-id="pin"], [data-test-id="pinrep-image"], div[data-test-pin-id]', { timeout: 12_000 }).catch(() => {});

    // Scroll a couple of times to load more results
    for (let i = 0; i < 3 && i * 8 < limit; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight * 1.5));
      await page.waitForTimeout(800);
    }

    const harvested = await page.evaluate(() => {
      const out: Array<{ pinId: string; title: string; thumbnailUrl: string; isVideo: boolean }> = [];
      const tiles = document.querySelectorAll('[data-test-pin-id], a[href^="/pin/"]');
      const seen = new Set<string>();
      tiles.forEach((el) => {
        const node = el as HTMLElement;
        // Pin id from data attribute or href
        let id = node.getAttribute("data-test-pin-id");
        if (!id) {
          const href = node.getAttribute("href") ?? (node.querySelector('a[href^="/pin/"]')?.getAttribute("href") ?? "");
          const m = href.match(/\/pin\/(\d+)/);
          if (m) id = m[1];
        }
        if (!id || seen.has(id)) return;
        const img = (node.querySelector("img") ?? node.closest('[data-test-id="pin"]')?.querySelector("img")) as HTMLImageElement | null;
        if (!img?.src) return;
        const isVideo = !!(node.querySelector('video') ?? node.closest('[data-test-id="pin"]')?.querySelector('[data-test-id*="video"], video'));
        seen.add(id);
        out.push({
          pinId: id,
          title: img.alt?.trim().slice(0, 120) || "Pinterest Wallpaper",
          thumbnailUrl: img.src,
          isVideo,
        });
      });
      return out;
    });

    return harvested.slice(0, limit).map((h) => ({
      ...h,
      pinUrl: `https://www.pinterest.com/pin/${h.pinId}/`,
    }));
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

/**
 * Three-layer Pinterest search:
 *   1. Undocumented JSON API   (fast; often 403 without session cookies)
 *   2. HTML page + __PWS_DATA__ (server-rendered initial state)
 *   3. Headless Chromium       (slow, needs Playwright)
 *
 * Returns the first layer that yields a non-empty result. If all three
 * fail, the last error is rethrown so callers can show something useful.
 */
export async function searchPins(query: string, limit = 25): Promise<PinSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const errors: string[] = [];

  for (const [name, fn] of [
    ["api", () => searchViaApi(trimmed, limit)],
    ["html", () => searchViaHtml(trimmed, limit)],
    ["headless", () => searchViaHeadless(trimmed, limit)],
  ] as const) {
    try {
      const results = await fn();
      if (results.length > 0) return results;
      errors.push(`${name}: 0 results`);
    } catch (e) {
      errors.push(`${name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  throw new Error(`All search strategies failed — ${errors.join("; ")}`);
}

// ─── Per-pin video extraction (HTML scrape) ──────────────────────────────────

async function tryPinterestPinApi(pinId: string): Promise<string | null> {
  try {
    const apiUrl =
      `https://www.pinterest.com/resource/PinResource/get/` +
      `?source_url=/pin/${pinId}/` +
      `&data=${encodeURIComponent(JSON.stringify({ options: { id: pinId } }))}` +
      `&_=${Date.now()}`;
    const res = await fetch(apiUrl, {
      headers: {
        "User-Agent": UA,
        "X-Requested-With": "XMLHttpRequest",
        Accept: "application/json, text/javascript, */*; q=0.01",
        Referer: `https://www.pinterest.com/pin/${pinId}/`,
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const videoList = data?.resource_response?.data?.videos?.video_list as
      | Record<string, { url?: string }>
      | undefined;
    if (!videoList) return null;
    for (const quality of ["V_1080P", "V_720P", "V_480P", "V_360P", "V_HLSV4", "V_HLSV3"]) {
      const entry = videoList[quality];
      if (entry?.url && !entry.url.includes(".m3u8")) return entry.url;
    }
    return null;
  } catch {
    return null;
  }
}

/** Scrape a single pin's HTML for video/image/title/category. */
export async function extractPinMedia(pinUrl: string): Promise<PinMedia> {
  const res = await fetch(pinUrl, {
    headers: {
      "User-Agent": UA,
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
  const unescaped = html.replace(/\\u002F/g, "/").replace(/\\u0026/g, "&");

  let videoUrl: string | null =
    html.match(/<meta[^>]+property="og:video:secure_url"[^>]+content="([^"]+)"/i)?.[1] ??
    html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:video:secure_url"/i)?.[1] ??
    html.match(/<meta[^>]+property="og:video"[^>]+content="([^"]+)"/i)?.[1] ??
    html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:video"/i)?.[1] ??
    unescaped.match(/https?:\/\/v\.pinimg\.com\/videos\/[^\s"'>]+\.mp4/)?.[0] ??
    html.match(/https?:\/\/v\.pinimg\.com\/videos\/[^\s"'>]+\.mp4/)?.[0] ??
    null;

  if (!videoUrl) {
    for (const quality of ["V_1080P", "V_720P", "V_480P", "V_360P"]) {
      const m = unescaped.match(
        new RegExp(`"${quality}"\\s*:\\s*\\{[^}]*?"url"\\s*:\\s*"(https://v\\.pinimg\\.com[^"]+\\.mp4[^"]*)"`)
      );
      if (m?.[1]) { videoUrl = m[1]; break; }
    }
  }

  if (!videoUrl) {
    const pinId = pinUrl.match(/\/pin\/(\d+)/)?.[1];
    if (pinId) videoUrl = await tryPinterestPinApi(pinId);
  }

  // Pinterest "duplo-hls-video" pins serve only HLS — capture the m3u8 URL.
  const hlsUrl =
    unescaped.match(/https?:\/\/v\.pinimg\.com\/videos\/[^\s"'>]+\.m3u8[^"'\s>]*/)?.[0] ??
    html.match(/https?:\/\/v\.pinimg\.com\/videos\/[^\s"'>]+\.m3u8[^"'\s>]*/)?.[0] ??
    null;

  const imageUrl =
    html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)?.[1] ??
    html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:image"/i)?.[1] ??
    null;

  const rawTitle =
    html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)?.[1] ??
    html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:title"/i)?.[1] ??
    html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ??
    "Pinterest Wallpaper";

  const title = rawTitle
    .replace(/\s*[|\-–]\s*Pinterest\s*$/i, "")
    .replace(/\s+on\s+Pinterest\s*$/i, "")
    .trim() || "Pinterest Wallpaper";

  let category = "Anime Wallpaper";
  const jsonMatch = html.match(/<script[^>]+id="__PWS_DATA__"[^>]*>(\{[\s\S]*?\})<\/script>/i);
  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[1]);
      const pinsObj =
        data?.props?.initialReduxState?.pins ??
        data?.initialReduxState?.pins ??
        data?.resourceResponses?.[0]?.response?.data?.board ??
        {};
      const firstPin = Object.values(pinsObj)[0] as { board?: { name?: string; section_display_name?: string } } | undefined;
      const boardName =
        firstPin?.board?.name ??
        firstPin?.board?.section_display_name ??
        (data?.props?.pageProps?.board as { name?: string } | undefined)?.name;
      if (boardName) category = boardName;
    } catch { /* ignore */ }
  }
  if (category === "Anime Wallpaper") {
    const m = pinUrl.match(/pinterest\.[a-z.]+\/[^/]+\/([^/]+)\//);
    if (m?.[1] && m[1] !== "pin") {
      category = m[1].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    }
  }

  return { videoUrl, hlsUrl, imageUrl, title, category };
}

// ─── Headless fallback (Playwright) ──────────────────────────────────────────

/**
 * Pull the highest-quality MP4 out of a video_list object as written by
 * Pinterest's API. Returns null for HLS-only streams.
 */
function pickMp4FromVideoList(videoList: unknown): string | null {
  if (!videoList || typeof videoList !== "object") return null;
  const list = videoList as Record<string, { url?: string }>;
  for (const quality of ["V_1080P", "V_720P", "V_480P", "V_360P"]) {
    const entry = list[quality];
    if (entry?.url && /\.mp4(\?|$)/i.test(entry.url)) return entry.url;
  }
  return null;
}

/**
 * Walk an arbitrary JSON tree looking for a Pinterest `video_list` object.
 * Pinterest embeds these inside __PWS_DATA__ for video pins.
 */
function findMp4InTree(root: unknown): string | null {
  const stack: unknown[] = [root];
  while (stack.length) {
    const node = stack.pop();
    if (!node || typeof node !== "object") continue;
    if (Array.isArray(node)) { stack.push(...node); continue; }
    const o = node as Record<string, unknown>;
    if (o.video_list) {
      const url = pickMp4FromVideoList(o.video_list);
      if (url) return url;
    }
    for (const v of Object.values(o)) stack.push(v);
  }
  return null;
}

/**
 * When the lightweight HTML/API scrape returns no video, launch a real
 * Chromium and (a) watch its network for any pinimg .mp4 the page loads,
 * (b) read the rendered <video> element's src, (c) walk the page's
 * embedded JSON for video_list. First match wins.
 *
 * Playwright is dynamically imported so the rest of the code path doesn't
 * load it. Returns null if Playwright isn't installed.
 */
export async function extractWithHeadless(pinUrl: string): Promise<PinMedia | null> {
  let chromium: typeof import("playwright").chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    return null;
  }

  let browser: import("playwright").Browser | null = null;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-blink-features=AutomationControlled"],
    });
    const ctx = await browser.newContext({
      userAgent: UA,
      viewport: { width: 1280, height: 1800 },
      locale: "en-US",
      // Pinterest serves a different DOM to mobile sometimes — desktop UA is fine
      extraHTTPHeaders: { "Accept-Language": "en-US,en;q=0.9" },
    });
    const page = await ctx.newPage();

    // Track every pinimg video URL the page touches.
    const networkMp4s: string[] = [];
    const networkM3u8s: string[] = []; // master + variant playlists
    page.on("response", (resp) => {
      const url = resp.url();
      if (/v\.pinimg\.com\/videos\//i.test(url)) {
        if (/\.mp4(\?|$)/i.test(url)) networkMp4s.push(url);
        if (/\.m3u8(\?|$)/i.test(url)) networkM3u8s.push(url);
      }
    });

    await page.goto(pinUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });

    // Wait for any video element to appear (Pinterest lazy-loads players).
    // No selector match within timeout is OK — image-only pins won't have one.
    await page.waitForSelector("video", { timeout: 8_000 }).catch(() => {});

    // Force the player to load: scroll into view + try to play. Muted autoplay
    // is allowed in headless Chromium, so this should make Pinterest fetch the
    // MP4 from v.pinimg.com.
    await page.evaluate(() => {
      const v = document.querySelector("video") as HTMLVideoElement | null;
      if (!v) return;
      v.muted = true;
      v.scrollIntoView({ block: "center" });
      v.play().catch(() => {});
    }).catch(() => {});

    // Give the network a moment to actually request the MP4.
    await page.waitForTimeout(3500);

    // Try to read the <video src> the player ended up using.
    const domVideoSrc = await page.evaluate(() => {
      const v = document.querySelector("video") as HTMLVideoElement | null;
      if (!v) return null;
      // currentSrc is what the browser actually loaded; src may be lazy
      return v.currentSrc || v.src || v.querySelector("source")?.getAttribute("src") || null;
    }).catch(() => null);

    // Last resort: walk every embedded JSON blob for a video_list with MP4 URLs.
    let jsonMp4: string | null = null;
    try {
      const html = await page.content();
      const blobs = html.matchAll(
        /<script[^>]*(?:id="__PWS_DATA__"|type="application\/json")[^>]*>([\s\S]*?)<\/script>/gi
      );
      for (const m of blobs) {
        try {
          const data = JSON.parse(m[1].trim());
          const url = findMp4InTree(data);
          if (url) { jsonMp4 = url; break; }
        } catch { /* skip malformed */ }
      }
    } catch { /* ignore */ }

    const meta = await page.evaluate(() => {
      const get = (sel: string) => document.querySelector(sel)?.getAttribute("content") ?? null;
      return {
        ogVideo: get('meta[property="og:video"]'),
        ogVideoSecure: get('meta[property="og:video:secure_url"]'),
        ogImage: get('meta[property="og:image"]'),
        ogTitle: get('meta[property="og:title"]'),
      };
    }).catch(() => ({ ogVideo: null, ogVideoSecure: null, ogImage: null, ogTitle: null }));

    // Pick the best MP4 candidate, skipping HLS.
    const mp4Candidates = [
      networkMp4s[0],
      domVideoSrc && /\.mp4(\?|$)/i.test(domVideoSrc) ? domVideoSrc : null,
      jsonMp4,
      meta.ogVideoSecure && /\.mp4(\?|$)/i.test(meta.ogVideoSecure) ? meta.ogVideoSecure : null,
      meta.ogVideo && /\.mp4(\?|$)/i.test(meta.ogVideo) ? meta.ogVideo : null,
    ].filter((u): u is string => typeof u === "string" && u.length > 0);

    // Prefer the master playlist (no resolution in path) if multiple m3u8s show up.
    const hlsCandidates = networkM3u8s.sort((a, b) => {
      const isMaster = (u: string) => /master\.m3u8|hls\.m3u8/i.test(u);
      return (isMaster(b) ? 1 : 0) - (isMaster(a) ? 1 : 0);
    });

    return {
      videoUrl: mp4Candidates[0] ?? null,
      hlsUrl: hlsCandidates[0] ?? null,
      imageUrl: meta.ogImage,
      title: (meta.ogTitle ?? "Pinterest Wallpaper").replace(/\s+on\s+Pinterest\s*$/i, "").trim(),
      category: "Anime Wallpaper",
    };
  } catch {
    return null;
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

// ─── HLS download via ffmpeg ─────────────────────────────────────────────────

/**
 * Download a Pinterest HLS stream and remux it into a playable MP4.
 * Uses `ffmpeg -c copy` (no re-encoding) so it's fast — usually a few seconds
 * for a 30-second wallpaper clip.
 *
 * Throws "ffmpeg not found" if the binary isn't on PATH (caller can fall back
 * to the pin's static thumbnail then).
 */
export async function downloadHlsToMp4(hlsUrl: string): Promise<{ url: string }> {
  const { spawn } = await import("node:child_process");
  const { promises: fs } = await import("node:fs");
  const path = await import("node:path");
  const os = await import("node:os");

  const tmpFile = path.join(os.tmpdir(), `pin-${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`);

  await new Promise<void>((resolve, reject) => {
    const ff = spawn("ffmpeg", [
      "-loglevel", "error",
      "-headers", `Referer: https://www.pinterest.com/\r\nUser-Agent: ${UA}\r\n`,
      "-i", hlsUrl,
      "-c", "copy",
      "-bsf:a", "aac_adtstoasc",
      "-movflags", "+faststart",
      "-y",
      tmpFile,
    ], { stdio: ["ignore", "ignore", "pipe"] });

    let stderr = "";
    ff.stderr?.on("data", (b) => { stderr += b.toString(); });

    ff.on("error", (err) => {
      const msg = (err as NodeJS.ErrnoException).code === "ENOENT"
        ? "ffmpeg not found — install with `apt-get install -y ffmpeg`"
        : err.message;
      reject(new Error(msg));
    });
    ff.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(0, 300)}`));
    });
  });

  try {
    const buffer = await fs.readFile(tmpFile);
    if (buffer.byteLength > PINTEREST_MAX_BYTES) {
      throw new Error("Remuxed video too large (max 100 MB)");
    }
    const { url } = await saveBuffer({ buffer, folder: "pinterest", ext: "mp4" });
    return { url };
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
}

// ─── Download → local storage ────────────────────────────────────────────────

export async function downloadPinMedia(
  mediaUrl: string,
  isVideo: boolean
): Promise<{ url: string; actualType: "IMAGE" | "VIDEO" }> {
  const res = await fetch(mediaUrl, {
    headers: {
      "User-Agent": UA,
      "Referer": "https://www.pinterest.com/",
      "Accept": isVideo ? "video/mp4,video/*;q=0.9,*/*;q=0.8" : "image/webp,image/*,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);

  const contentType = res.headers.get("content-type") ?? (isVideo ? "video/mp4" : "image/jpeg");
  const actuallyVideo = isVideo && !contentType.startsWith("image/");
  const actualType: "IMAGE" | "VIDEO" = actuallyVideo ? "VIDEO" : "IMAGE";

  const lengthHeader = res.headers.get("content-length");
  if (lengthHeader && parseInt(lengthHeader) > PINTEREST_MAX_BYTES) {
    throw new Error("File too large (max 100 MB)");
  }

  const buffer = await res.arrayBuffer();
  if (buffer.byteLength > PINTEREST_MAX_BYTES) throw new Error("File too large (max 100 MB)");

  const ext = actuallyVideo
    ? "mp4"
    : (contentType.split("/")[1]?.split(";")[0]?.replace("jpeg", "jpg") ?? "jpg");

  const { url } = await saveBuffer({
    buffer: Buffer.from(buffer),
    folder: "pinterest",
    ext,
  });

  return { url, actualType };
}
