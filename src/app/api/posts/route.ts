import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { absolutizeMediaUrls } from "@/lib/url";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const exclude = searchParams.get("exclude") ?? undefined;
    const search = searchParams.get("search") ?? undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 50);
    const page = Math.max(parseInt(searchParams.get("page") ?? "1", 10), 1);
    const paginated = searchParams.has("page");
    const skip = (page - 1) * limit;

    const where = {
      published: true,
      ...(exclude ? { slug: { not: exclude } } : {}),
      ...(search ? {
        OR: [
          { title: { contains: search, mode: "insensitive" as const } },
          { summary: { contains: search, mode: "insensitive" as const } },
        ],
      } : {}),
    };

    const select = {
      id: true,
      title: true,
      slug: true,
      summary: true,
      featuredImage: true,
      createdAt: true,
    };

    if (paginated) {
      const [posts, total] = await Promise.all([
        prisma.post.findMany({ where, select, orderBy: { createdAt: "desc" }, take: limit, skip }),
        prisma.post.count({ where }),
      ]);
      return NextResponse.json(absolutizeMediaUrls({ posts, total, pages: Math.ceil(total / limit) }));
    }

    const posts = await prisma.post.findMany({ where, select, orderBy: { createdAt: "desc" }, take: limit });
    return NextResponse.json(absolutizeMediaUrls(posts));
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
