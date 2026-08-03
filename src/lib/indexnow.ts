/**
 * IndexNow submission — tells Bing/Yandex/Seznam about a URL the moment it's
 * published instead of waiting for the next organic crawl.
 *
 * Worth having specifically because of the daily publishing cadence: a post that
 * isn't indexed for a week has already lost most of its news value. Google
 * doesn't consume IndexNow (and retired its sitemap ping in 2023), so it still
 * discovers posts via the sitemap — this just accelerates the engines that do.
 *
 * Verification needs the key served as plain text somewhere on the host. The
 * spec allows any path via `keyLocation`, so it's served at a FIXED
 * /indexnow.txt rather than the conventional /<key>.txt — a root-level dynamic
 * route would shadow every other top-level path on the site.
 */

const ENDPOINT = "https://api.indexnow.org/indexnow";

/** The shared secret proving we control the host. Served at /indexnow.txt. */
export function indexNowKey(): string | null {
  const key = process.env.INDEXNOW_KEY?.trim();
  // The spec requires 8-128 hex-ish chars; reject anything that would 422.
  return key && /^[a-zA-Z0-9-]{8,128}$/.test(key) ? key : null;
}

/**
 * Fire-and-forget submission. Never throws — an SEO ping must not be able to
 * fail a publish.
 */
export async function submitUrls(urls: string[]): Promise<{ ok: boolean; status?: number; reason?: string }> {
  const key = indexNowKey();
  if (!key) return { ok: false, reason: "INDEXNOW_KEY not configured" };

  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (!site) return { ok: false, reason: "NEXT_PUBLIC_SITE_URL not set" };

  const host = new URL(site).host;
  // Submitting a URL on a different host than the key file is an automatic
  // rejection, so filter rather than let the whole batch 422.
  const valid = urls.filter((u) => {
    try { return new URL(u).host === host; } catch { return false; }
  });
  if (!valid.length) return { ok: false, reason: "no valid URLs for this host" };

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({
        host,
        key,
        keyLocation: `${site}/indexnow.txt`,
        urlList: valid,
      }),
    });
    // 200 = accepted, 202 = accepted pending key validation.
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "request failed" };
  }
}

/** Convenience wrapper for a single freshly-published post. */
export async function submitPost(slug: string): Promise<void> {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (!site) return;
  await submitUrls([`${site}/news/${slug}`]).catch(() => {});
}
