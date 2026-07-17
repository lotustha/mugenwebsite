/**
 * Wallpaper auto-import processor — the wallpaper-side counterpart of
 * rss-processor.ts. Called by the cron scheduler (wallpaperTick) and the admin
 * "Run Now" button.
 *
 * For each WallpaperSource that's due (lastRunAt + scheduleMinutes <= now):
 *   1. Pinterest search the source's query (searchPins, 3-layer scraper)
 *   2. Filter by media type (image / video / both)
 *   3. Deduplicate against Wallpaper.sourceId (the pinId)
 *   4. For each new pin (up to maxItems): extract + download → create Wallpaper
 *   5. Optionally push-notify, then stamp lastRunAt + totalImported
 *
 * No AI needed — Pinterest's cleaned pin title is the wallpaper title and the
 * category/tags come from the source config.
 */

import { prisma } from "@/lib/prisma";
import { absolutizeUrl } from "@/lib/url";
import {
  searchPins,
  extractBestMedia,
  downloadBestMedia,
  type PinMedia,
  type PinSearchResult,
} from "@/lib/pinterest";

/**
 * Prefer hotlinking Pinterest's CDN (i.pinimg.com / v.pinimg.com) over
 * downloading to local disk: auto-imported files stored on disk have been
 * lost across deploys before (dead /uploads/pinterest URLs), while the CDN
 * URLs are stable and hotlinkable. Falls back to the legacy
 * download-and-store path only for HLS-only videos, which need an ffmpeg
 * remux to be playable as a plain MP4.
 */
