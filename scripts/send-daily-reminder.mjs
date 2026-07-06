// Broadcast a "daily reward" reminder push to all Word Bloom devices that
// subscribed to the `daily_reminder` FCM topic (the app subscribes on launch).
//
// Usage (on the VPS, from the project root):
//   node scripts/send-daily-reminder.mjs
//   WORDPUZZEL_ADMIN_KEY=/path/to/key.json node scripts/send-daily-reminder.mjs
//
// Intended to run once a day via cron. Uses a SEPARATE Firebase app initialized
// with the Word Bloom (wordpuzzel-457a6) service-account key — kept off the web
// root and out of git.

import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

const keyPath =
  process.env.WORDPUZZEL_ADMIN_KEY || "/root/wordpuzzel-adminsdk.json";

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(keyPath, "utf8"));
} catch (e) {
  console.error(`Could not read service-account key at ${keyPath}: ${e.message}`);
  process.exit(1);
}

const app = initializeApp({ credential: cert(serviceAccount) }, "wordpuzzel");

// Rotate a few friendly messages so the reminder isn't identical every day.
const messages = [
  { title: "🌸 Your daily gift is ready!", body: "Claim your Word Bloom reward and keep your streak alive." },
  { title: "🎁 Word Bloom", body: "Today's coins are waiting — tap to collect and play a level." },
  { title: "🔤 A fresh puzzle awaits", body: "Swipe a few words and grab your daily reward in Word Bloom." },
];
const idx = Math.floor(Date.now() / 86_400_000) % messages.length;
const msg = messages[idx];

try {
  const id = await getMessaging(app).send({
    topic: "daily_reminder",
    notification: { title: msg.title, body: msg.body },
    android: {
      priority: "high",
      notification: { channelId: "daily_reminders", sound: "default" },
    },
  });
  console.log(`Sent daily reminder (${id}) — "${msg.title}"`);
} catch (e) {
  console.error("Send failed:", e.message);
  process.exitCode = 1;
}
