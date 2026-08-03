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
} as const;

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

export interface DailyRunResult {
  ran: boolean;
  reason?: string;
  results?: AutopilotResult[];
}

/**
 * Run today's batch if it's due and hasn't happened yet.
 * `force` bypasses both the schedule and the already-ran-today guard.
 */
export async function runDailyAutopilot(force = false): Promise<DailyRunResult> {
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
      results.push(await generatePost({ aiSettings, trigger: force ? "manual" : "cron" }));
      // Space out calls — free-tier Gemini is rate-limited per minute.
      if (i < perDay - 1) await new Promise((r) => setTimeout(r, 20_000));
    }
  } catch (e) {
    // Release the claim so the next tick can retry today rather than silently
    // skipping to tomorrow.
    if (!force && claimedDate !== null) await setSetting(SETTINGS.lastRunDate, claimedDate);
    else if (!force) await prisma.systemSetting.delete({ where: { key: SETTINGS.lastRunDate } }).catch(() => {});
    throw e;
  }

  // If every attempt failed (quota, outage), un-claim the day so a later tick
  // can try again instead of leaving readers with nothing.
  if (!force && results.every((r) => r.status === "error")) {
    if (claimedDate !== null) await setSetting(SETTINGS.lastRunDate, claimedDate);
    else await prisma.systemSetting.delete({ where: { key: SETTINGS.lastRunDate } }).catch(() => {});
    return { ran: true, reason: "all generations failed — will retry on the next tick", results };
  }

  return { ran: true, results };
}
