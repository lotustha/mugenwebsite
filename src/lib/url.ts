// Absolute-URL helpers shared by storage saves and API responses.
//
// Why this exists: Wallpapers/posts/messages all carry media URLs that the
// mobile app loads directly. Relative paths like "/uploads/foo.mp4" work in a
// browser (resolve to current origin) but fail in a Flutter/native app, which
// has no implicit base URL. So:
//   - storage.saveBuffer() returns absolute URLs going forward
//   - API responses run absolutizeMediaUrls() to fix any older relative rows
//
// Tweak the env var (NEXT_PUBLIC_SITE_URL) to switch domains; nothing in the
// DB needs to change because absolutization happens at request time.

const URL_FIELDS = new Set([
  "fileUrl",
  "imageUrl",
  "featuredImage",
  "ogImageUrl",
  "iconUrl",
  "bannerUrl",
  "videoUrl",
  "thumbnailUrl",
  "url",
]);

/** Public-facing site origin, no trailing slash. */
export function siteBaseUrl(): string {
  const candidate =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";
  return candidate.replace(/\/+$/, "");
}

/** If `url` is a relative /uploads path, prepend the site origin. Otherwise return unchanged. */
export function absolutizeUrl(url: string | null | undefined): string | null | undefined {
  if (!url) return url;
  if (url.startsWith("/uploads/")) return `${siteBaseUrl()}${url}`;
  return url;
}

/**
 * Walk an object/array tree and rewrite known media URL fields. Non-matching
 * fields and external URLs (https://…) are left alone. Used by mobile API
 * routes right before returning JSON.
 */
export function absolutizeMediaUrls<T>(input: T): T {
  if (input == null || typeof input !== "object") return input;
  if (Array.isArray(input)) {
    return input.map((item) => absolutizeMediaUrls(item)) as unknown as T;
  }
  // Plain objects: shallow-clone with rewrites; recurse into nested objects/arrays.
  const obj = input as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (URL_FIELDS.has(k) && typeof v === "string") {
      out[k] = absolutizeUrl(v);
    } else if (v && typeof v === "object") {
      out[k] = absolutizeMediaUrls(v);
    } else {
      out[k] = v;
    }
  }
  return out as T;
}
