/**
 * RSS Import Processor
 * Called by cron (/api/cron/rss-import) and "Run Now" button
 *
 * For each feed that's due (lastRunAt + scheduleMinutes <= now):
 *   1. Fetch & parse RSS XML
 *   2. Deduplicate against rss_import_logs
 *   3. For each new item:
 *      a. Download images → save to local UPLOAD_DIR via saveBuffer
 *      b. Call AI to humanize, summarise, generate SEO, tags, category
 *      c. Auto-create category if missing
 *      d. Create/upsert tags
 *      e. Create post
 *      f. Write log row
 */

import { prisma } from "@/lib/prisma";
import { saveBuffer } from "@/lib/storage";
import { createPostFromAi } from "@/lib/post-creator";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface RssItem {
  guid: string;
  title: string;
  link: string;
  description: string;
  content: string;
  pubDate: string;
  imageUrl?: string;
  category?: string;
}

interface AiResult {
  title: string;
  slug: string;
  humanizedContent: string;
  summary: string;        // prose summary
  bulletPoints: string[]; // 3-4 bullet lines
  tags: string[];
  category: string;
  seo: {
    metaTitle: string;
    metaDescription: string;
    keywords: string;
  };
}

// ─── HTML image extraction (used for fallback featured-image discovery) ──────
function extractImagesFromHtml(html: string): string[] {
  const urls: string[] = [];
  const re = /<img[^>]+src="([^"]+)"/gi;
  let m;
  while ((m = re.exec(html)) !== null) urls.push(m[1]);
  return [...new Set(urls)];
}

