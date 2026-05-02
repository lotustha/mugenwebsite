import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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

    const post = await prisma.post.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(slug !== undefined && { slug }),
        ...(summary !== undefined && { summary }),
        ...(content !== undefined && { content }),
        ...(published !== undefined && { published }),
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
