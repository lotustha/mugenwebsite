// Absolute-URL helpers for media stored under /uploads/.
//
// Why this exists: Wallpapers/posts/messages all carry media URLs that the
// mobile app loads directly. The mobile app has no implicit base URL, so a
// path like "/uploads/foo.mp4" can't be fetched. We always rewrite at API
// response time (DB stays portable, host can be changed without a migration).
//
// We also clean up rows that may have been written with the wrong host
// baked in (e.g. http://localhost:3000/uploads/...) — those get rewritten
// to the configured public host too.

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
  // Social surface media fields (consumed directly by the mobile app)
  "mediaUrl",
  "posterUrl",
  "avatar",
]);

/** Hosts that are obviously not the public origin and should be rewritten if they show up in a stored URL. */
const BAD_HOST_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:\d+)?(?=\/)/i;

/** Public-facing site origin, no trailing slash. */
export function siteBaseUrl(): string {
  const candidate =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";
  return candidate.replace(/\/+$/, "");
}

/**
 * Rewrite a single URL string:
 *   - "/uploads/foo.jpg"                      → SITE/uploads/foo.jpg
 *   - "http://localhost:3000/uploads/foo.jpg" → SITE/uploads/foo.jpg
 *   - anything else                           → unchanged
 */
export function absolutizeUrl(url: string | null | undefined): string | null | undefined {
  if (!url) return url;
  if (url.startsWith("/uploads/")) return `${siteBaseUrl()}${url}`;
  // Strip a wrong host prefix from previously-stored absolute URLs and re-prepend the right one.
  const stripped = url.replace(BAD_HOST_PATTERN, "");
  if (stripped !== url && stripped.startsWith("/uploads/")) {
    return `${siteBaseUrl()}${stripped}`;
  }
  return url;
}

/**
 * True only for `{}` literals / Object.create(null). Crucially false for
 * Date, Buffer, Map, Set, RegExp, etc. — recursing into a Date drops the
 * timestamp because a Date has no own enumerable keys, leaving "{}" in
 * its place which then breaks JSON.stringify's normal Date serialization.
 */
function isPlainObject(v: unknown): v is Record<string, unknown> {
  if (v == null || typeof v !== "object") return false;
  const proto = Object.getPrototypeOf(v);
  return proto === null || proto === Object.prototype;
}

/**
 * Walk an object/array tree and rewrite known media URL fields. Non-matching
 * fields and external URLs are left alone. Used by mobile API routes right
 * before returning JSON.
 */
export function absolutizeMediaUrls<T>(input: T): T {
  if (Array.isArray(input)) {
    return input.map((item) => absolutizeMediaUrls(item)) as unknown as T;
  }
  if (!isPlainObject(input)) return input;

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (URL_FIELDS.has(k) && typeof v === "string") {
      out[k] = absolutizeUrl(v);
    } else if (Array.isArray(v) || isPlainObject(v)) {
      out[k] = absolutizeMediaUrls(v);
    } else {
      // Date, Buffer, primitives, null, undefined — pass through untouched
      out[k] = v;
    }
  }
  return out as T;
}
