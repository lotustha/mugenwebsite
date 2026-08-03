/**
 * AI Autopilot — writes and publishes an original post end to end.
 *
 * Unlike the RSS importer, nothing here starts from someone else's article. The
 * flow is:
 *
 *   1. Score topics on real engagement, then pick one (weighted + exploration)
 *   2. Ideate a specific angle, explicitly avoiding recent titles
 *   3. Write the full article as JSON (content, summary, tags, category, SEO)
 *   4. Resolve the AI's video *search query* to a real, verified YouTube video
 *   5. Pick a featured image, download it locally
 *   6. Create the post through the shared writer (category/tags/SEO/push)
 */

import { prisma } from "@/lib/prisma";
import { callAi, downloadAndStoreImage, type AiSettings } from "@/lib/rss-processor";
import { createPostFromAi, slugify } from "@/lib/post-creator";
import { findVideo, embedHtml } from "@/lib/youtube";
import { scoreTopics, pickTopic } from "@/lib/autopilot-scoring";
import { getAnimeContext } from "@/lib/anime-context";

export interface AutopilotResult {
  status: "ok" | "error";
  postId?: string;
  title?: string;
  topic?: string;
  videoId?: string;
  model?: string;
  error?: string;
}

interface GeneratedPost {
  title: string;
  slug: string;
  summary: string;
  contentHtml: string;
  bulletPoints?: string[];
  tags: string[];
  category: string;
  youtubeQuery: string;
  imageQuery: string;
  seo: { metaTitle: string; metaDescription: string; keywords: string };
}

// ─── Prompts ──────────────────────────────────────────────────────────────────

const IDEATION_PROMPT = (
  topicName: string,
  hint: string,
  recentTitles: string[],
  animeContext: string,
) => `
You are the editor of Mugen Anime, a popular anime news and culture site.

${animeContext ? `${animeContext}\n` : ""}
Today you are commissioning ONE article in this section: "${topicName}".
Section brief: ${hint}

ALREADY PUBLISHED — do not repeat these angles, subjects or framings:
${recentTitles.length ? recentTitles.map((t) => `- ${t}`).join("\n") : "- (nothing yet)"}

Pick a SPECIFIC, concrete angle a real anime fan would click on this week.
Name actual anime, characters, studios or events — never a generic listicle
that could have been written five years ago.
${animeContext ? "Strongly prefer titles from the live catalogue data above — readers can watch those on the app today." : ""}

Return ONLY valid JSON, no markdown fences:
{
  "angle": "One sentence describing the specific article you are commissioning",
  "workingTitle": "A specific, engaging title",
  "why": "One sentence on why an anime fan would click this"
}
`.trim();

