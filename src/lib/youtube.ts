/**
 * YouTube video resolution for AI-generated posts.
 *
 * The AI is never allowed to emit a video ID — language models happily invent
 * plausible-looking 11-character IDs, and those ship as dead embeds. The model
 * produces a SEARCH QUERY; this module turns that into a real, verified video.
 *
 * Every candidate is confirmed through the public oEmbed endpoint before use, so
 * a private/deleted/region-blocked video is dropped rather than embedded.
 */

export interface YoutubeVideo {
  id: string;
  url: string;
  title: string;
  author: string;
  thumbnail: string;
}

const ID_RE = /^[A-Za-z0-9_-]{11}$/;

/**
 * Confirm a video exists and is embeddable, and pick up its real title/author
 * for free. oEmbed returns 401/403/404 for private, deleted and
 * embedding-disabled videos — exactly the ones that would render as a black box.
 */
export async function verifyVideo(id: string): Promise<YoutubeVideo | null> {
  if (!ID_RE.test(id)) return null;

  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`,
      { headers: { "User-Agent": "MugenAnime-Bot/1.0" }, signal: AbortSignal.timeout(10_000) },
    );
    if (!res.ok) return null;

    const d = (await res.json()) as { title?: string; author_name?: string };
    return {
      id,
      url: `https://www.youtube.com/watch?v=${id}`,
      title: d.title ?? "",
      author: d.author_name ?? "",
      thumbnail: await bestThumbnail(id),
    };
  } catch {
    return null;
  }
}

/**
 * Highest-resolution thumbnail that actually exists for this video.
 *
 * `hqdefault` is guaranteed but only 480×360, which looks soft stretched across
 * a desktop post header. The larger sizes are generated per-video and 404 on
 * plenty of them — notably older uploads and anything never published in HD —
 * so each candidate is probed rather than assumed.
 */
export async function bestThumbnail(id: string): Promise<string> {
  const candidates = ["maxresdefault", "sddefault", "hqdefault"];

  for (const name of candidates.slice(0, -1)) {
    const url = `https://i.ytimg.com/vi/${id}/${name}.jpg`;
    try {
      const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(8_000) });
      // YouTube serves a 120×90 grey placeholder instead of 404 in some cases;
      // a real image at these sizes is always comfortably larger than that.
      const length = Number(res.headers.get("content-length") ?? 0);
      if (res.ok && length > 3000) return url;
    } catch {
      // Fall through to the next candidate.
    }
  }

  // Always exists.
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

/** Official Data API — used only when a key is configured. 100 quota units/search. */
async function searchViaApi(query: string, apiKey: string): Promise<string[]> {
  try {
    const url =
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video` +
      `&videoEmbeddable=true&maxResults=5&q=${encodeURIComponent(query)}&key=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
    if (!res.ok) return [];

    const d = (await res.json()) as { items?: Array<{ id?: { videoId?: string } }> };
    return (d.items ?? []).map((i) => i.id?.videoId).filter((v): v is string => !!v);
  } catch {
    return [];
  }
}

/**
 * Keyless fallback: read video IDs out of the search results page.
 *
 * Verified working from the production VPS, but it depends on YouTube's markup
 * and can break without warning — which is fine, because every ID it returns is
 * still validated through oEmbed and the caller treats "no video" as normal.
 */
async function searchViaScrape(query: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%253D%253D`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!res.ok) return [];

    const html = await res.text();
    const ids: string[] = [];
    const re = /"videoId":"([A-Za-z0-9_-]{11})"/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null && ids.length < 40) {
      if (!ids.includes(m[1])) ids.push(m[1]);
    }
    return ids;
  } catch {
    return [];
  }
}

/**
 * Resolve a natural-language query to a verified, embeddable video.
 * Returns null when nothing checks out — callers must render the post without
 * an embed rather than guessing.
 */
export async function findVideo(query: string): Promise<YoutubeVideo | null> {
  const q = query.trim();
  if (!q) return null;

  const apiKey = process.env.YOUTUBE_API_KEY;
  const candidates = apiKey ? await searchViaApi(q, apiKey) : [];
  if (!candidates.length) candidates.push(...(await searchViaScrape(q)));

  // Check the top few in order; the first that verifies wins.
  for (const id of candidates.slice(0, 5)) {
    const video = await verifyVideo(id);
    if (video) return video;
  }
  return null;
}

/** Escape user/AI-supplied text before it goes into an HTML attribute. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Responsive 16:9 embed. Uses youtube-nocookie and lazy loading so an embed
 * near the bottom of an article doesn't cost the reader anything up front.
 */
export function embedHtml(video: YoutubeVideo, heading = "Watch"): string {
  return [
    `<h2>${esc(heading)}</h2>`,
    `<div style="position:relative;width:100%;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:12px;margin:1.5rem 0;">`,
    `<iframe src="https://www.youtube-nocookie.com/embed/${video.id}" title="${esc(video.title || "YouTube video")}"`,
    ` style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" loading="lazy" allowfullscreen`,
    ` allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"></iframe>`,
    `</div>`,
    video.author
      ? `<p><em>Video: <a href="${video.url}" target="_blank" rel="noopener noreferrer">${esc(video.title)}</a> — ${esc(video.author)}</em></p>`
      : "",
  ].join("");
}
