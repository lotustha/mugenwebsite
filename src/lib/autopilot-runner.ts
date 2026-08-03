/**
 * Daily scheduling for the AI autopilot.
 *
 * Deliberately date-based rather than interval-based. An "every 1440 minutes"
 * timer drifts a little later every day and, because the in-process scheduler
 * restarts whenever pm2 restarts, can just as easily fire twice or skip a day
 * entirely. Anchoring on a calendar date makes the run idempotent: at most one
 * batch per day, no matter how often the tick fires or how many times the
 * process restarts.
 */

import { prisma } from "@/lib/prisma";
import { generatePost, getAiSettings, type AutopilotResult } from "@/lib/autopilot";

export const SETTINGS = {
  enabled: "autopilot_enabled",       // "true" | "false"
  hour: "autopilot_hour",             // 0-23, local site time
  perDay: "autopilot_per_day",        // how many posts per day
  lastRunDate: "autopilot_last_date", // YYYY-MM-DD of the last completed batch
  timezone: "autopilot_timezone",     // IANA tz, defaults to UTC
  attempts: "autopilot_attempts",     // "YYYY-MM-DD:n" — failed attempts today
  alert: "autopilot_alert",           // JSON describing the last give-up, for the admin UI
} as const;

/**
 * Give up after this many failed attempts in a day.
 *
 * A failed batch releases its claim so a later tick can retry — but the tick
 * fires every 10 minutes, and each attempt costs two AI calls that themselves
 * walk a 4-model × 3-attempt fallback chain. Left uncapped, a key that's already
 * out of quota would burn ~80 attempts between morning and midnight and stay
 * exhausted into the next day. Three tries is enough to ride out a transient
 * 503 without turning an outage into a self-inflicted quota ban.
 */
const MAX_ATTEMPTS_PER_DAY = 3;

async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.systemSetting.findUnique({ where: { key } });
  return row?.value ?? null;
}

async function setSetting(key: string, value: string): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

/** Calendar date + hour in the configured timezone, as seen by the site. */
function localParts(tz: string): { date: string; hour: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  });

  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    // "24" appears at midnight in some locales/engines.
    hour: Number(parts.hour) % 24,
  };
}

/**
 * Failed-attempt counter, stored as "YYYY-MM-DD:n" in a single row so the date
 * and count can never disagree — a stale count from yesterday reads as 0 today
 * without needing a cleanup job.
 */
async function getAttempts(today: string): Promise<number> {
  const raw = await getSetting(SETTINGS.attempts);
  if (!raw) return 0;
  const [date, n] = raw.split(":");
  return date === today ? Number(n) || 0 : 0;
}

async function bumpAttempts(today: string): Promise<number> {
  const next = (await getAttempts(today)) + 1;
  await setSetting(SETTINGS.attempts, `${today}:${next}`);
  return next;
}

/**
 * Record a give-up so the admin UI can surface it.
 *
 * Deliberately NOT a push notification: a failed internal job is not reader-
 * facing, and blasting every app user about it would be worse than the silence
 * it replaces. The admin page shows this as a banner instead.
 */
async function raiseAlert(today: string, attempts: number, results: AutopilotResult[]): Promise<void> {
  const reasons = [...new Set(results.map((r) => r.error).filter(Boolean))].slice(0, 3);
  await setSetting(
    SETTINGS.alert,
    JSON.stringify({ date: today, attempts, reasons, at: new Date().toISOString() }),
  ).catch(() => {});
}

/** Put the day's claim back the way it was before this run took it. */
async function releaseClaim(previous: string | null): Promise<void> {
  if (previous !== null) await setSetting(SETTINGS.lastRunDate, previous);
  else await prisma.systemSetting.delete({ where: { key: SETTINGS.lastRunDate } }).catch(() => {});
}

export interface DailyRunResult {
  ran: boolean;
  reason?: string;
  results?: AutopilotResult[];
}

/**
 * Run today's batch if it's due and hasn't happened yet.
 *
 * `force` bypasses both the schedule and the already-ran-today guard.
 * `publish: false` writes the post as a draft and skips the push notification —
 * the safe way to smoke-test the pipeline against production without notifying
 * every app user.
 */
export async function runDailyAutopilot(force = false, publish = true): Promise<DailyRunResult> {
  const enabled = await getSetting(SETTINGS.enabled);
  if (!force && enabled !== "true") return { ran: false, reason: "disabled" };

  const tz = (await getSetting(SETTINGS.timezone)) || "UTC";
  const { date: today, hour: nowHour } = localParts(tz);

  if (!force) {
    const targetHour = Number((await getSetting(SETTINGS.hour)) ?? 9);
    if (nowHour < targetHour) {
      return { ran: false, reason: `waiting for ${targetHour}:00 ${tz} (now ${nowHour}:00)` };
    }
    if ((await getSetting(SETTINGS.lastRunDate)) === today) {
      return { ran: false, reason: "already ran today" };
    }
    if ((await getAttempts(today)) >= MAX_ATTEMPTS_PER_DAY) {
      return { ran: false, reason: `gave up for today after ${MAX_ATTEMPTS_PER_DAY} failed attempts` };
    }
  }

  const aiSettings = await getAiSettings();
  if (!aiSettings) return { ran: false, reason: "no AI API key configured" };

  // Claim the day BEFORE generating. Generation takes minutes, and the tick
  // fires every 60s — without claiming first, several overlapping ticks would
  // each see "not run yet" and publish a duplicate post.
  const claimedDate = force ? null : await getSetting(SETTINGS.lastRunDate);
  if (!force) {
    if (claimedDate === today) return { ran: false, reason: "already ran today" };
    await setSetting(SETTINGS.lastRunDate, today);
  }

  const perDay = Math.max(1, Math.min(5, Number((await getSetting(SETTINGS.perDay)) ?? 1)));
  const results: AutopilotResult[] = [];

  try {
    for (let i = 0; i < perDay; i++) {
      results.push(await generatePost({ aiSettings, publish, trigger: force ? "manual" : "cron" }));
      // Space out calls — free-tier Gemini is rate-limited per minute.
      if (i < perDay - 1) await new Promise((r) => setTimeout(r, 20_000));
    }
  } catch (e) {
    // Release the claim so the next tick can retry today rather than silently
    // skipping to tomorrow — but count the attempt so retries stay bounded.
    if (!force) {
      await bumpAttempts(today);
      await releaseClaim(claimedDate);
    }
    throw e;
  }

  // If every attempt failed (quota, outage), un-claim the day so a later tick
  // can try again instead of leaving readers with nothing.
  if (!force && results.every((r) => r.status === "error")) {
    const attempts = await bumpAttempts(today);
    await releaseClaim(claimedDate);

    const givingUp = attempts >= MAX_ATTEMPTS_PER_DAY;
    if (givingUp) await raiseAlert(today, attempts, results);

    return {
      ran: true,
      reason: givingUp
        ? `all generations failed — giving up for today after ${attempts} attempts`
        : `all generations failed — will retry (attempt ${attempts}/${MAX_ATTEMPTS_PER_DAY})`,
      results,
    };
  }

  // A successful batch clears any stale alert banner.
  if (!force) await prisma.systemSetting.delete({ where: { key: SETTINGS.alert } }).catch(() => {});

  return { ran: true, results };
}
