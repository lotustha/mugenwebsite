import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const tags = await prisma.wallpaperTag.findMany({
      select: {
        id: true, name: true, slug: true,
        _count: { select: { wallpapers: true } },
      },
      orderBy: { name: "asc" },
      take: 40,
    });
    return NextResponse.json(
      tags.map((t) => ({ ...t, count: t._count.wallpapers, _count: undefined }))
    );
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
