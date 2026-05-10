import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { saveBuffer } from "@/lib/storage";

async function getUploaderId() {
  const user = await requireAdmin();
  return user?.id ?? null;
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const INCLUDE = {
  categories: { select: { id: true, name: true, slug: true } },
  tags: { select: { id: true, name: true, slug: true } },
};

async function resolveCategoryIds(categoryNames: string[]): Promise<string[]> {
  const ids: string[] = [];
  for (const name of categoryNames) {
    const slug = slugify(name.trim());
    if (!slug) continue;
    try {
      let cat = await prisma.wallpaperCategory.findFirst({
        where: { OR: [{ slug }, { name: name.trim() }] },
      });
      if (!cat) {
        cat = await prisma.wallpaperCategory.create({
          data: { name: name.trim(), slug },
        }).catch(() =>
          prisma.wallpaperCategory.findFirst({ where: { OR: [{ slug }, { name: name.trim() }] } })
        );
      }
      if (cat) ids.push(cat.id);
    } catch { /* skip this category */ }
  }
  return ids;
}

export async function GET() {
  try {
    const wallpapers = await prisma.wallpaper.findMany({
      orderBy: { createdAt: "desc" },
      include: INCLUDE,
    });
    return NextResponse.json(wallpapers);
  } catch {
    // Fallback: schema may not be migrated yet — return bare wallpapers without relations
    try {
      const wallpapers = await (prisma.wallpaper as any).findMany({ orderBy: { createdAt: "desc" } });
      return NextResponse.json(wallpapers.map((w: any) => ({ ...w, categories: [], tags: [] })));
    } catch (e: any) {
      console.error("[wallpapers GET fallback]", e?.message);
      return NextResponse.json({ error: e?.message ?? "Failed to fetch wallpapers" }, { status: 500 });
    }
  }
}

export async function POST(request: Request) {
  try {
    const uploaderId = await getUploaderId();
    if (!uploaderId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string;
    const description = (formData.get("description") as string | null)?.trim() || null;
    const categoryNamesRaw = (formData.get("categories") as string | null) ?? "";
    const tagsRaw = (formData.get("tags") as string | null) ?? "";

    if (!file || !title) return NextResponse.json({ error: "file and title required" }, { status: 400 });

    const ext = file.name.split(".").pop() ?? "bin";
    const buffer = Buffer.from(await file.arrayBuffer());
    const { url: publicUrl } = await saveBuffer({ buffer, folder: "wallpapers", ext });
    const type = file.type.startsWith("video/") ? "VIDEO" : "IMAGE";

    // Resolve categories
    const categoryNames = categoryNamesRaw.split(",").map(s => s.trim()).filter(Boolean);
    const categoryIds = await resolveCategoryIds(categoryNames);

    // Resolve tags
    const tagNames = tagsRaw.split(",").map(t => t.trim()).filter(Boolean);
    const tagIds: string[] = [];
    for (const tagName of tagNames) {
      const slug = slugify(tagName);
      if (!slug) continue;
      const tag = await prisma.wallpaperTag.upsert({
        where: { slug },
        update: {},
        create: { name: tagName, slug },
      });
      tagIds.push(tag.id);
    }

    let wallpaper: any;
    try {
      // Post-migration: description + many-to-many categories/tags
      wallpaper = await (prisma.wallpaper as any).create({
        data: {
          title, description, fileUrl: publicUrl, type, uploaderId,
          ...(categoryIds.length ? { categories: { connect: categoryIds.map((id: string) => ({ id })) } } : {}),
          ...(tagIds.length ? { tags: { connect: tagIds.map((id: string) => ({ id })) } } : {}),
        },
        include: INCLUDE,
      });
    } catch {
      // Pre-migration: single categoryId FK, no description
      wallpaper = await prisma.wallpaper.create({
        data: {
          title, fileUrl: publicUrl, type, uploaderId,
          ...(categoryIds[0] ? { categoryId: categoryIds[0] } : {}),
        } as any,
      });
      wallpaper = { ...wallpaper, categories: [], tags: [] };
    }

    // Fire-and-forget push notification
    import("@/lib/push-notifications").then(({ sendWallpaperNotification }) =>
      sendWallpaperNotification({
        id:          wallpaper.id,
        title:       wallpaper.title,
        fileUrl:     wallpaper.fileUrl,
        type:        wallpaper.type,
        description: wallpaper.description ?? null,
      }).catch(() => {})
    );

    return NextResponse.json(wallpaper, { status: 201 });
  } catch (e: any) {
    console.error("[wallpapers POST]", e);
    return NextResponse.json({ error: e?.message ?? "Upload failed" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const uploaderId = await getUploaderId();
    if (!uploaderId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, title, description, categoryIds, tagIds, tagNames } = await request.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    // Resolve tag names → IDs (upsert), giving priority to tagNames over tagIds
    let resolvedTagIds: string[] | undefined = tagIds;
    if (tagNames !== undefined) {
      resolvedTagIds = [];
      for (const name of (tagNames as string[])) {
        const trimmed = name.trim();
        if (!trimmed) continue;
        const slug = slugify(trimmed);
        if (!slug) continue;
        try {
          const tag = await prisma.wallpaperTag.upsert({
            where: { slug }, update: {}, create: { name: trimmed, slug },
          });
          resolvedTagIds.push(tag.id);
        } catch { /* skip duplicate race */ }
      }
    }

    let wallpaper: any;
    try {
      // Post-migration: many-to-many categories + description field
      wallpaper = await (prisma.wallpaper as any).update({
        where: { id },
        data: {
          ...(title !== undefined ? { title } : {}),
          ...(description !== undefined ? { description: description || null } : {}),
          ...(categoryIds !== undefined ? { categories: { set: categoryIds.map((cid: string) => ({ id: cid })) } } : {}),
          ...(resolvedTagIds !== undefined ? { tags: { set: resolvedTagIds.map((tid: string) => ({ id: tid })) } } : {}),
        },
        include: INCLUDE,
      });
    } catch {
      // Pre-migration fallback: only update title (categories/description not available)
      wallpaper = await prisma.wallpaper.update({
        where: { id },
        data: { ...(title !== undefined ? { title } : {}) },
      });
      wallpaper = { ...wallpaper, categories: [], tags: [] };
    }
    return NextResponse.json(wallpaper);
  } catch (e: any) {
    console.error("[wallpapers PATCH]", e);
    return NextResponse.json({ error: e?.message ?? "Update failed" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await prisma.wallpaper.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
