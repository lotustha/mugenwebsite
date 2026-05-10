import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { absolutizeMediaUrls } from "@/lib/url";

const INCLUDE = {
  categories: { select: { id: true, name: true, slug: true } },
  tags: { select: { id: true, name: true, slug: true } },
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const tag = searchParams.get("tag") ?? undefined;
  const type = searchParams.get("type") ?? undefined;
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "18", 10), 60);
  const page = Math.max(parseInt(searchParams.get("page") ?? "1", 10), 1);
  const paginated = searchParams.has("page");
  const skip = (page - 1) * limit;

  try {
    const where: any = {
      ...(search ? { title: { contains: search, mode: "insensitive" } } : {}),
      ...(category ? { categories: { some: { slug: category } } } : {}),
      ...(tag ? { tags: { some: { slug: tag } } } : {}),
      ...(type === "IMAGE" || type === "VIDEO" ? { type } : {}),
    };

    if (paginated) {
      const [wallpapers, total] = await Promise.all([
        prisma.wallpaper.findMany({ where, include: INCLUDE, orderBy: { createdAt: "desc" }, take: limit, skip }),
        prisma.wallpaper.count({ where }),
      ]);
      return NextResponse.json(absolutizeMediaUrls({ wallpapers, total, pages: Math.ceil(total / limit) }));
    }

    const wallpapers = await prisma.wallpaper.findMany({
      where, include: INCLUDE, orderBy: { createdAt: "desc" }, take: limit,
    });
    return NextResponse.json(absolutizeMediaUrls(wallpapers));
  } catch {
    // Fallback: schema may not be migrated yet — return bare wallpapers without relations
    try {
      const simpleWhere: any = {};
      if (type === "IMAGE" || type === "VIDEO") simpleWhere.type = type;
      const wallpapers = await (prisma.wallpaper as any).findMany({
        where: simpleWhere, orderBy: { createdAt: "desc" }, take: limit,
      });
      return NextResponse.json(absolutizeMediaUrls(wallpapers.map((w: any) => ({ ...w, categories: [], tags: [] }))));
    } catch {
      return NextResponse.json([], { status: 200 });
    }
  }
}
