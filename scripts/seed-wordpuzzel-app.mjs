// Seed (or fully update) the "Word Bloom" app entry — description, icon,
// screenshots, download links (Play Store + direct APK), and privacy policy —
// so /apps/wordpuzzel and /apps/wordpuzzel/privacy-policy are complete.
//
// Usage (on the VPS, from the project root):
//   node scripts/seed-wordpuzzel-app.mjs
//
// Idempotent: upserts the app by slug, and replaces its screenshots/links each
// run. Direct-`pg` pattern matching create-admin.mjs. Assets are expected under
//   /www/wwwroot/mugenstream.fun/uploads/apps/wordpuzzel/...
// served at /uploads/apps/wordpuzzel/...

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";

function loadEnvFile(file) {
  try {
    const raw = readFileSync(resolve(process.cwd(), file), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!m) continue;
      const [, k, vRaw] = m;
      if (process.env[k]) continue;
      let v = vRaw.trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      process.env[k] = v;
    }
  } catch {
    /* file may not exist */
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL is not set in .env or .env.local");
  process.exit(1);
}

const SLUG = "wordpuzzel";
const NAME = "Word Bloom";
const PACKAGE = "com.allthemyth.word_puzzle";
const VERSION = "1.0.0";
const SIZE = "57 MB";
const TAGLINE = "Swipe letters. Find every word.";
const CATEGORY = "Word";
const ICON_URL = "/uploads/apps/wordpuzzel/icon.png";
const APK_URL = "/uploads/apps/wordpuzzel/word-bloom-v1.0.0.apk";
const PLAY_URL = `https://play.google.com/store/apps/details?id=${PACKAGE}`;

const DESCRIPTION =
  "Word Bloom is a relaxing word-connect puzzle wrapped in a gorgeous " +
  "twilight world. Swipe across the letter wheel to connect words and fill " +
  "the board across 100 handcrafted levels — from quick 3-letter warm-ups to " +
  "meaty 7-letter brain-teasers.\n\n" +
  "• 100 handcrafted, always-solvable levels\n" +
  "• Daily rewards with a 7-day coin streak\n" +
  "• Bonus words for extra coins, and hints when you're stuck\n" +
  "• Calm design with gentle music, sound, and haptics\n" +
  "• Play offline, no account needed — remove ads any time\n\n" +
  "Perfect for a five-minute break or a long, cozy session.";

const SHOTS = [
  { url: "/uploads/apps/wordpuzzel/screens/play.png", caption: "Swipe to connect words" },
  { url: "/uploads/apps/wordpuzzel/screens/home.png", caption: "100 levels to play" },
  { url: "/uploads/apps/wordpuzzel/screens/daily.png", caption: "Daily rewards & streaks" },
  { url: "/uploads/apps/wordpuzzel/screens/complete.png", caption: "Celebrate every win" },
  { url: "/uploads/apps/wordpuzzel/screens/settings.png", caption: "Make it yours" },
];

const EFFECTIVE_DATE = "July 6, 2026";
const CONTACT_EMAIL = "allthemyth@gmail.com";

