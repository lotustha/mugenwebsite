import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const posts = await prisma.post.findMany({
      where: { published: true },
      select: { id: true, title: true, slug: true, featuredImage: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    return NextResponse.json(posts);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
