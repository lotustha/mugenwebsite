import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "10", 10), 30);

  if (!q) return NextResponse.json([]);

  try {
    const posts = await prisma.post.findMany({
      where: {
        published: true,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { summary: { contains: q, mode: "insensitive" } },
          { tags: { some: { name: { contains: q, mode: "insensitive" } } } },
          { categories: { some: { name: { contains: q, mode: "insensitive" } } } },
        ],
      },
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
        featuredImage: true,
        createdAt: true,
        categories: { select: { id: true, name: true, slug: true } },
        tags: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return NextResponse.json(posts);
  } catch {
    return NextResponse.json([]);
  }
}