// ─── Image download → local storage ──────────────────────────────────────────
export async function downloadAndStoreImage(imageUrl: string, folder = "rss"): Promise<string | null> {
  try {
    const res = await fetch(imageUrl, {
      headers: { "User-Agent": "MugenAnime-Bot/1.0" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) return null;

    const ext = contentType.split("/")[1]?.split(";")[0] ?? "jpg";
    const arrayBuffer = await res.arrayBuffer();
    if (arrayBuffer.byteLength > 10 * 1024 * 1024) return null; // skip >10MB

    const { url } = await saveBuffer({
      buffer: Buffer.from(arrayBuffer),
      folder,
      ext,
    });
    return url;
  } catch {
    return null;
  }
}

// ─── AI call ─────────────────────────────────────────────────────────────────
export interface AiSettings {
  provider: string;
  apiKey: string;
  model?: string;
}

const AI_PROMPT = (item: RssItem, existingCategories: string[]) => `
You are an anime content writer. Transform the following RSS article into an engaging, humanized blog post.

RSS TITLE: ${item.title}
RSS CONTENT: ${item.content.slice(0, 3000)}
EXISTING SITE CATEGORIES: ${existingCategories.join(", ") || "none yet"}

Return ONLY valid JSON (no markdown, no explanation):
{
  "title": "Engaging, click-worthy rewritten title (keep relevant keywords)",
  "slug": "url-friendly-slug-from-title",
  "humanizedContent": "Full rewritten article in HTML format. 500-800 words. Use <h2> and <h3> tags for subheadings. Use <p>, <strong>, and <ul> where appropriate. Make it engaging, conversational, first-person where appropriate. Add an intro hook. Conclude with a recommendation to use the Mugen Anime app. DO NOT copy-paste the original — rewrite entirely.",
  "summary": "2-3 sentence prose summary suitable for post excerpts",
  "bulletPoints": [
    "• Key insight or takeaway #1",
    "• Key insight or takeaway #2",
    "• Key insight or takeaway #3",
    "• Key insight or takeaway #4"
  ],
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "category": "Best matching category from EXISTING SITE CATEGORIES, or suggest a new one if none fit",
  "seo": {
    "metaTitle": "SEO optimized title under 60 chars",
    "metaDescription": "Compelling meta description 140-160 chars",
    "keywords": "keyword1, keyword2, keyword3, keyword4"
  }
}
`.trim();

/**
 * Gemini free-tier fallback chain, best → cheapest.
 *
 * Verified against the live ListModels response for this project's key: the
 * previously-configured `gemini-1.5-flash` and `gemini-3.1-pro` both 404 (the
 * former withdrawn, the latter only exists as `-preview`). Free-tier quota is
 * per-model, so when the first choice returns 429 the next one usually still has
 * budget — which is what keeps a once-a-day generator running without billing.
 */
const GEMINI_FALLBACKS = [
  "gemini-3.5-flash",
  "gemini-2.5-flash",
  "gemini-flash-latest",
  // Measured: when every model above is quota-exhausted, these still answer —
  // the preview and "lite" tiers draw on separate free-tier pools. Each was
  // checked against a real article prompt and returns complete, parseable JSON
  // (~790-800 words), so falling this far still ships a publishable post.
  "gemini-3-flash-preview",
  "gemini-flash-lite-latest",
  "gemini-3.5-flash-lite",
  "gemini-2.5-flash-lite",
];

export class AiHttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "AiHttpError";
  }

  /**
   * Worth retrying THE SAME model after a short backoff.
   *
   * 5xx ("model is experiencing high demand") clears in seconds. A 429 does not:
   * it's the daily free-tier quota, which resets at midnight Pacific — sleeping
   * six seconds and asking again just burns time and rate limit. So a 429 is not
   * retryable on the same model, but it IS worth moving to the next model, since
   * the preview and lite tiers have separate quota pools.
   */
  get retryableSameModel() {
    return this.status >= 500;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Resilient wrapper around callAiOnce.
 *
 * Without this a single free-tier 429 threw away an entire scheduled run — and
 * on a once-a-day generator that means losing the whole day's post.
 */
export async function callAi(settings: AiSettings, prompt: string): Promise<string> {
  // For Gemini, walk the fallback chain: configured model first (if it isn't
  // already in the list), then progressively cheaper ones.
  const models =
    settings.provider === "gemini"
      ? [...new Set([settings.model, ...GEMINI_FALLBACKS].filter(Boolean) as string[])]
      : [settings.model ?? ""];

  let lastErr: unknown;

  for (const model of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const out = await callAiOnce({ ...settings, model }, prompt);
        if (out?.trim()) return out;
        // Empty body with a 200 — transient; retry the same model.
        lastErr = new Error("AI returned an empty response");
      } catch (e) {
        lastErr = e;
        // Quota exhaustion and bad model names don't improve by waiting. Move
        // straight to the next model — with 7 models in the chain, retrying each
        // one three times would otherwise add over a minute of pure sleeping
        // before reaching the tier that still has quota.
        if (e instanceof AiHttpError && !e.retryableSameModel) break;
      }
      await sleep(1500 * 2 ** attempt); // 1.5s, 3s, 6s
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

export async function callAiOnce(settings: AiSettings, prompt: string): Promise<string> {
  const { provider, apiKey, model } = settings;

  if (provider === "openrouter") {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
        "X-Title": "Mugen Anime Admin",
      },
      body: JSON.stringify({
        model: model || "openai/gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.75,
        max_tokens: 3000,
      }),
    });
    if (!res.ok) throw new AiHttpError(res.status, `OpenRouter: ${res.status} ${(await res.text()).slice(0, 200)}`);
    const d = await res.json();
    return d?.choices?.[0]?.message?.content ?? "";
  }

  if (provider === "gemini") {
    const modelName = model || GEMINI_FALLBACKS[0];

    // Current Gemini models think before answering, and thinking tokens are
    // billed against maxOutputTokens. At the old limit of 3000 a long-article
    // prompt burned the ENTIRE budget on thoughts and came back with
    // finishReason=MAX_TOKENS and an empty text part — verified against the live
    // API. Hence the much higher ceiling plus an explicit thinking cap.
    //
    // The two knobs are not interchangeable: `thinkingLevel` 400s on 2.5-era
    // models ("Thinking level is not supported for this model"), while
    // `thinkingBudget` is the 2.5-era spelling. Pick per family.
    const thinkingConfig = modelName.startsWith("gemini-2.")
      ? { thinkingBudget: 0 }
      : { thinkingLevel: "low" };

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(180_000),
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.75, maxOutputTokens: 16000, thinkingConfig },
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
          ]
        }),
      }
    );
    if (!res.ok) throw new AiHttpError(res.status, `Gemini: ${res.status} ${(await res.text()).slice(0, 200)}`);
    const d = await res.json();
    // Long answers arrive split across several parts — joining them all avoids
    // silently truncating the article to its first chunk.
    const parts = d?.candidates?.[0]?.content?.parts;
    return Array.isArray(parts) ? parts.map((p: { text?: string }) => p?.text ?? "").join("") : "";
  }

  if (provider === "openai") {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model || "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
        temperature: 0.75,
        max_tokens: 3000,
      }),
    });
    if (!res.ok) throw new AiHttpError(res.status, `OpenAI: ${res.status} ${(await res.text()).slice(0, 200)}`);
    const d = await res.json();
    return d?.choices?.[0]?.message?.content ?? "";
  }

  if (provider === "claude") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model || "claude-3-haiku-20240307",
        max_tokens: 3000,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) throw new AiHttpError(res.status, `Claude: ${res.status} ${(await res.text()).slice(0, 200)}`);
    const d = await res.json();
    return d?.content?.[0]?.text ?? "";
  }

  throw new Error(`Unknown AI provider: ${provider}`);
}

