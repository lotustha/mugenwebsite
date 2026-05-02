import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const wallpaper = await (prisma.wallpaper as any).findUnique({
      where: { id },
      include: {
        categories: { select: { id: true, name: true, slug: true } },
        tags: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!wallpaper) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Increment view count non-blocking
    prisma.wallpaper.update({ where: { id }, data: { downloadsCount: { increment: 1 } } }).catch(() => {});

    return NextResponse.json(wallpaper);
  } catch {
    // Fallback without relations for pre-migration state
    try {
      const wallpaper = await prisma.wallpaper.findUnique({ where: { id } });
      if (!wallpaper) return NextResponse.json({ error: "Not found" }, { status: 404 });
      prisma.wallpaper.update({ where: { id }, data: { downloadsCount: { increment: 1 } } }).catch(() => {});
      return NextResponse.json({ ...wallpaper, categories: [], tags: [] });
    } catch {
      return NextResponse.json({ error: "Failed" }, { status: 500 });
    }
  }
}
