// Seed a curated set of anime news sources into rss_feeds.
//
// Usage:
//   npm run seed-news-sources
//
// Skips any source whose URL already exists. Safe to re-run.
//
// Edit the SOURCES array below to add/remove feeds before running.
// Verify URLs work in your browser — RSS endpoints sometimes get deprecated.

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

// ─── Sources to seed ──────────────────────────────────────────────────────────
//
// sourceType:
//   RSS        → url is an RSS/Atom XML endpoint
//   AI_SCRAPE  → url is a regular webpage; AI extracts the latest articles
//
// scheduleMinutes:
//   180 (every 3 hrs) × ~3 active feeds ≫ 2 new posts per day target
//
// autoPublish: true means new posts go live immediately (no manual approval).

const SOURCES = [
  // ── Verified RSS feeds ───────────────────────────────────────────────────
  {
    name: "Anime News Network — All",
    url: "https://www.animenewsnetwork.com/all/rss.xml",
    sourceType: "RSS",
    scheduleMinutes: 180,
    maxItems: 3,
    autoPublish: true,
    isActive: true,
  },
  {
    name: "Anime News Network — Reviews",
    url: "https://www.animenewsnetwork.com/all-reviews/rss.xml?ann-edition=w",
    sourceType: "RSS",
    scheduleMinutes: 360,
    maxItems: 3,
    autoPublish: true,
    isActive: true,
  },

  // ── AI-scraped sources (no reliable RSS — AI reads the page) ─────────────
  //
  // ⚠️ These big sites sit behind Cloudflare-style bot protection. Plain
  // server-side fetch may 403. Both seeded as INACTIVE — turn one on in the
  // admin UI, hit "Run Now", and confirm it works before relying on it.
  //
  // Edit/replace these URLs with your own preferred sites (blogs, smaller
  // anime news sites) which usually have no bot protection.
  {
    name: "Crunchyroll News (AI Scrape)",
    url: "https://www.crunchyroll.com/news",
    sourceType: "AI_SCRAPE",
    scheduleMinutes: 240,
    maxItems: 3,
    autoPublish: true,
    isActive: false,
  },
  {
    name: "MyAnimeList News (AI Scrape)",
    url: "https://myanimelist.net/news",
    sourceType: "AI_SCRAPE",
    scheduleMinutes: 360,
    maxItems: 3,
    autoPublish: true,
    isActive: false,
  },
];

const { default: pg } = await import("pg");

const client = new pg.Client({ connectionString: dbUrl });
await client.connect();

try {
  let inserted = 0;
  let skipped = 0;
  for (const s of SOURCES) {
    const existing = await client.query(
      "SELECT id FROM public.rss_feeds WHERE url = $1 LIMIT 1",
      [s.url],
    );
    if (existing.rowCount > 0) {
      console.log(`  · skip (already present): ${s.name}`);
      skipped++;
      continue;
    }
    const id = randomUUID();
    // Postgres auto-coerces a text parameter into the enum column type as long
    // as the value matches an enum label, so no explicit cast is needed.
    await client.query(
      `INSERT INTO public.rss_feeds
         (id, name, url, source_type, max_items,
          schedule_minutes, is_active, auto_publish,
          created_at, updated_at)
       VALUES
         ($1, $2, $3, $4, $5,
          $6, $7, $8,
          NOW(), NOW())`,
      [
        id,
        s.name,
        s.url,
        s.sourceType,
        s.maxItems,
        s.scheduleMinutes,
        s.isActive,
        s.autoPublish,
      ],
    );
    console.log(`  ✓ added ${s.sourceType.padEnd(10)} ${s.name}`);
    inserted++;
  }
  console.log(`\nDone — ${inserted} inserted, ${skipped} skipped.`);
  console.log("\nNext steps:");
  console.log("  1. In admin → Settings, set an AI API key (Gemini or OpenRouter).");
  console.log("  2. In admin → RSS, toggle Background Scheduler ON (or set up VPS crontab).");
  console.log("  3. Click Run Now on a feed to verify it produces a post.");
} catch (e) {
  console.error("Failed to seed sources:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
