import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { absolutizeUrl } from "@/lib/url";
import { extractBestMedia, downloadBestMedia } from "@/lib/pinterest";

interface ImportPin {
  pinId: string;
  pinUrl: string;
  title?: string;
}

interface ImportResult {
  pinId: string;
  status: "ok" | "error";
  error?: string;
  wallpaper?: {
    id: string;
    title: string;
    fileUrl: string;
    type: "IMAGE" | "VIDEO";
  };
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function resolveTagIds(tagNames: string[]): Promise<string[]> {
  const ids: string[] = [];
  for (const name of tagNames) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    const slug = slugify(trimmed);
    if (!slug) continue;
    try {
      const tag = await prisma.wallpaperTag.upsert({
        where: { slug },
        update: {},
        create: { name: trimmed, slug },
      });
      ids.push(tag.id);
    } catch {
      // race — fall back to read
      const existing = await prisma.wallpaperTag.findFirst({ where: { slug } });
      if (existing) ids.push(existing.id);
    }
  }
  return ids;
}

// POST /api/admin/pinterest-import
// Body: { pins: ImportPin[], categoryId?: string, tagNames?: string[] }
// Returns: { results: ImportResult[] }
export async function POST(request: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { pins?: unknown; categoryId?: unknown; tagNames?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const pinsRaw = Array.isArray(body.pins) ? body.pins : [];
  const pins: ImportPin[] = pinsRaw
    .map((p) => p as Record<string, unknown>)
    .filter((p) => typeof p.pinId === "string" && typeof p.pinUrl === "string")
    .map((p) => ({
      pinId: String(p.pinId),
      pinUrl: String(p.pinUrl),
      title: typeof p.title === "string" ? p.title : undefined,
    }))
    .slice(0, 30); // cap one request to 30 pins to bound work + headless cost

  if (!pins.length) return NextResponse.json({ error: "no pins provided" }, { status: 400 });

  const categoryId =
    typeof body.categoryId === "string" && body.categoryId ? body.categoryId : null;
  const tagNames = Array.isArray(body.tagNames)
    ? body.tagNames.filter((t): t is string => typeof t === "string")
    : [];
  const tagIds = await resolveTagIds(tagNames);

  const results: ImportResult[] = [];
  let notified = 0;
  const NOTIFY_CAP = 10; // bulk imports shouldn't fire a push per pin

  for (const pin of pins) {
    try {
      const media = await extractBestMedia(pin.pinUrl);
      const { url: fileUrl, actualType } = await downloadBestMedia(media);

      const wallpaper = await prisma.wallpaper.create({
        data: {
          title: (pin.title ?? media.title ?? "Pinterest Wallpaper").slice(0, 200),
          fileUrl,
          type: actualType,
          uploaderId: user.id,
          ...(categoryId ? { categories: { connect: [{ id: categoryId }] } } : {}),
          ...(tagIds.length ? { tags: { connect: tagIds.map((id) => ({ id })) } } : {}),
        },
        select: { id: true, title: true, fileUrl: true, type: true },
      });

      // Fire-and-forget push for newly added wallpapers (capped per batch).
      if (notified < NOTIFY_CAP) {
        notified++;
        import("@/lib/push-notifications").then(({ sendWallpaperNotification }) =>
          sendWallpaperNotification({
            id:          wallpaper.id,
            title:       wallpaper.title,
            fileUrl:     absolutizeUrl(wallpaper.fileUrl) ?? wallpaper.fileUrl,
            type:        wallpaper.type,
          }).catch(() => {})
        );
      }

      results.push({ pinId: pin.pinId, status: "ok", wallpaper });
    } catch (e) {
      results.push({
        pinId: pin.pinId,
        status: "error",
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return NextResponse.json({ results });
}
