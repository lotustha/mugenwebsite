import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";

const MEDIA_TYPES = new Set(["image", "video", "both"]);

// PATCH /api/admin/wallpaper-sources/[id]
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const body = await request.json();
    const source = await prisma.wallpaperSource.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.query !== undefined && { query: body.query }),
        ...(body.mediaType !== undefined && {
          mediaType: MEDIA_TYPES.has(body.mediaType) ? body.mediaType : "image",
        }),
        ...(body.maxItems !== undefined && {
          maxItems: Math.min(Math.max(1, Number(body.maxItems) || 8), 30),
        }),
        ...(body.scheduleMinutes !== undefined && { scheduleMinutes: body.scheduleMinutes }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.notify !== undefined && { notify: body.notify }),
        ...(body.categoryId !== undefined && { categoryId: body.categoryId || null }),
        ...(body.tags !== undefined && { tags: body.tags }),
      },
    });
    return NextResponse.json(source);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

// DELETE /api/admin/wallpaper-sources/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.wallpaperSource.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
