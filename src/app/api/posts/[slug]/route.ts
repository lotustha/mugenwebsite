import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { absolutizeMediaUrls } from "@/lib/url";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const post = await prisma.post.findFirst({
      where: { slug, published: true },
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
        content: true,
        featuredImage: true,
        featuredImageAlt: true,
        createdAt: true,
      },
    });
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(absolutizeMediaUrls(post));
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