const ARTICLE_PROMPT = (
  angle: string,
  workingTitle: string,
  topicName: string,
  existingCategories: string[],
  animeContext: string,
) => `
You are a senior anime writer for Mugen Anime. Write a complete, publication-ready article.

${animeContext ? `${animeContext}\n` : ""}
ASSIGNMENT: ${angle}
WORKING TITLE: ${workingTitle}
SECTION: ${topicName}
EXISTING SITE CATEGORIES: ${existingCategories.join(", ") || "none yet"}

WRITING RULES:
- 700-1000 words of genuinely engaging, opinionated writing. Sound like an
  enthusiastic human fan, not a summary bot.
- Open with a hook that makes the reader want the next sentence. Never open with
  "In the world of anime" or similar filler.
- Use <h2> and <h3> subheadings, <p> paragraphs, <strong> for emphasis and <ul>
  lists where they genuinely help.
- Be concrete: name real anime, studios, characters and years. If you are not
  certain a fact is true, write around it rather than inventing it. Never state a
  release date, episode count or staff credit you are not sure of — vague but
  true beats specific but wrong.
- Do NOT include an <h1> — the site renders the title separately.
- Do NOT include any <img> tags or YouTube embeds; those are added automatically.
- End with a short, natural call to action to watch on the Mugen Anime app.

Return ONLY valid JSON, no markdown fences:
{
  "title": "Final title, engaging, under 70 characters",
  "slug": "url-friendly-slug",
  "summary": "2-3 sentence excerpt that makes someone want to read",
  "contentHtml": "The full article as HTML, following the rules above",
  "bulletPoints": ["Key takeaway 1", "Key takeaway 2", "Key takeaway 3"],
  "tags": ["5-8 specific tags, e.g. anime titles, studios, genres"],
  "category": "Best match from EXISTING SITE CATEGORIES, or a sensible new one",
  "youtubeQuery": "A YouTube SEARCH QUERY that finds a real, relevant official trailer or clip for this article. Do NOT output a video ID or URL — just the words you would type into YouTube search.",
  "imageQuery": "The single most relevant anime title for finding a header image, e.g. 'Frieren Beyond Journey's End'",
  "seo": {
    "metaTitle": "SEO title under 60 characters",
    "metaDescription": "Compelling meta description, 140-160 characters",
    "keywords": "comma, separated, keywords"
  }
}
`.trim();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Tolerant JSON extraction — models wrap output in fences or prose. */
function parseJson<T>(raw: string): T {
  let text = raw.trim();
  if (!text) throw new Error("AI returned an empty response");

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenced) text = fenced[1].trim();

  if (!text.startsWith("{")) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error(`No JSON found: "${text.slice(0, 200)}"`);
    text = text.slice(start, end + 1);
  }

  return JSON.parse(text) as T;
}

/**
 * Cheap title-similarity check on significant words.
 *
 * An ideating model reaches for the same few evergreen angles ("Top 10 Anime of
 * 2026") over and over. The prompt lists recent titles, but a second mechanical
 * check is what actually stops near-duplicates from shipping.
 */
function tooSimilar(candidate: string, existing: string[]): boolean {
  const stop = new Set(["the", "a", "an", "of", "and", "in", "to", "for", "is", "are", "why", "how", "best", "top", "you", "your", "that", "this", "with", "on", "it"]);
  const words = (s: string) =>
    new Set(
      s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !stop.has(w)),
    );

  const a = words(candidate);
  if (a.size === 0) return false;

  return existing.some((title) => {
    const b = words(title);
    if (b.size === 0) return false;
    const overlap = [...a].filter((w) => b.has(w)).length;
    return overlap / Math.min(a.size, b.size) > 0.6;
  });
}

