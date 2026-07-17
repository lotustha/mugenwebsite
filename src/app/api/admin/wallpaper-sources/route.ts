import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";

const MEDIA_TYPES = new Set(["image", "video", "both"]);

// GET /api/admin/wallpaper-sources — list all sources with their category
export async function GET() {
  try {
    const sources = await prisma.wallpaperSource.findMany({
      orderBy: { createdAt: "desc" },
      include: { category: { select: { id: true, name: true } } },
    });
    return NextResponse.json(sources);
  } catch {
    return NextResponse.json({ error: "Failed to fetch sources" }, { status: 500 });
  }
}

// POST /api/admin/wallpaper-sources — create source
export async function POST(request: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const {
      name,
      query,
      mediaType = "image",
      maxItems = 8,
      scheduleMinutes = 720,
      isActive = true,
      notify = true,
      categoryId = null,
      tags = "",
    } = await request.json();

    if (!name || !query) {
      return NextResponse.json({ error: "name and query are required" }, { status: 400 });
    }

    const source = await prisma.wallpaperSource.create({
      data: {
        name,
        query,
        mediaType: MEDIA_TYPES.has(mediaType) ? mediaType : "image",
        maxItems: Math.min(Math.max(1, Number(maxItems) || 8), 30),
        scheduleMinutes,
        isActive,
        notify,
        categoryId: categoryId || null,
        tags: typeof tags === "string" ? tags : "",
      },
    });
    return NextResponse.json(source, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
