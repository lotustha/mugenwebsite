// Seed (or update) the "Word Bloom" app row so its privacy policy is live at
// /apps/wordpuzzel/privacy-policy.
//
// Usage (on the VPS, from the project root):
//   node scripts/seed-wordpuzzel-app.mjs
//
// Idempotent: re-running updates the existing row (matched by slug) rather than
// creating a duplicate. Follows the same direct-`pg` pattern as create-admin.mjs.

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
const TAGLINE = "Swipe letters. Find every word.";
const CATEGORY = "Word";
const DESCRIPTION =
  "Word Bloom is a relaxing word-connect puzzle with 100 handcrafted levels, " +
  "daily rewards, and a gorgeous twilight design. Swipe across the letter wheel " +
  "to connect words and fill the board.";

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
device. The main data sharing that occurs is with our advertising partner
(Google AdMob), so we can show ads that keep the game free, and with the app
store when you make an optional purchase.

2. INFORMATION WE HANDLE
Stored on your device (not sent to us): your current level, coin balance,
daily-reward streak, and audio/haptics settings. This is removed when you
uninstall the app.

Collected automatically by our ad and store partners:
- Advertising identifiers (e.g. Google Advertising ID), device information
  (model, OS version, language, coarse region), IP address, and ad-interaction
  data — used by Google AdMob to serve and measure ads.
- Purchase records — if you buy something, the app store (Google Play or Apple)
  processes the transaction and tells the app whether it succeeded. We never
  receive or store your payment card details.

We ourselves do not collect your name, email, contacts, photos, precise
location, or any similar personal data, and we do not run our own analytics or
tracking servers.

3. ADVERTISING (GOOGLE ADMOB)
${NAME} displays banner, interstitial, and rewarded ads through Google AdMob. To
do this, AdMob and its partners may collect the identifiers and device data
described above to serve ads, limit repetition, and measure performance.

Where required (for example in the EEA, UK, and Switzerland), we show Google's
consent request the first time you open the app, letting you choose between
personalized and non-personalized ads. You can change this choice any time from
Settings -> Privacy options inside the game. You can also limit ad
personalization at the device level (Reset advertising ID / Opt out of Ads
Personalization on Android, or Limit Ad Tracking on iOS). For details, see
Google's Privacy & Terms at https://policies.google.com/technologies/partner-sites.

4. IN-APP PURCHASES
The game offers optional purchases such as "Remove Ads" and coin packs. These
are handled entirely by Google Play Billing or the Apple App Store, and their
privacy policies apply to that transaction. The app only learns whether a
purchase completed so it can unlock the corresponding item.

5. CHILDREN'S PRIVACY
${NAME} is intended for a general audience and is not directed to children under
13 (or the equivalent minimum age in your country). We do not knowingly collect
personal information from children.

6. YOUR PRIVACY RIGHTS
Depending on where you live (e.g. under the EU/UK GDPR or the California
CCPA/CPRA), you may have rights to access, correct, or delete personal data.
Because we store no personal data on our own servers, you can exercise the main
controls directly:
- Change ad consent: Settings -> Privacy options in the game.
- Delete local data: uninstalling the app removes all progress and settings.
- Ad identifier: reset or opt out via your device settings.
For any other privacy request, email us at ${CONTACT_EMAIL}.

7. THIRD-PARTY SERVICES
- Google AdMob & Google User Messaging Platform — https://policies.google.com/privacy
- Google Play Billing — https://policies.google.com/privacy
- Apple App Store (iOS) — https://www.apple.com/legal/privacy/

8. DATA RETENTION & SECURITY
Game data lives on your device for as long as the app is installed and is
deleted when you uninstall. Data handled by our partners is retained according
to their policies. While no method of transmission is 100% secure, we and our
partners use industry-standard safeguards.

9. CHANGES TO THIS POLICY
We may update this policy from time to time. Material changes will be reflected
by updating the "Last updated" date above.

10. CONTACT US
Questions about this policy or your data? Email ${CONTACT_EMAIL}.`;

const PLAY_URL = `https://play.google.com/store/apps/details?id=${PACKAGE}`;

const { default: pg } = await import("pg");
const client = new pg.Client({ connectionString: dbUrl });
await client.connect();

try {
  const id = randomUUID();
  const upsert = `
    INSERT INTO public.apps
      (id, slug, name, tagline, description, category, package_name,
       privacy_policy, version, published, featured, created_at, updated_at)
    VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, false, NOW(), NOW())
    ON CONFLICT (slug) DO UPDATE SET
      name          = EXCLUDED.name,
      tagline       = EXCLUDED.tagline,
      description   = EXCLUDED.description,
      category      = EXCLUDED.category,
      package_name  = EXCLUDED.package_name,
      privacy_policy= EXCLUDED.privacy_policy,
      version       = EXCLUDED.version,
      published     = true,
      updated_at    = NOW()
    RETURNING id, slug, name
  `;
  const { rows } = await client.query(upsert, [
    id, SLUG, NAME, TAGLINE, DESCRIPTION, CATEGORY, PACKAGE, PRIVACY_POLICY, VERSION,
  ]);
  const app = rows[0];
  console.log(`App ready: ${app.name} (slug "${app.slug}", id ${app.id})`);

  // Ensure a Play Store download link exists (id has no DB default → supply it).
  const linkSql = `
    INSERT INTO public.app_links (id, app_id, platform, url)
    SELECT $1, $2, 'PlayStore', $3
    WHERE NOT EXISTS (
      SELECT 1 FROM public.app_links WHERE app_id = $2 AND platform = 'PlayStore'
    )
  `;
  await client.query(linkSql, [randomUUID(), app.id, PLAY_URL]);
  console.log(`Privacy policy live at: /apps/${SLUG}/privacy-policy`);
} catch (e) {
  console.error("Seed failed:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