// ─── Scrape OG/Twitter image from article URL ────────────────────────────────
async function scrapeArticleOgImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MugenAnime-Bot/1.0; +https://mugenanime.com)",
        "Accept": "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    // 1. og:image (both attribute orderings)
    const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
            ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if (og?.[1] && og[1].startsWith("http")) return og[1];

    // 2. twitter:image
    const tw = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
            ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
    if (tw?.[1] && tw[1].startsWith("http")) return tw[1];

    // 3. First substantial <img> inside article/main body
    const body = html.match(/<(?:article|main)[^>]*>([\s\S]*?)<\/(?:article|main)>/i)?.[1] ?? html;
    const imgs = extractImagesFromHtml(body);
    const good = imgs.find(u =>
      u.startsWith("http") &&
      !/(pixel|1x1|beacon|avatar|logo|icon|sprite|blank|spacer|\.gif)/i.test(u)
    );
    return good ?? null;
  } catch {
    return null;
  }
}

// ─── Process a single RSS item ────────────────────────────────────────────────
async function processItem(
  feedId: string,
  item: RssItem,
  aiSettings: AiSettings,
  autoPublish: boolean,
  authorId: string
): Promise<{ status: "ok" | "error"; postId?: string; error?: string }> {
  // 0. Skip items with no usable content
  if (!item.title && !item.content && !item.description) {
    return { status: "error", error: "Item has no title or content" };
  }
  // Skip items whose combined text is too short for AI to rewrite meaningfully
  // (contest pages, redirect stubs, etc. often have <100 chars after HTML strip)
  const combinedText = `${item.title ?? ""} ${item.content ?? ""} ${item.description ?? ""}`.trim();
  if (combinedText.length < 120) {
    return { status: "error", error: `Item content too short (${combinedText.length} chars) — likely a stub or contest page` };
  }

  // 1. Fetch existing categories for AI context
  const existingCats = await prisma.category.findMany({ select: { id: true, name: true, slug: true } });
  const catNames = existingCats.map((c) => c.name);

  // 2. Call AI — callAi already handles backoff, empty bodies and model fallback
  const prompt = AI_PROMPT(item, catNames);
  let aiRaw: string;
  try {
    aiRaw = await callAi(aiSettings, prompt);
  } catch (e) {
    return { status: "error", error: `AI call failed: ${e instanceof Error ? e.message : String(e)}` };
  }

  // 3. Parse AI JSON
  let ai: AiResult;
  try {
    let toParse = aiRaw.trim();
    if (!toParse) {
      throw new Error("AI returned empty response after retry — item may have too little content");
    }
    // Strip markdown code fences if present
    const fenced = toParse.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    if (fenced) {
      toParse = fenced[1];
    } else {
      const jsonMatch = toParse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error(`No JSON found. AI said: "${toParse.slice(0, 300)}"`);
      }
      toParse = jsonMatch[0];
    }
    ai = JSON.parse(toParse);
  } catch (e) {
    return { status: "error", error: `AI JSON parse failed: ${e instanceof Error ? e.message : String(e)}` };
  }

  // 4. Download & store image — three-level fallback chain
  let featuredImage: string | null = null;

  // Level 1: image embedded in the RSS item XML
  if (item.imageUrl) {
    featuredImage = await downloadAndStoreImage(item.imageUrl);
  }

  // Level 2: scrape og:image / twitter:image from the article URL
  if (!featuredImage && item.link) {
    const scraped = await scrapeArticleOgImage(item.link);
    if (scraped) featuredImage = await downloadAndStoreImage(scraped);
  }

  // Level 3: first <img> found inside AI-rewritten content
  if (!featuredImage && ai.humanizedContent) {
    const contentImgs = extractImagesFromHtml(ai.humanizedContent);
    const good = contentImgs.find(u =>
      u.startsWith("http") &&
      !/(pixel|1x1|beacon|avatar|logo|icon|sprite|blank|spacer|\.gif)/i.test(u)
    );
    if (good) featuredImage = await downloadAndStoreImage(good);
  }

  // 5. Build final content (bullet summary block + humanized article)
  const bulletBlock = Array.isArray(ai.bulletPoints) && ai.bulletPoints.length
    ? `<h2>Quick Summary</h2>\n<ul>\n${ai.bulletPoints.map(bp => `  <li>${bp.replace(/^•\s*/, "")}</li>`).join("\n")}\n</ul>\n<hr />\n\n`
    : "";
  const finalContent = bulletBlock + (ai.humanizedContent ?? item.content);

  // 6. Category / tag / slug resolution, SeoMeta and the push notification all
  //    live in the shared writer, which the AI autopilot uses too.
  const rawTags: string[] = Array.isArray(ai.tags) ? ai.tags.slice(0, 8) : [];
  try {
    const post = await createPostFromAi({
      title: ai.title || item.title,
      slug: ai.slug,
      summary: ai.summary || item.description,
      contentHtml: finalContent,
      category: ai.category || item.category || "Anime News",
      tags: rawTags,
      featuredImage,
      featuredImageAlt: ai.title || item.title,
      seo: {
        metaTitle: ai.seo?.metaTitle,
        metaDescription: ai.seo?.metaDescription,
        keywords: ai.seo?.keywords,
      },
      authorId,
      published: autoPublish,
      source: "rss",
    });
    return { status: "ok", postId: post.id };
  } catch (e) {
    return { status: "error", error: `Post create failed: ${e instanceof Error ? e.message : String(e)}` };
  }
}

