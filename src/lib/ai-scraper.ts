/**
 * AI-driven web scraper for sites without good RSS.
 *
 * Pipeline:
 *   1. Fetch homepage HTML.
 *   2. Compact (strip scripts/styles/inline media) for AI token budget.
 *   3. Ask AI to extract the latest N article URLs + titles.
 *   4. For each article: fetch HTML, compact, ask AI to extract title/summary/body/image.
 *   5. Return RssItem[] — drops into the existing processItem pipeline unchanged.
 *
 * Designed to be cheap: ~1 AI call per source + 1 per article. With Gemini Flash
 * a typical 3-article scrape costs <$0.01.
 */
import type { RssItem } from "./rss-processor";
import { callAi, type AiSettings } from "./rss-processor";

// ─── HTML compaction ──────────────────────────────────────────────────────────

/** Strip scripts/styles/svg/comments, collapse whitespace, cap length. */
function compactHtml(html: string, maxChars: number): string {
  let s = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (s.length > maxChars) s = s.slice(0, maxChars);
  return s;
}

// ─── Fetch + JSON parse helpers ──────────────────────────────────────────────

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; MugenAnime-Bot/1.0; +https://mugenstream.fun)",
      Accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.text();
}

function parseAiJson<T>(raw: string): T | null {
  if (!raw?.trim()) return null;
  let toParse = raw.trim();
  const fenced = toParse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenced) toParse = fenced[1].trim();
  const match = toParse.match(/[{\[][\s\S]*[}\]]/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}

function absolutize(url: string, base: string): string {
  try {
    return new URL(url, base).toString();
  } catch {
    return url;
  }
}

// ─── Prompts ──────────────────────────────────────────────────────────────────

const LIST_PROMPT = (siteUrl: string, n: number, html: string) => `
You are extracting the latest news article links from an anime news website homepage.

Site: ${siteUrl}
Return ONLY valid JSON (no markdown, no commentary):
{"articles":[{"url":"absolute or root-relative URL","title":"plain-text title"}]}

Rules:
- Return at most ${n} items, newest first if order is detectable.
- Only INDIVIDUAL ARTICLE pages. Skip: navigation, category listings, tags, author pages, "about", "contact", login, search, video players without article text.
- Prefer URLs that look like /news/<slug> or /YYYY/MM/<slug>.
- Title must be the human-readable article title, not generic ("Read more", "Latest").

HTML (compacted):
${html}
`.trim();

const EXTRACT_PROMPT = (articleUrl: string, html: string) => `
You are extracting an anime news article from an HTML page. The page may have ads,
nav menus, sidebars, related-post widgets — ignore those.

Article URL: ${articleUrl}
Return ONLY valid JSON:
{
  "title": "The article's actual headline (plain text)",
  "summary": "1-3 sentence factual summary",
  "content": "The full article body as clean readable prose. Plain text, no HTML tags. 200-1500 words. Skip captions, related links, share buttons.",
  "imageUrl": "Absolute URL of the main hero/featured image (or empty string if none found)",
  "pubDate": "Publish date as ISO 8601 or empty string"
}

HTML (compacted):
${html}
`.trim();

// ─── Types ────────────────────────────────────────────────────────────────────

interface ListedArticle {
  url: string;
  title: string;
}
interface ExtractedArticle {
  title: string;
  summary: string;
  content: string;
  imageUrl: string;
  pubDate: string;
}

export interface ScrapeFeed {
  url: string;        // homepage / news index URL
  maxItems: number;   // how many latest articles to ingest per run
}

// ─── Main entry ───────────────────────────────────────────────────────────────

export async function scrapeWithAi(
  feed: ScrapeFeed,
  ai: AiSettings,
): Promise<RssItem[]> {
  // 1. Fetch + compact homepage
  let homepage: string;
  try {
    homepage = await fetchHtml(feed.url);
  } catch (e) {
    throw new Error(`Homepage fetch failed: ${e instanceof Error ? e.message : String(e)}`);
  }
  const homepageCompact = compactHtml(homepage, 14_000);

  // 2. AI: extract article URLs
  let listed: ListedArticle[] = [];
  try {
    const raw = await callAi(ai, LIST_PROMPT(feed.url, feed.maxItems, homepageCompact));
    const parsed = parseAiJson<{ articles: ListedArticle[] }>(raw);
    listed = (parsed?.articles ?? []).slice(0, feed.maxItems);
  } catch (e) {
    throw new Error(`AI list extract failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  if (listed.length === 0) return [];

  // 3. For each article: fetch + AI-extract content
  const items: RssItem[] = [];
  for (const a of listed) {
    const absUrl = absolutize(a.url, feed.url);
    try {
      const articleHtml = await fetchHtml(absUrl);
      const articleCompact = compactHtml(articleHtml, 14_000);
      const raw = await callAi(ai, EXTRACT_PROMPT(absUrl, articleCompact));
      const ex = parseAiJson<ExtractedArticle>(raw);
      if (!ex || !ex.content || ex.content.length < 120) continue;

      items.push({
        guid: absUrl,
        title: (ex.title || a.title || "").trim(),
        link: absUrl,
        description: (ex.summary || ex.content.slice(0, 240)).trim(),
        content: ex.content.trim(),
        pubDate: ex.pubDate || new Date().toISOString(),
        imageUrl:
          ex.imageUrl && ex.imageUrl.startsWith("http")
            ? ex.imageUrl
            : undefined,
      });
    } catch {
      // skip individual article failures — keep going for the rest
    }
  }

  return items;
}
