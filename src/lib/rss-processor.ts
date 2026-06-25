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
export async function downloadAndStoreImage(imageUrl: string): Promise<string | null> {
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
      folder: "rss",
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

export async function callAi(settings: AiSettings, prompt: string): Promise<string> {
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
    if (!res.ok) throw new Error(`OpenRouter: ${res.status}`);
    const d = await res.json();
    return d?.choices?.[0]?.message?.content ?? "";
  }

  if (provider === "gemini") {
    const modelName = model || "gemini-1.5-flash";
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.75, maxOutputTokens: 3000 },
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
          ]
        }),
      }
    );
    if (!res.ok) throw new Error(`Gemini: ${res.status}`);
    const d = await res.json();
    return d?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
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
    if (!res.ok) throw new Error(`OpenAI: ${res.status}`);
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
    if (!res.ok) throw new Error(`Claude: ${res.status}`);
    const d = await res.json();
    return d?.content?.[0]?.text ?? "";
  }

  throw new Error(`Unknown AI provider: ${provider}`);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
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

  // 2. Call AI — retry once on empty response
  const prompt = AI_PROMPT(item, catNames);
  let aiRaw: string;
  try {
    aiRaw = await callAi(aiSettings, prompt);
    // Retry once if the AI returned an empty body (transient issue)
    if (!aiRaw?.trim()) {
      await new Promise(r => setTimeout(r, 1500));
      aiRaw = await callAi(aiSettings, prompt);
    }
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

  // 5. Ensure category exists (create if needed)
  const categoryName = ai.category || item.category || "Anime News";
  const categorySlug = slugify(categoryName);
  let category = existingCats.find(
    (c) => c.name.toLowerCase() === categoryName.toLowerCase() || c.slug === categorySlug
  );
  if (!category) {
    try {
      category = await prisma.category.create({ data: { name: categoryName, slug: categorySlug } });
    } catch {
      // race condition — try fetching again
      category = await prisma.category.findFirst({ where: { slug: categorySlug } }) ?? existingCats[0];
    }
  }

  // 6. Ensure tags exist
  const tagIds: string[] = [];
  const rawTags: string[] = Array.isArray(ai.tags) ? ai.tags.slice(0, 8) : [];
  for (const tagName of rawTags) {
    const tagSlug = slugify(tagName);
    if (!tagSlug) continue;
    let tag = await prisma.tag.findFirst({ where: { slug: tagSlug } });
    if (!tag) {
      try {
        tag = await prisma.tag.create({ data: { name: tagName, slug: tagSlug } });
      } catch {
        tag = await prisma.tag.findFirst({ where: { slug: tagSlug } });
      }
    }
    if (tag) tagIds.push(tag.id);
  }

  // 7. Build final content (bullet summary block + humanized article)
  const bulletBlock = Array.isArray(ai.bulletPoints) && ai.bulletPoints.length
    ? `<h2>Quick Summary</h2>\n<ul>\n${ai.bulletPoints.map(bp => `  <li>${bp.replace(/^•\s*/, "")}</li>`).join("\n")}\n</ul>\n<hr />\n\n`
    : "";
  const finalContent = bulletBlock + (ai.humanizedContent ?? item.content);

  // 8. Unique slug
  let slug = ai.slug || slugify(ai.title || item.title);
  const existingSlug = await prisma.post.findUnique({ where: { slug } });
  if (existingSlug) slug = `${slug}-${Date.now()}`;

  // 9. Create post
  let post;
  try {
    post = await prisma.post.create({
      data: {
        title: ai.title || item.title,
        slug,
        summary: ai.summary || item.description,
        content: finalContent,
        published: autoPublish,
        featuredImage: featuredImage ?? undefined,
        featuredImageAlt: ai.title || item.title,
        authorId,
        categories: category ? { connect: [{ id: category.id }] } : undefined,
        tags: tagIds.length ? { connect: tagIds.map((id) => ({ id })) } : undefined,
        seoMeta: {
          create: {
            metaTitle: ai.seo?.metaTitle || ai.title || item.title,
            metaDescription: ai.seo?.metaDescription || ai.summary || item.description,
            ogImageUrl: featuredImage || null,
            keywords: ai.seo?.keywords || rawTags.join(", "),
          },
        },
      },
    });
  } catch (e) {
    return { status: "error", error: `Post create failed: ${e instanceof Error ? e.message : String(e)}` };
  }

  // Fire-and-forget push notification (only for auto-published posts)
  if (autoPublish) {
    import("./push-notifications").then(async ({ sendPostNotification }) => {
      const { absolutizeUrl } = await import("./url");
      return sendPostNotification({
        id:            post.id,
        slug:          post.slug,
        title:         post.title,
        summary:       post.summary ?? null,
        featuredImage: absolutizeUrl(post.featuredImage) ?? null,
      });
    }).catch(() => {});
  }

  return { status: "ok", postId: post.id };
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
