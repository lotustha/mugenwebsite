import { prisma } from "@/lib/prisma";
import { OFFICIAL_USERNAME } from "@/lib/social-client";

export { OFFICIAL_USERNAME };

const SETTING_KEY = "social_official_user_id";
let cached: string | null = null;

/**
 * Find-or-create the official @mugenanime system account and return its id.
 * It owns auto-generated posts (new wallpapers, announcements) and everyone is
 * force-followed to it. Cached in-process and in SystemSetting.
 */
export async function getOfficialUserId(): Promise<string> {
  if (cached) return cached;
  const setting = await prisma.systemSetting.findUnique({ where: { key: SETTING_KEY } }).catch(() => null);
  if (setting?.value) {
    cached = setting.value;
    return cached;
  }
  let user = await prisma.user.findUnique({ where: { username: OFFICIAL_USERNAME }, select: { id: true } });
  if (!user) {
    user = await prisma.user
      .create({
        data: {
          email: "official@mugenstream.fun",
          username: OFFICIAL_USERNAME,
          displayName: "MugenAnime",
          bio: "Official MugenAnime — new wallpapers, anime drops & announcements. Start the discussion!",
          verified: true,
          role: "USER",
        },
        select: { id: true },
      })
      .catch(() => prisma.user.findUnique({ where: { username: OFFICIAL_USERNAME }, select: { id: true } }));
  }
  if (!user) throw new Error("Could not resolve official account");
  await prisma.systemSetting
    .upsert({ where: { key: SETTING_KEY }, create: { key: SETTING_KEY, value: user.id }, update: { value: user.id } })
    .catch(() => {});
  cached = user.id;
  return cached;
}

/** Force a user to follow the official account (idempotent; everybody follows the website). */
export async function ensureFollowsOfficial(userId: string): Promise<void> {
  try {
    const officialId = await getOfficialUserId();
    if (userId === officialId) return;
    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: userId, followingId: officialId } },
      select: { id: true },
    });
    if (!existing) await prisma.follow.create({ data: { followerId: userId, followingId: officialId } });
  } catch {
    /* best-effort */
  }
}

/** Auto-post a featured wallpaper to the feed as the official account. */
export async function postWallpaperAnnouncement(w: {
  title: string;
  fileUrl: string;
  type: string;
  animeTag?: string | null;
}): Promise<void> {
  try {
    const officialId = await getOfficialUserId();
    const isVideo = w.type === "VIDEO";
    await prisma.socialPost.create({
      data: {
        authorId: officialId,
        type: isVideo ? "VIDEO" : "IMAGE",
        status: "READY",
        visibility: "PUBLIC",
        caption: `New ${isVideo ? "live wallpaper" : "wallpaper"}: ${w.title} ✨ What do you think — start the discussion!`,
        animeTag: w.animeTag?.trim() || null,
        mediaUrl: w.fileUrl,
      },
    });
  } catch {
    /* best-effort — never block the wallpaper upload */
  }
}