async function resolveMediaUrl(
  media: PinMedia,
): Promise<{ url: string; actualType: "IMAGE" | "VIDEO" }> {
  if (media.videoUrl && !media.videoUrl.includes(".m3u8")) {
    return { url: media.videoUrl, actualType: "VIDEO" };
  }
  if (media.hlsUrl) {
    try {
      return await downloadBestMedia(media);
    } catch {
      // fall through to the still image if the remux fails
    }
  }
  if (media.imageUrl) {
    return { url: media.imageUrl, actualType: "IMAGE" };
  }
  throw new Error("No usable media URL");
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function resolveTagIds(tagNames: string[]): Promise<string[]> {
  const ids: string[] = [];
  for (const name of tagNames) {
    const trimmed = name.trim();
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
      const existing = await prisma.wallpaperTag.findFirst({ where: { slug } });
      if (existing) ids.push(existing.id);
    }
  }
  return ids;
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface WallpaperImportDetail {
  pinId: string;
  status: "ok" | "skipped" | "error";
  error?: string;
  wallpaperId?: string;
}

export interface WallpaperImportResult {
  sourceId: string;
  sourceName: string;
  processed: number;
  created: number;
  skipped: number;
  errors: number;
  details: WallpaperImportDetail[];
}

export interface ProcessWallpaperOptions {
  sourceId?: string; // run only this source; otherwise all active+due sources
  force?: boolean; // ignore the lastRunAt schedule check
  invokingUser?: { id: string; email: string };
}

// A scheduled run imports a batch at once, so it sends ONE "new wallpapers"
// push per run (pointing at the newest), not one per wallpaper — avoids
// notification spam while still alerting users that fresh wallpapers landed.

/** Resolve which user owns auto-imported wallpapers (admin / system bot). */
async function resolveUploader(invokingUser?: { id: string; email: string }) {
  if (invokingUser) {
    return prisma.user.upsert({
      where: { id: invokingUser.id },
      update: { email: invokingUser.email },
      create: { id: invokingUser.id, email: invokingUser.email, role: "ADMIN" },
    });
  }
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (admin) return admin;
  const any = await prisma.user.findFirst();
  if (any) return any;
  return prisma.user.create({
    data: { email: "system.bot@mugenanime.local", role: "ADMIN" },
  });
}

/** Keep only pins matching the source's desired media type. */
function matchesMediaType(pin: PinSearchResult, mediaType: string): boolean {
  if (mediaType === "video") return pin.isVideo;
  if (mediaType === "both") return true;
  return !pin.isVideo; // default: image
}

export async function processWallpaperSources(
  opts: ProcessWallpaperOptions = {},
): Promise<WallpaperImportResult[]> {
  const uploader = await resolveUploader(opts.invokingUser);
  const now = new Date();

  const sources = opts.sourceId
    ? await prisma.wallpaperSource.findMany({ where: { id: opts.sourceId } })
    : await prisma.wallpaperSource.findMany({ where: { isActive: true } });

  const results: WallpaperImportResult[] = [];

  for (const source of sources) {
    const result: WallpaperImportResult = {
      sourceId: source.id,
      sourceName: source.name,
      processed: 0,
      created: 0,
      skipped: 0,
      errors: 0,
      details: [],
    };

    // Honour the per-source schedule unless forced (manual "Run Now").
    if (!opts.force && source.lastRunAt) {
      const nextRun = new Date(source.lastRunAt.getTime() + source.scheduleMinutes * 60_000);
      if (nextRun > now) {
        results.push(result);
        continue;
      }
    }

    const tagIds = await resolveTagIds(
      (source.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean),
    );

    // 1. Search — overfetch so dedup + media filtering still leaves enough.
    let candidates: PinSearchResult[] = [];
    try {
      const { results: found } = await searchPins(source.query, {
        limit: Math.min(source.maxItems * 4, 50),
      });
      candidates = found.filter((p) => matchesMediaType(p, source.mediaType));
    } catch (e) {
      result.errors++;
      result.details.push({ pinId: "__search__", status: "error", error: String(e) });
      results.push(result);
      continue;
    }

    // 2. Dedup against already-imported pinIds.
    const pinIds = candidates.map((c) => c.pinId);
    const already = await prisma.wallpaper.findMany({
      where: { sourceId: { in: pinIds } },
      select: { sourceId: true },
    });
    const seen = new Set(already.map((w) => w.sourceId));

    // The newest wallpaper created this run — used for a single batch push.
    let firstCreated: { id: string; title: string; fileUrl: string; type: "IMAGE" | "VIDEO" } | null = null;

    // 3. Import the first N new pins.
    for (const pin of candidates) {
      if (result.created >= source.maxItems) break;
      result.processed++;

      if (seen.has(pin.pinId)) {
        result.skipped++;
        result.details.push({ pinId: pin.pinId, status: "skipped" });
        continue;
      }

      try {
        const media = await extractBestMedia(pin.pinUrl);
        const { url: fileUrl, actualType } = await resolveMediaUrl(media);

        const wallpaper = await prisma.wallpaper.create({
          data: {
            title: (pin.title || media.title || "Anime Wallpaper").slice(0, 200),
            fileUrl,
            type: actualType,
            uploaderId: uploader.id,
            sourceId: pin.pinId,
            ...(source.categoryId ? { categories: { connect: [{ id: source.categoryId }] } } : {}),
            ...(tagIds.length ? { tags: { connect: tagIds.map((id) => ({ id })) } } : {}),
          },
          select: { id: true, title: true, fileUrl: true, type: true },
        });

        result.created++;
        if (!firstCreated) firstCreated = wallpaper;
        result.details.push({ pinId: pin.pinId, status: "ok", wallpaperId: wallpaper.id });
      } catch (e) {
        // Unique-constraint race on sourceId → treat as an already-imported skip.
        const msg = e instanceof Error ? e.message : String(e);
        if (/Unique constraint|P2002/.test(msg)) {
          result.skipped++;
          result.details.push({ pinId: pin.pinId, status: "skipped" });
        } else {
          result.errors++;
          result.details.push({ pinId: pin.pinId, status: "error", error: msg });
        }
      }
    }

    // 4. One push per run for the batch (newest wallpaper), if enabled.
    if (source.notify && firstCreated) {
      const wp = firstCreated;
      import("@/lib/push-notifications")
        .then(({ sendWallpaperNotification }) =>
          sendWallpaperNotification({
            id: wp.id,
            title: wp.title,
            fileUrl: absolutizeUrl(wp.fileUrl) ?? wp.fileUrl,
            type: wp.type,
          }).catch(() => {}),
        )
        .catch(() => {});
    }

    // 5. Stamp the run.
    await prisma.wallpaperSource.update({
      where: { id: source.id },
      data: {
        lastRunAt: now,
        totalImported: { increment: result.created },
      },
    });

    results.push(result);
  }

  return results;
}