/** Look up a poster from the site's own anime API — used when there's no video. */
async function findAnimePoster(query: string): Promise<string | null> {
  const base = process.env.ANIME_API_BASE;
  if (!base || !query.trim()) return null;

  try {
    const res = await fetch(`${base}/suggestions/${encodeURIComponent(query.trim())}`, {
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;

    const d = (await res.json()) as { results?: Array<{ image?: string }> };
    const image = d.results?.find((r) => r.image?.startsWith("http"))?.image;
    return image ?? null;
  } catch {
    return null;
  }
}

// ─── Main generator ───────────────────────────────────────────────────────────

export interface GenerateOptions {
  aiSettings: AiSettings;
  /** Force a specific topic instead of letting engagement decide. */
  topicId?: string;
  trigger?: "cron" | "manual";
  /** Publish immediately (default) or leave as a draft for review. */
  publish?: boolean;
}

export async function generatePost(opts: GenerateOptions): Promise<AutopilotResult> {
  const trigger = opts.trigger ?? "cron";
  let topicRow: { id: string; name: string; promptHint: string; category: string } | null = null;

  try {
    // 1. Choose the topic. Scoring runs on every generation so the weights shown
    //    in the admin UI are always current, not from whenever it last ran.
    const scores = await scoreTopics();

    if (opts.topicId) {
      topicRow = await prisma.aiTopic.findUnique({
        where: { id: opts.topicId },
        select: { id: true, name: true, promptHint: true, category: true },
      });
    } else {
      const picked = pickTopic(scores);
      if (picked) {
        topicRow = await prisma.aiTopic.findUnique({
          where: { id: picked.topicId },
          select: { id: true, name: true, promptHint: true, category: true },
        });
      }
    }

    if (!topicRow) {
      throw new Error("No active AI topics configured — add one in /admin/autopilot");
    }

    // 2. Ideate, avoiding what's already been covered.
    const recent = await prisma.post.findMany({
      where: { source: "autopilot" },
      select: { title: true },
      orderBy: { createdAt: "desc" },
      take: 40,
    });
    const recentTitles = recent.map((p) => p.title);

    // Ground both prompts in the live catalogue. The model's sense of "currently
    // airing" is frozen at its training cutoff, so without this the seasonal
    // topics confidently write about a season that already ended.
    const { promptBlock: animeContext } = await getAnimeContext();

    const idea = parseJson<{ angle: string; workingTitle: string }>(
      await callAi(
        opts.aiSettings,
        IDEATION_PROMPT(topicRow.name, topicRow.promptHint, recentTitles, animeContext),
      ),
    );

    // 3. Write the article.
    const categories = await prisma.category.findMany({ select: { name: true } });
    const catNames = categories.map((c) => c.name);

    let article = parseJson<GeneratedPost>(
      await callAi(
        opts.aiSettings,
        ARTICLE_PROMPT(idea.angle, idea.workingTitle, topicRow.name, catNames, animeContext),
      ),
    );

    // One re-roll if the model landed on something we've effectively published.
    if (tooSimilar(article.title, recentTitles)) {
      const retryIdea = parseJson<{ angle: string; workingTitle: string }>(
        await callAi(
          opts.aiSettings,
          IDEATION_PROMPT(topicRow.name, topicRow.promptHint, [...recentTitles, article.title], animeContext),
        ),
      );
      article = parseJson<GeneratedPost>(
        await callAi(
          opts.aiSettings,
          ARTICLE_PROMPT(retryIdea.angle, retryIdea.workingTitle, topicRow.name, catNames, animeContext),
        ),
      );
    }

    if (!article.title?.trim() || !article.contentHtml?.trim()) {
      throw new Error("AI response was missing a title or article body");
    }

    // 4. Resolve the video from the model's SEARCH QUERY. A missing video is a
    //    normal outcome — the post ships without an embed rather than with a
    //    broken one.
    const video = await findVideo(article.youtubeQuery || `${article.imageQuery} anime trailer`);

    // 5. Featured image: the video's thumbnail is on-topic and always 16:9;
    //    an anime poster is the fallback. Both are copied to local storage so
    //    posts don't break when a remote host disappears.
    let featuredImage: string | null = null;
    if (video) featuredImage = await downloadAndStoreImage(video.thumbnail, "ai");
    if (!featuredImage) {
      const poster = await findAnimePoster(article.imageQuery || article.title);
      if (poster) featuredImage = await downloadAndStoreImage(poster, "ai");
    }

    // 6. Assemble the body: takeaways → article → video embed.
    const bullets = Array.isArray(article.bulletPoints) ? article.bulletPoints.filter(Boolean) : [];
    const bulletBlock = bullets.length
      ? `<h2>Quick Takeaways</h2>\n<ul>\n${bullets.map((b) => `  <li>${String(b).replace(/^[•\-]\s*/, "")}</li>`).join("\n")}\n</ul>\n<hr />\n`
      : "";
    const videoBlock = video ? `\n${embedHtml(video, "Watch the Trailer")}\n` : "";
    const contentHtml = `${bulletBlock}${article.contentHtml}${videoBlock}`;

    const post = await createPostFromAi({
      title: article.title,
      slug: article.slug || slugify(article.title),
      summary: article.summary || idea.angle,
      contentHtml,
      category: article.category || topicRow.category,
      tags: Array.isArray(article.tags) ? article.tags : [],
      featuredImage,
      featuredImageAlt: article.title,
      seo: article.seo,
      authorId: await resolveAuthorId(),
      published: opts.publish ?? true,
      source: "autopilot",
      topicId: topicRow.id,
    });

    await prisma.aiTopic.update({
      where: { id: topicRow.id },
      data: { lastUsedAt: new Date() },
    });

    await prisma.autopilotRun.create({
      data: {
        topicId: topicRow.id,
        postId: post.id,
        status: "ok",
        title: post.title,
        videoId: video?.id ?? null,
        model: opts.aiSettings.model || null,
        trigger,
      },
    });

    return {
      status: "ok",
      postId: post.id,
      title: post.title,
      topic: topicRow.name,
      videoId: video?.id,
      model: opts.aiSettings.model,
    };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);

    // Failures are recorded too — otherwise a quiet day looks identical to a
    // quota-exhausted one in the admin UI.
    await prisma.autopilotRun
      .create({
        data: {
          topicId: topicRow?.id ?? null,
          status: "error",
          errorMsg: error.slice(0, 500),
          model: opts.aiSettings.model || null,
          trigger,
        },
      })
      .catch(() => {});

    return { status: "error", error, topic: topicRow?.name };
  }
}

/** Posts need an author FK; prefer a real admin, fall back to a system account. */
async function resolveAuthorId(): Promise<string> {
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } });
  if (admin) return admin.id;

  const any = await prisma.user.findFirst({ select: { id: true } });
  if (any) return any.id;

  const created = await prisma.user.create({
    data: { email: "system.bot@mugenanime.local", role: "ADMIN" },
    select: { id: true },
  });
  return created.id;
}

