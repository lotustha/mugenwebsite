import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";

async function requireAuth() {
  return await requireAdmin();
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function GET() {
  try {
    const cats = await prisma.wallpaperCategory.findMany({
      select: { id: true, name: true, slug: true, _count: { select: { wallpapers: true } } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(cats.map((c) => ({ ...c, count: c._count.wallpapers, _count: undefined })));
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request: Request) {
  if (!await requireAuth()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { name } = await request.json();
    if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });
    const cat = await prisma.wallpaperCategory.create({
      data: { name: name.trim(), slug: slugify(name.trim()) },
    });
    return NextResponse.json(cat, { status: 201 });
  } catch (e: any) {
    console.error("[wallpaper-categories POST]", e?.message, e?.code);
    if (e?.code === "P2002") return NextResponse.json({ error: "Category already exists" }, { status: 409 });
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!await requireAuth()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id, name } = await request.json();
    if (!id || !name?.trim()) return NextResponse.json({ error: "id and name required" }, { status: 400 });
    const slug = slugify(name.trim());
    const cat = await prisma.wallpaperCategory.update({
      where: { id },
      data: { name: name.trim(), slug },
      select: { id: true, name: true, slug: true },
    });
    return NextResponse.json(cat);
  } catch (e: any) {
    if (e?.code === "P2002") return NextResponse.json({ error: "Category already exists" }, { status: 409 });
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!await requireAuth()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const reassignTo = searchParams.get("reassignTo");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    if (reassignTo) {
      let reassigned = false;
      // Post-migration path: many-to-many categories relation
      try {
        const wallpapers = await (prisma.wallpaper as any).findMany({
          where: { categories: { some: { id } } },
          select: { id: true },
        });
        if (wallpapers.length > 0) {
          await (prisma.wallpaperCategory as any).update({
            where: { id: reassignTo },
            data: { wallpapers: { connect: wallpapers.map((w: any) => ({ id: w.id })) } },
          });
        }
        reassigned = true;
      } catch {
        // Pre-migration path: single categoryId FK
      }
      if (!reassigned) {
        await (prisma.wallpaper as any).updateMany({
          where: { categoryId: id },
          data: { categoryId: reassignTo },
        });
      }
    }
    await prisma.wallpaperCategory.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[wallpaper-categories DELETE]", e?.message);
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}
