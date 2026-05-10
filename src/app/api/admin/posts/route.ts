import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";

// GET /api/admin/posts  — list all posts with relations
export async function GET() {
  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        categories: { select: { id: true, name: true } },
        tags: { select: { id: true, name: true } },
        seoMeta: true,
      },
    });
    return NextResponse.json(posts);
  } catch {
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}

// POST /api/admin/posts  — create post
export async function POST(request: Request) {
  try {
    const user = await requireAdmin();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const authorId = user.id;

    const body = await request.json();
    const {
      title, slug, summary, content, published = false,
      featuredImage, featuredImageAlt,
      categoryIds = [], tagIds = [],
      seo,
    } = body;

    if (!title || !slug || !summary || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const post = await prisma.post.create({
      data: {
        title, slug, summary, content, published,
        featuredImage, featuredImageAlt,
        authorId,
        categories: { connect: categoryIds.map((id: string) => ({ id })) },
        tags: { connect: tagIds.map((id: string) => ({ id })) },
        ...(seo ? {
          seoMeta: {
            create: {
              metaTitle: seo.metaTitle || title,
              metaDescription: seo.metaDescription || summary,
              ogImageUrl: seo.ogImageUrl || featuredImage || null,
              canonicalUrl: seo.canonicalUrl || null,
              keywords: seo.keywords || null,
            },
          },
        } : {}),
      },
      include: { categories: true, tags: true, seoMeta: true },
    });
    return NextResponse.json(post, { status: 201 });
  } catch (err: any) {
    if (err?.code === "P2002") return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
