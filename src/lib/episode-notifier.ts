/**
 * New-anime-episode notifier.
 *
 * Polls the anizen `new-releases` + `recent-episodes` feeds, compares each
 * anime's current sub/dub episode counts against the last-seen counts stored in
 * `AnimeEpisodeSeen`, and fires one FCM push per newly-available episode to the
 * `new_episodes` topic.
 *
 * First run seeds the table silently (system setting `episode_notifier_seeded`)
 * so we don't back-fill a push for every anime in the catalogue.
 *
 * Called from:
 *   - the in-process cron scheduler tick (src/lib/cron-scheduler.ts)
 *   - GET /api/cron/anime-episodes (external scheduler / manual trigger)
 */

import { prisma } from "./prisma";
import { fetchWithTimeout } from "./fetcher";
import { sendEpisodeNotification } from "./push-notifications";

const SEED_KEY = "episode_notifier_seeded";
const MAX_SENDS_PER_RUN = 25; // safety cap so a feed surge can't flood every device

// Shared secret for the API's POST /admin/cache/purge endpoint. When a new
// episode is detected we bust that anime's cached `info` payload so the app
// shows the new episode immediately instead of waiting out the API's 3-day TTL.
const CACHE_ADMIN_TOKEN = process.env.CACHE_ADMIN_TOKEN || "";

/**
 * Derive the API root + provider from ANIME_API_BASE
 * (e.g. https://api.mugenstream.fun/anime/anikoto → root + "anikoto").
 */
function purgeTarget(base: string): { url: string; provider: string } | null {
  try {
    const u = new URL(base);
    const provider = u.pathname.split("/").filter(Boolean).pop() || "";
    if (!provider) return null;
    return { url: `${u.origin}/admin/cache/purge`, provider };
  } catch {
    return null;
  }
}

/**
 * Best-effort: tell the API to drop `<provider>:info:<animeId>` so the next
 * /info request re-scrapes and picks up the new episode. Never throws — if the
 * purge fails the cache still self-heals when its TTL expires.
 */
async function purgeInfoCache(base: string, animeId: string): Promise<void> {
  if (!CACHE_ADMIN_TOKEN) return; // endpoint/secret not configured → skip
  const target = purgeTarget(base);
  if (!target) return;
  const key = `${target.provider}:info:${animeId}`;
  try {
    await fetchWithTimeout(`${target.url}?key=${encodeURIComponent(key)}`, {
      method: "POST",
      timeout: 8000,
      cache: "no-store",
      headers: { "x-admin-token": CACHE_ADMIN_TOKEN },
    });
  } catch {
    // ignore — TTL expiry is the fallback
  }
}

type FeedItem = {
  id: string;
  title: string;
  image?: string | null;
  sub?: number;
  dub?: number;
  episodes?: number;
};

export type EpisodeNotifierResult = {
  ok: boolean;
  seeded: boolean;       // true if this run was the initial silent seed
  scanned: number;       // distinct anime considered
  newAnime: number;      // anime seen for the first time (post-seed)
  sent: number;          // push notifications dispatched
  errors: number;
  error?: string;
};

function num(v: unknown): number {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

async function fetchFeed(base: string, path: string): Promise<FeedItem[]> {
  try {
    const res = await fetchWithTimeout(`${base}/${path}`, {
      timeout: 15000,
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    const list = Array.isArray(data) ? data : data?.results ?? data?.data ?? [];
    return Array.isArray(list) ? (list as FeedItem[]) : [];
  } catch {
    return [];
  }
}

export async function runEpisodeNotifier(opts?: { force?: boolean }): Promise<EpisodeNotifierResult> {
  const base = process.env.ANIME_API_BASE;
  if (!base) {
    return { ok: false, seeded: false, scanned: 0, newAnime: 0, sent: 0, errors: 0, error: "ANIME_API_BASE not set" };
  }

  // Merge both feeds; keep the highest sub/dub seen per anime id.
  const [newReleases, recentEpisodes] = await Promise.all([
    fetchFeed(base, "new-releases"),
    fetchFeed(base, "recent-episodes"),
  ]);

  const merged = new Map<string, FeedItem>();
  for (const item of [...recentEpisodes, ...newReleases]) {
    if (!item?.id) continue;
    const sub = num(item.sub);
    const dub = num(item.dub);
    const prev = merged.get(item.id);
    if (!prev) {
      merged.set(item.id, { ...item, sub, dub });
    } else {
      prev.sub = Math.max(num(prev.sub), sub);
      prev.dub = Math.max(num(prev.dub), dub);
      prev.image = prev.image || item.image;
      prev.title = prev.title || item.title;
    }
  }

  const items = [...merged.values()];
  if (items.length === 0) {
    return { ok: true, seeded: false, scanned: 0, newAnime: 0, sent: 0, errors: 0 };
  }

  const seededRow = await prisma.systemSetting.findUnique({ where: { key: SEED_KEY } });
  const isSeed = !opts?.force && seededRow?.value !== "true";

  // Pull existing rows for just these ids in one query.
  const existing = await prisma.animeEpisodeSeen.findMany({
    where: { animeId: { in: items.map((i) => i.id) } },
  });
  const byId = new Map(existing.map((r) => [r.animeId, r]));

  let newAnime = 0;
  let sent = 0;
  let errors = 0;

  for (const item of items) {
    const sub = num(item.sub);
    const dub = num(item.dub);
    const title = item.title || item.id;
    const image = item.image || null;
    const row = byId.get(item.id);

    // First time we ever see this anime → record baseline.
    if (!row) {
      await prisma.animeEpisodeSeen.create({
        data: { animeId: item.id, title, image, lastSub: sub, lastDub: dub },
      });
      // During the initial seed we stay silent. After seeding, a brand-new anime
      // is a genuine new release → notify on its latest sub episode.
      if (!isSeed && (sub > 0 || dub > 0)) {
        void purgeInfoCache(base, item.id);
        if (sub > 0 && sent < MAX_SENDS_PER_RUN) {
          newAnime++;
          const r = await sendEpisodeNotification({ animeId: item.id, title, episode: sub, audio: "sub", image });
          r.success ? sent++ : errors++;
        }
      }
      continue;
    }

    if (isSeed) continue; // table is being seeded; just keep baselines

    // Known anime — notify on a sub or dub count increase.
    const subGrew = sub > row.lastSub;
    const dubGrew = dub > row.lastDub;
    if (!subGrew && !dubGrew) continue;

    // New episode confirmed → bust the API's cached info for this anime so the
    // app shows it right away (independent of the FCM send cap below).
    void purgeInfoCache(base, item.id);

    if (subGrew && sent < MAX_SENDS_PER_RUN) {
      const r = await sendEpisodeNotification({ animeId: item.id, title, episode: sub, audio: "sub", image });
      r.success ? sent++ : errors++;
    }
    if (dubGrew && sent < MAX_SENDS_PER_RUN) {
      const r = await sendEpisodeNotification({ animeId: item.id, title, episode: dub, audio: "dub", image });
      r.success ? sent++ : errors++;
    }

    await prisma.animeEpisodeSeen.update({
      where: { animeId: item.id },
      data: {
        lastSub: Math.max(row.lastSub, sub),
        lastDub: Math.max(row.lastDub, dub),
        title,
        image,
        notifiedAt: new Date(),
      },
    });
  }

  if (isSeed) {
    await prisma.systemSetting.upsert({
      where: { key: SEED_KEY },
      create: { key: SEED_KEY, value: "true" },
      update: { value: "true" },
    });
  }

  return { ok: true, seeded: isSeed, scanned: items.length, newAnime, sent, errors };
}