/** Resolve the configured AI provider from SystemSetting, falling back to env. */
export async function getAiSettings(): Promise<AiSettings | null> {
  const rows = await prisma.systemSetting.findMany();
  const cfg: Record<string, string> = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  // The autopilot is designed around Gemini's free tier, so prefer it whenever a
  // Gemini key exists even if other providers are also configured.
  if (cfg.gemini) return { provider: "gemini", apiKey: cfg.gemini, model: cfg.geminiModel || undefined };
  if (process.env.GEMINI_API_KEY) return { provider: "gemini", apiKey: process.env.GEMINI_API_KEY };
  if (cfg.openrouter) return { provider: "openrouter", apiKey: cfg.openrouter, model: cfg.openrouterModel || undefined };
  if (cfg.openai) return { provider: "openai", apiKey: cfg.openai, model: cfg.openaiModel || undefined };
  if (cfg.claude) return { provider: "claude", apiKey: cfg.claude, model: cfg.claudeModel || undefined };

  return null;
}

/** Default topic set, seeded on first visit to the admin page. */
export const DEFAULT_TOPICS = [
  {
    name: "Seasonal Anime Spotlights",
    promptHint:
      "Deep dives on anime airing this season — what's worth watching, what's underrated, how episodes are landing with fans.",
    category: "Anime News",
  },
  {
    name: "Character Deep Dives",
    promptHint:
      "Character studies: motivations, arcs, power scaling, and why a character resonates. Pick characters fans actively argue about.",
    category: "Anime Culture",
  },
  {
    name: "Anime Recommendations",
    promptHint:
      "Curated 'if you liked X, watch Y' lists and hidden gems. Always specific and personal, never a generic top-10.",
    category: "Recommendations",
  },
  {
    name: "Manga & Adaptation News",
    promptHint:
      "Manga arcs, adaptation announcements, and how faithfully studios handle source material.",
    category: "Manga",
  },
  {
    name: "Studio & Industry",
    promptHint:
      "Animation studios, directors, production stories, and the business behind the shows.",
    category: "Industry",
  },
  {
    name: "Trailers & Announcements",
    promptHint:
      "New trailers, PVs, key visuals and release dates — with real analysis of what the footage shows.",
    category: "Anime News",
  },
];
