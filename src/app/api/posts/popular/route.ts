import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { absolutizeMediaUrls } from "@/lib/url";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Rank by real unique-visitor views, restricted to the last 30 days so the
    // widget reflects what's popular NOW rather than whatever accumulated the
    // most traffic since launch. Ties (and the pre-tracking backlog, which has
    // 0 views) fall back to recency.
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const posts = await prisma.post.findMany({
      where: { published: true, createdAt: { gte: cutoff } },
      select: { id: true, title: true, slug: true, featuredImage: true, createdAt: true, viewsCount: true },
      orderBy: [{ viewsCount: "desc" }, { createdAt: "desc" }],
      take: 5,
    });

    // Early on — or after a quiet month — there may be nothing in the window.
    if (posts.length < 5) {
      const filler = await prisma.post.findMany({
        where: { published: true, id: { notIn: posts.map((p) => p.id) } },
        select: { id: true, title: true, slug: true, featuredImage: true, createdAt: true, viewsCount: true },
        orderBy: { createdAt: "desc" },
        take: 5 - posts.length,
      });
      posts.push(...filler);
    }

    return NextResponse.json(absolutizeMediaUrls(posts));
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
