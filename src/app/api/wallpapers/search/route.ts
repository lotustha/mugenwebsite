import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "12", 10), 30);
  const type = searchParams.get("type") ?? undefined;

  if (!q) return NextResponse.json([]);

  try {
    const wallpapers = await prisma.wallpaper.findMany({
      where: {
        ...(type === "IMAGE" || type === "VIDEO" ? { type } : {}),
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { tags: { some: { name: { contains: q, mode: "insensitive" } } } },
          { categories: { some: { name: { contains: q, mode: "insensitive" } } } },
        ],
      },
      select: {
        id: true,
        title: true,
        imageUrl: true,
        type: true,
        categories: { select: { id: true, name: true, slug: true } },
        tags: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return NextResponse.json(wallpapers);
  } catch {
    return NextResponse.json([]);
  }
}
