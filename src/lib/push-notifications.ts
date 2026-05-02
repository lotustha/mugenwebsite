/**
 * Firebase Cloud Messaging helpers.
 *
 * Topic strategy (no token storage needed on server):
 *   Flutter app subscribes to → "new_posts" | "new_wallpapers" | "all"
 *
 * Notification data payload drives deep-link routing in Flutter:
 *   type: "post" | "wallpaper" | "app"
 *   id / slug: used to navigate to the correct screen
 */

import admin from "./firebase-admin";

type NotifResult = { success: true; messageId: string } | { success: false; error: string };

// ─── Post notification ──────────────────────────────────────────────────────
export async function sendPostNotification(post: {
  id: string;
  slug: string;
  title: string;
  summary?: string | null;
  featuredImage?: string | null;
}): Promise<NotifResult> {
  if (!admin.apps.length) return { success: false, error: "Firebase not configured" };

  try {
    const messageId = await admin.messaging().send({
      topic: "new_posts",
      notification: {
        title: "📰 New Article",
        body:  post.title,
        ...(post.featuredImage ? { imageUrl: post.featuredImage } : {}),
      },
      data: {
        type:    "post",
        id:      post.id,
        slug:    post.slug,
        title:   post.title,
        summary: post.summary ?? "",
        image:   post.featuredImage ?? "",
        // Deep link: mugenanime://post/{slug}
        deepLink: `mugenanime://post/${post.slug}`,
        clickAction: "FLUTTER_NOTIFICATION_CLICK",
      },
      android: {
        priority: "high",
        notification: {
          channelId: "posts",
          ...(post.featuredImage ? { imageUrl: post.featuredImage } : {}),
          clickAction: "FLUTTER_NOTIFICATION_CLICK",
        },
      },
      apns: {
        payload: { aps: { contentAvailable: true, sound: "default" } },
      },
    });
    return { success: true, messageId };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ─── Wallpaper notification ─────────────────────────────────────────────────
export async function sendWallpaperNotification(wallpaper: {
  id: string;
  title: string;
  fileUrl: string;
  type: "IMAGE" | "VIDEO" | string;
  description?: string | null;
}): Promise<NotifResult> {
  if (!admin.apps.length) return { success: false, error: "Firebase not configured" };

  const isLive = wallpaper.type === "VIDEO";
  const image  = isLive ? null : wallpaper.fileUrl; // don't use video as notification image

  try {
    const messageId = await admin.messaging().send({
      topic: "new_wallpapers",
      notification: {
        title: isLive ? "🎬 New Live Wallpaper" : "🖼️ New Wallpaper",
        body:  wallpaper.title,
        ...(image ? { imageUrl: image } : {}),
      },
      data: {
        type:        "wallpaper",
        id:          wallpaper.id,
        title:       wallpaper.title,
        wallpaperType: wallpaper.type,
        image:       wallpaper.fileUrl,
        description: wallpaper.description ?? "",
        // Deep link: mugenanime://wallpaper/{id}
        deepLink:    `mugenanime://wallpaper/${wallpaper.id}`,
        clickAction: "FLUTTER_NOTIFICATION_CLICK",
      },
      android: {
        priority: "high",
        notification: {
          channelId: "wallpapers",
          ...(image ? { imageUrl: image } : {}),
          clickAction: "FLUTTER_NOTIFICATION_CLICK",
        },
      },
      apns: {
        payload: { aps: { contentAvailable: true, sound: "default" } },
      },
    });
    return { success: true, messageId };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ─── Generic broadcast (admin manual send) ──────────────────────────────────
export async function sendBroadcast(opts: {
  topic: string;
  title: string;
  body: string;
  imageUrl?: string;
  data?: Record<string, string>;
}): Promise<NotifResult> {
  if (!admin.apps.length) return { success: false, error: "Firebase not configured" };

  try {
    const messageId = await admin.messaging().send({
      topic: opts.topic,
      notification: {
        title:    opts.title,
        body:     opts.body,
        ...(opts.imageUrl ? { imageUrl: opts.imageUrl } : {}),
      },
      data: opts.data ?? {},
      android: {
        priority: "high",
        notification: {
          channelId: "general",
          clickAction: "FLUTTER_NOTIFICATION_CLICK",
        },
      },
      apns: {
        payload: { aps: { contentAvailable: true, sound: "default" } },
      },
    });
    return { success: true, messageId };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ─── Token-based send (individual device) ──────────────────────────────────
export async function sendToToken(token: string, opts: {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}): Promise<NotifResult> {
  if (!admin.apps.length) return { success: false, error: "Firebase not configured" };

  try {
    const messageId = await admin.messaging().send({
      token,
      notification: { title: opts.title, body: opts.body, ...(opts.imageUrl ? { imageUrl: opts.imageUrl } : {}) },
      data: opts.data ?? {},
      android: { priority: "high", notification: { channelId: "general", clickAction: "FLUTTER_NOTIFICATION_CLICK" } },
      apns: { payload: { aps: { contentAvailable: true, sound: "default" } } },
    });
    return { success: true, messageId };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}
