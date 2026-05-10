// Pure-JS clone of src/lib/url.ts absolutizeMediaUrls — kept here so the
// behaviour can be sanity-checked without a TS toolchain. If logic in url.ts
// changes, mirror it here and re-run.
//
//   node scripts/test-url-helper.mjs

const URL_FIELDS = new Set([
  "fileUrl", "imageUrl", "featuredImage", "ogImageUrl",
  "iconUrl", "bannerUrl", "videoUrl", "thumbnailUrl", "url",
]);

function siteBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000"
  ).replace(/\/+$/, "");
}

const BAD_HOST_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:\d+)?(?=\/)/i;

function absolutizeUrl(url) {
  if (!url) return url;
  if (url.startsWith("/uploads/")) return `${siteBaseUrl()}${url}`;
  const stripped = url.replace(BAD_HOST_PATTERN, "");
  if (stripped !== url && stripped.startsWith("/uploads/")) {
    return `${siteBaseUrl()}${stripped}`;
  }
  return url;
}

function absolutizeMediaUrls(input) {
  if (input == null || typeof input !== "object") return input;
  if (Array.isArray(input)) return input.map(absolutizeMediaUrls);
  const out = {};
  for (const [k, v] of Object.entries(input)) {
    if (URL_FIELDS.has(k) && typeof v === "string") out[k] = absolutizeUrl(v);
    else if (v && typeof v === "object") out[k] = absolutizeMediaUrls(v);
    else out[k] = v;
  }
  return out;
}

// ─── Test cases ──────────────────────────────────────────────────────────────
process.env.NEXT_PUBLIC_SITE_URL = "https://mugenstream.fun";

const cases = [
  {
    name: "wallpaper with relative fileUrl",
    in:  { id: "1", title: "Naruto", fileUrl: "/uploads/pinterest/abc.mp4", type: "VIDEO" },
    expect: { fileUrl: "https://mugenstream.fun/uploads/pinterest/abc.mp4" },
  },
  {
    name: "wallpaper with already-absolute fileUrl (untouched)",
    in:  { id: "2", fileUrl: "https://example.com/foo.jpg" },
    expect: { fileUrl: "https://example.com/foo.jpg" },
  },
  {
    name: "post with featuredImage",
    in:  { id: "3", title: "Post", featuredImage: "/uploads/rss/x.jpg" },
    expect: { featuredImage: "https://mugenstream.fun/uploads/rss/x.jpg" },
  },
  {
    name: "array of wallpapers",
    in:  [{ fileUrl: "/uploads/a.jpg" }, { fileUrl: "/uploads/b.mp4" }],
    expect: [{ fileUrl: "https://mugenstream.fun/uploads/a.jpg" }, { fileUrl: "https://mugenstream.fun/uploads/b.mp4" }],
  },
  {
    name: "paginated payload (nested array)",
    in:  { wallpapers: [{ fileUrl: "/uploads/a.jpg" }], total: 1 },
    expect: { wallpapers: [{ fileUrl: "https://mugenstream.fun/uploads/a.jpg" }], total: 1 },
  },
  {
    name: "nested categories left alone (no URL fields)",
    in:  { fileUrl: "/uploads/x.jpg", categories: [{ id: "c1", name: "Anime", slug: "anime" }] },
    expect: {
      fileUrl: "https://mugenstream.fun/uploads/x.jpg",
      categories: [{ id: "c1", name: "Anime", slug: "anime" }],
    },
  },
  {
    name: "external URL not starting with /uploads/ left alone",
    in:  { iconUrl: "https://cdn.example.com/icon.png" },
    expect: { iconUrl: "https://cdn.example.com/icon.png" },
  },
  {
    name: "localhost-prefixed URL is rewritten to public host",
    in:  { fileUrl: "http://localhost:3000/uploads/pinterest/abc.mp4" },
    expect: { fileUrl: "https://mugenstream.fun/uploads/pinterest/abc.mp4" },
  },
  {
    name: "127.0.0.1-prefixed URL is rewritten too",
    in:  { fileUrl: "http://127.0.0.1:3000/uploads/foo.jpg" },
    expect: { fileUrl: "https://mugenstream.fun/uploads/foo.jpg" },
  },
  {
    name: "localhost URL NOT pointing at /uploads/ is left alone",
    in:  { iconUrl: "http://localhost:3000/api/something" },
    expect: { iconUrl: "http://localhost:3000/api/something" },
  },
  {
    name: "null fileUrl preserved",
    in:  { id: "5", fileUrl: null },
    expect: { fileUrl: null },
  },
];

let pass = 0, fail = 0;
for (const c of cases) {
  const out = absolutizeMediaUrls(c.in);
  const flat = JSON.stringify(out);
  const ok = Object.entries(c.expect).every(([k, v]) => {
    if (Array.isArray(v)) {
      return JSON.stringify(out[k]) === JSON.stringify(v);
    }
    if (v && typeof v === "object") {
      return JSON.stringify(out[k]) === JSON.stringify(v);
    }
    return out[k] === v;
  });
  if (ok) {
    pass++;
    console.log(`✓ ${c.name}`);
  } else {
    fail++;
    console.log(`✗ ${c.name}`);
    console.log(`    expected: ${JSON.stringify(c.expect)}`);
    console.log(`    actual:   ${flat}`);
  }
}

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
