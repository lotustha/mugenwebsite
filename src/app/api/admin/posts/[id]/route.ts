import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";

async function requireAuth() {
  const user = await requireAdmin();
  return user ? user.id : null;
}

// GET /api/admin/posts/[id]
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        categories: true,
        tags: true,
        seoMeta: true,
      },
    });
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(post);
  } catch {
    return NextResponse.json({ error: "Failed to fetch post" }, { status: 500 });
  }
}

// PUT /api/admin/posts/[id]
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireAuth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const {
      title, slug, summary, content, published,
      featuredImage, featuredImageAlt,
      categoryIds, tagIds,
      seo,
    } = body;

    // Capture the prior published state so we only push on a false→true flip.
    const prev = await prisma.post.findUnique({
      where: { id },
      select: { published: true, publishedAt: true },
    });

    const post = await prisma.post.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(slug !== undefined && { slug }),
        ...(summary !== undefined && { summary }),
        ...(content !== undefined && { content }),
        ...(published !== undefined && { published }),
        // Stamp on the first draft→published flip only. Re-publishing a post that
        // was already live must NOT reset the clock, or its engagement window
        // restarts and the topic scoring sees it as a brand-new post.
        ...(published === true && prev && !prev.publishedAt && { publishedAt: new Date() }),
        ...(featuredImage !== undefined && { featuredImage }),
        ...(featuredImageAlt !== undefined && { featuredImageAlt }),
        ...(categoryIds !== undefined && {
          categories: { set: categoryIds.map((cid: string) => ({ id: cid })) },
        }),
        ...(tagIds !== undefined && {
          tags: { set: tagIds.map((tid: string) => ({ id: tid })) },
        }),
        ...(seo !== undefined && {
          seoMeta: {
            upsert: {
              create: {
                metaTitle: seo.metaTitle || title || "",
                metaDescription: seo.metaDescription || summary || "",
                ogImageUrl: seo.ogImageUrl || featuredImage || null,
                canonicalUrl: seo.canonicalUrl || null,
                keywords: seo.keywords || null,
              },
              update: {
                ...(seo.metaTitle !== undefined && { metaTitle: seo.metaTitle }),
                ...(seo.metaDescription !== undefined && { metaDescription: seo.metaDescription }),
                ...(seo.ogImageUrl !== undefined && { ogImageUrl: seo.ogImageUrl }),
                ...(seo.canonicalUrl !== undefined && { canonicalUrl: seo.canonicalUrl }),
                ...(seo.keywords !== undefined && { keywords: seo.keywords }),
              },
            },
          },
        }),
      },
      include: { categories: true, tags: true, seoMeta: true },
    });

    // Push "new post" only when this update flips it from draft → published.
    if (post.published && prev && !prev.published) {
      import("@/lib/push-notifications").then(async ({ sendPostNotification }) => {
        const { absolutizeUrl } = await import("@/lib/url");
        return sendPostNotification({
          id: post.id,
          slug: post.slug,
          title: post.title,
          summary: post.summary ?? null,
          featuredImage: absolutizeUrl(post.featuredImage) ?? null,
        });
      }).catch(() => {});
    }

    return NextResponse.json(post);
  } catch (err: any) {
    if (err?.code === "P2002") return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
    return NextResponse.json({ error: "Failed to update post" }, { status: 500 });
  }
}

// DELETE /api/admin/posts/[id]
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireAuth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await prisma.post.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }
}
