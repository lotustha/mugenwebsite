import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const categories = await prisma.wallpaperCategory.findMany({
      select: {
        id: true, name: true, slug: true,
        _count: { select: { wallpapers: true } },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(
      categories.map((c) => ({ ...c, count: c._count.wallpapers, _count: undefined }))
    );
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