const PRIVACY_POLICY = `PRIVACY POLICY — ${NAME}
Last updated: ${EFFECTIVE_DATE}

${NAME} is a free mobile game. This policy explains what information the app
handles, why, and the choices you have. We designed ${NAME} to need as little of
your data as possible — there are no accounts and no sign-in.

1. OVERVIEW
${NAME} does not require you to create an account or provide any personal
information to play. Your game progress and settings are stored only on your
device. Data leaves the app only for advertising (Google AdMob), anonymous
analytics and push notifications (Google/Firebase), and optional purchases
(the app store).

2. INFORMATION WE HANDLE
Stored on your device (not sent to us): your current level, coin balance,
daily-reward streak, and audio/haptics settings. This is removed when you
uninstall the app.

Collected automatically by our service providers:
- Advertising identifiers (e.g. Google Advertising ID), device information
  (model, OS version, language, coarse region), IP address, and ad-interaction
  data — used by Google AdMob to serve and measure ads.
- Anonymous analytics: we use Google Analytics for Firebase to understand
  aggregate, non-identifying usage (levels played, features used, ad
  performance) so we can improve the game. This may include a device-generated
  app-instance ID and general device/usage information. It does not identify
  you personally.
- A push-notification token (Firebase Cloud Messaging) if you allow
  notifications, so we can send optional reminders such as your daily reward.
- Purchase records — if you buy something, the app store (Google Play or Apple)
  processes the transaction and tells the app whether it succeeded. We never
  receive or store your payment card details.

We do not collect your name, email, contacts, photos, or precise location, and
we do not operate our own tracking servers.

3. ADVERTISING (GOOGLE ADMOB)
${NAME} displays banner, interstitial, and rewarded ads through Google AdMob.
Where required (for example in the EEA, UK, and Switzerland), we show Google's
consent request the first time you open the app, letting you choose between
personalized and non-personalized ads. You can change this any time from
Settings -> Privacy options inside the game, or limit ad personalization at the
device level (Reset advertising ID / Opt out of Ads Personalization on Android,
Limit Ad Tracking on iOS). See https://policies.google.com/technologies/partner-sites.

4. NOTIFICATIONS
With your permission, we may send optional push notifications — such as a
daily-reward reminder — via Firebase Cloud Messaging. You can turn these off any
time in your device's notification settings.

5. IN-APP PURCHASES
Optional purchases such as "Remove Ads" and coin packs are handled entirely by
Google Play Billing or the Apple App Store, whose privacy policies apply. The
app only learns whether a purchase completed so it can unlock the item.

6. CHILDREN'S PRIVACY
${NAME} is intended for a general audience and is not directed to children under
13 (or the equivalent minimum age in your country). We do not knowingly collect
personal information from children.

7. YOUR PRIVACY RIGHTS
Depending on where you live (e.g. under the EU/UK GDPR or the California
CCPA/CPRA), you may have rights to access, correct, or delete personal data.
Because we store no personal data on our own servers, you can exercise the main
controls directly:
- Change ad consent: Settings -> Privacy options in the game.
- Turn off notifications: your device notification settings.
- Delete local data: uninstalling the app removes all progress and settings.
- Ad identifier: reset or opt out via your device settings.
For any other request, email us at ${CONTACT_EMAIL}.

8. THIRD-PARTY SERVICES
- Google AdMob & Google User Messaging Platform — https://policies.google.com/privacy
- Google Analytics for Firebase & Firebase Cloud Messaging — https://firebase.google.com/support/privacy
- Google Play Billing — https://policies.google.com/privacy
- Apple App Store (iOS) — https://www.apple.com/legal/privacy/

9. DATA RETENTION & SECURITY
Game data lives on your device until you uninstall. Data handled by our
providers is retained per their policies. No method of transmission is 100%
secure, but we and our providers use industry-standard safeguards.

10. CHANGES TO THIS POLICY
We may update this policy from time to time; material changes are reflected by
the "Last updated" date above.

11. CONTACT US
Questions about this policy or your data? Email ${CONTACT_EMAIL}.`;

const { default: pg } = await import("pg");
const client = new pg.Client({ connectionString: dbUrl });
await client.connect();

try {
  const id = randomUUID();
  const upsert = `
    INSERT INTO public.apps
      (id, slug, name, tagline, description, category, icon_url, package_name,
       privacy_policy, version, size, published, featured, created_at, updated_at)
    VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, true, false, NOW(), NOW())
    ON CONFLICT (slug) DO UPDATE SET
      name          = EXCLUDED.name,
      tagline       = EXCLUDED.tagline,
      description    = EXCLUDED.description,
      category      = EXCLUDED.category,
      icon_url      = EXCLUDED.icon_url,
      package_name  = EXCLUDED.package_name,
      privacy_policy= EXCLUDED.privacy_policy,
      version       = EXCLUDED.version,
      size          = EXCLUDED.size,
      published     = true,
      updated_at    = NOW()
    RETURNING id, slug, name
  `;
  const { rows } = await client.query(upsert, [
    id, SLUG, NAME, TAGLINE, DESCRIPTION, CATEGORY, ICON_URL, PACKAGE,
    PRIVACY_POLICY, VERSION, SIZE,
  ]);
  const app = rows[0];
  console.log(`App upserted: ${app.name} (slug "${app.slug}", id ${app.id})`);

  // Replace screenshots.
  await client.query(`DELETE FROM public.app_screenshots WHERE app_id = $1`, [app.id]);
  for (let i = 0; i < SHOTS.length; i++) {
    await client.query(
      `INSERT INTO public.app_screenshots (id, app_id, url, caption, "order")
       VALUES ($1,$2,$3,$4,$5)`,
      [randomUUID(), app.id, SHOTS[i].url, SHOTS[i].caption, i],
    );
  }
  console.log(`Screenshots: ${SHOTS.length}`);

  // Ensure download links (Play Store + direct APK), idempotently.
  const ensureLink = async (platform, url) => {
    const { rowCount } = await client.query(
      `UPDATE public.app_links SET url = $3 WHERE app_id = $1 AND platform = $2`,
      [app.id, platform, url],
    );
    if (rowCount === 0) {
      await client.query(
        `INSERT INTO public.app_links (id, app_id, platform, url) VALUES ($1,$2,$3,$4)`,
        [randomUUID(), app.id, platform, url],
      );
    }
  };
  await ensureLink("PlayStore", PLAY_URL);
  await ensureLink("APK", APK_URL);
  console.log(`Links: PlayStore + APK`);
  console.log(`Live: /apps/${SLUG}  ·  /apps/${SLUG}/privacy-policy`);
} catch (e) {
  console.error("Seed failed:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
