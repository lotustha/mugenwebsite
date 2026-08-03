/**
 * Shared "AI output → published Post" writer.
 *
 * Extracted from rss-processor so the RSS importer and the AI autopilot create
 * posts through exactly one code path. The category-collision handling in here
 * is subtle (see below) and previously existed in only one place — duplicating
 * it was how the two pipelines would drift.
 */

import { prisma } from "@/lib/prisma";

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export interface CreatePostInput {
  title: string;
  slug?: string;
  summary: string;
  contentHtml: string;
  category?: string;
  tags?: string[];
  featuredImage?: string | null;
  featuredImageAlt?: string | null;
  seo?: { metaTitle?: string; metaDescription?: string; keywords?: string };
  authorId: string;
  published: boolean;
  /** "rss" | "autopilot" | "manual" — only autopilot posts feed topic scoring. */
  source?: string;
  topicId?: string | null;
  /** Skip the outgoing push notification (e.g. bulk backfills). */
  silent?: boolean;
}

/**
 * Resolve a category by name, creating it if absent.
 *
 * Both `name` and `slug` are @unique, so a bare upsert on either column throws
 * when the other collides (e.g. "Anime News" vs "anime-news" arriving from two
 * different AI responses). Match on either column first, and treat a create
 * failure as a lost race rather than an error.
 */
export async function resolveCategory(categoryName: string) {
  const name = categoryName.trim() || "Anime News";
  const slug = slugify(name);

  const existing = await prisma.category.findFirst({
    where: { OR: [{ slug }, { name }] },
  });
  if (existing) return existing;

  try {
    return await prisma.category.create({ data: { name, slug } });
  } catch {
    return prisma.category.findFirst({ where: { OR: [{ slug }, { name }] } });
  }
}

/** Same unique-on-both-columns hazard as categories. */
export async function resolveTags(names: string[], max = 8): Promise<string[]> {
  const ids: string[] = [];

  for (const raw of names.slice(0, max)) {
    const name = String(raw ?? "").trim();
    const slug = slugify(name);
    if (!slug) continue;

    let tag = await prisma.tag.findFirst({ where: { OR: [{ slug }, { name }] } });
    if (!tag) {
      try {
        tag = await prisma.tag.create({ data: { name, slug } });
      } catch {
        tag = await prisma.tag.findFirst({ where: { OR: [{ slug }, { name }] } });
      }
    }
    if (tag && !ids.includes(tag.id)) ids.push(tag.id);
  }

  return ids;
}

/** Append a numeric suffix until the slug is free. */
export async function uniqueSlug(desired: string): Promise<string> {
  const base = slugify(desired) || `post-${Date.now()}`;
  let slug = base;
  let n = 2;

  // Bounded so a pathological collision can never spin forever.
  while (n < 25) {
    const taken = await prisma.post.findUnique({ where: { slug }, select: { id: true } });
    if (!taken) return slug;
    slug = `${base}-${n++}`;
  }
  return `${base}-${Date.now()}`;
}

export async function createPostFromAi(input: CreatePostInput) {
  const category = input.category ? await resolveCategory(input.category) : null;
  const tagIds = await resolveTags(input.tags ?? []);
  const slug = await uniqueSlug(input.slug || input.title);

  const post = await prisma.post.create({
    data: {
      title: input.title,
      slug,
      summary: input.summary,
      content: input.contentHtml,
      published: input.published,
      publishedAt: input.published ? new Date() : null,
      source: input.source ?? "manual",
      topicId: input.topicId ?? null,
      featuredImage: input.featuredImage ?? undefined,
      featuredImageAlt: input.featuredImageAlt ?? input.title,
      authorId: input.authorId,
      categories: category ? { connect: [{ id: category.id }] } : undefined,
      tags: tagIds.length ? { connect: tagIds.map((id) => ({ id })) } : undefined,
      seoMeta: {
        create: {
          metaTitle: input.seo?.metaTitle || input.title,
          metaDescription: input.seo?.metaDescription || input.summary,
          ogImageUrl: input.featuredImage || null,
          keywords: input.seo?.keywords || (input.tags ?? []).join(", "),
        },
      },
    },
  });

  // Fire-and-forget: neither a push nor an SEO ping may fail post creation.
  if (input.published && !input.silent) {
    import("./push-notifications")
      .then(async ({ sendPostNotification }) => {
        const { absolutizeUrl } = await import("./url");
        return sendPostNotification({
          id: post.id,
          slug: post.slug,
          title: post.title,
          summary: post.summary ?? null,
          featuredImage: absolutizeUrl(post.featuredImage) ?? null,
        });
      })
      .catch(() => {});

    // Ask the IndexNow engines to crawl it now. A daily post that sits
    // unindexed for a week has already lost most of its news value.
    import("./indexnow")
      .then(({ submitPost }) => submitPost(post.slug))
      .catch(() => {});
  }

  return post;
}
