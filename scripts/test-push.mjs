/**
 * Local FCM test-send. Verifies a device subscribed to a topic actually
 * receives a push, independent of the website deploy.
 *
 * Usage:
 *   node scripts/test-push.mjs episode
 *   node scripts/test-push.mjs post
 *   node scripts/test-push.mjs wallpaper
 *
 * Reads credentials from firebase-admin.json at the repo root.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import admin from "firebase-admin";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sa = JSON.parse(readFileSync(join(__dirname, "..", "firebase-admin.json"), "utf8"));

admin.initializeApp({ credential: admin.credential.cert(sa) });

const kind = process.argv[2] || "episode";

const payloads = {
  episode: {
    topic: "new_episodes",
    notification: { title: "🆕 New Episode (TEST)", body: "One Piece — Episode 1168 (Sub) is out" },
    data: {
      type: "episode",
      id: "one-piece-odmau",
      title: "One Piece",
      episode: "1168",
      audio: "sub",
      deepLink: "mugenstream://anime/one-piece-odmau",
      clickAction: "FLUTTER_NOTIFICATION_CLICK",
    },
    android: { priority: "high", notification: { channelId: "episodes", clickAction: "FLUTTER_NOTIFICATION_CLICK" } },
  },
  post: {
    topic: "new_posts",
    notification: { title: "📰 New Article (TEST)", body: "Attack on Titan retrospective" },
    data: {
      type: "post",
      id: "test-id",
      slug: "attack-on-titan-retrospective",
      deepLink: "mugenstream://post/attack-on-titan-retrospective",
      clickAction: "FLUTTER_NOTIFICATION_CLICK",
    },
    android: { priority: "high", notification: { channelId: "posts", clickAction: "FLUTTER_NOTIFICATION_CLICK" } },
  },
  wallpaper: {
    topic: "new_wallpapers",
    notification: { title: "🖼️ New Wallpaper (TEST)", body: "Demon Slayer 4K" },
    data: {
      type: "wallpaper",
      id: "00000000-0000-0000-0000-000000000000",
      deepLink: "mugenstream://wallpaper/00000000-0000-0000-0000-000000000000",
      clickAction: "FLUTTER_NOTIFICATION_CLICK",
    },
    android: { priority: "high", notification: { channelId: "wallpapers", clickAction: "FLUTTER_NOTIFICATION_CLICK" } },
  },
};

const msg = payloads[kind];
if (!msg) {
  console.error(`Unknown kind "${kind}". Use: episode | post | wallpaper`);
  process.exit(1);
}

admin
  .messaging()
  .send(msg)
  .then((id) => {
    console.log(`✅ Sent ${kind} to topic "${msg.topic}". messageId=${id}`);
    process.exit(0);
  })
  .catch((e) => {
    console.error("❌ Send failed:", e.message);
    process.exit(1);
  });