// ─── Main processor exported for use in cron + manual trigger ────────────────
export interface ProcessFeedOptions {
  feedId?: string;          // if set, only run this feed; otherwise run all due feeds
  aiSettings: AiSettings;
  force?: boolean;          // ignore lastRunAt check
  invokingUser?: { id: string; email: string }; // The user triggering the run
}

export interface ProcessResult {
  feedId: string;
  feedName: string;
  processed: number;
  created: number;
  skipped: number;
  errors: number;
  details: Array<{ guid: string; status: string; error?: string; postId?: string }>;
}

export async function processFeedsWithAi(opts: ProcessFeedOptions): Promise<ProcessResult[]> {
  // Resolve author — use the invoking user, or first ADMIN, or create a system user
  let author;
  
  if (opts.invokingUser) {
    // If triggered manually by an admin, upsert them to ensure they exist in the public schema
    author = await prisma.user.upsert({
      where: { id: opts.invokingUser.id },
      update: { email: opts.invokingUser.email },
      create: {
        id: opts.invokingUser.id,
        email: opts.invokingUser.email,
        role: "ADMIN",
      }
    });
  } else {
    author = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    if (!author) {
      // try any user
      author = await prisma.user.findFirst();
    }
    
    if (!author) {
      // Auto-create a system bot user for automated cron jobs
      author = await prisma.user.create({
        data: {
          email: "system.bot@mugenanime.local",
          role: "ADMIN"
        }
      });
    }
  }

  const now = new Date();

  // Fetch feed(s)
  const feedQuery = opts.feedId
    ? await prisma.rssFeed.findMany({ where: { id: opts.feedId } })
    : await prisma.rssFeed.findMany({ where: { isActive: true } });

  const results: ProcessResult[] = [];

  for (const feed of feedQuery) {
    // Check schedule
    if (!opts.force && feed.lastRunAt) {
      const nextRun = new Date(feed.lastRunAt.getTime() + feed.scheduleMinutes * 60_000);
      if (nextRun > now) {
        results.push({
          feedId: feed.id,
          feedName: feed.name,
          processed: 0, created: 0, skipped: 0, errors: 0,
          details: [{ guid: "__schedule__", status: "skipped", error: `Next run at ${nextRun.toISOString()}` }],
        });
        continue;
      }
    }

    const result: ProcessResult = {
      feedId: feed.id, feedName: feed.name,
      processed: 0, created: 0, skipped: 0, errors: 0, details: [],
    };

    // Fetch items via AI scraper (RSS path was removed — every feed is now an AI scrape)
    let items: RssItem[] = [];
    try {
      const { scrapeWithAi } = await import("./ai-scraper");
      items = await scrapeWithAi(
        { url: feed.url, maxItems: (feed as { maxItems?: number }).maxItems ?? 3 },
        opts.aiSettings,
      );
    } catch (e) {
      result.errors++;
      result.details.push({ guid: "__fetch__", status: "error", error: String(e) });
      results.push(result);
      continue;
    }

    // Deduplicate
    const existingGuids = await prisma.rssImportLog.findMany({
      where: { feedId: feed.id },
      select: { itemGuid: true },
    });
    const seenGuids = new Set(existingGuids.map((l) => l.itemGuid));

    for (const item of items) {
      result.processed++;
      if (seenGuids.has(item.guid)) {
        result.skipped++;
        result.details.push({ guid: item.guid, status: "skipped" });
        continue;
      }

      const itemResult = await processItem(
        feed.id, item, opts.aiSettings, feed.autoPublish, author.id
      );

      // Log result
      await prisma.rssImportLog.create({
        data: {
          feedId: feed.id,
          itemGuid: item.guid,
          postId: itemResult.postId ?? null,
          status: itemResult.status,
          errorMsg: itemResult.error ?? null,
        },
      }).catch(() => {}); // ignore duplicate errors

      if (itemResult.status === "ok") result.created++;
      else { result.errors++; }
      result.details.push({ guid: item.guid, status: itemResult.status, error: itemResult.error, postId: itemResult.postId });
    }

    // Update lastRunAt
    await prisma.rssFeed.update({ where: { id: feed.id }, data: { lastRunAt: now } });
    results.push(result);
  }

  return results;
}
