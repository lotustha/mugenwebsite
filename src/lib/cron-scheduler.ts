/**
 * In-process RSS scheduler for VPS / self-hosted deployments.
 * Started once via src/instrumentation.ts when the Next.js server boots.
 * Checks every 60 s; the RSS processor internally honours each feed's scheduleMinutes.
 */

let started = false;

export function startCronScheduler() {
  if (started) return; // guard against hot-reload re-registration in dev
  started = true;

  console.log("[cron] Background scheduler initialised — RSS every 60 s, episodes every 15 min, wallpapers every 5 min");

  // Small startup delay so the DB connection pool is warm before first tick
  setTimeout(tick, 15_000);
  setInterval(tick, 60_000);

  // New-anime-episode notifications poll the anizen feeds less aggressively.
  setTimeout(episodeTick, 30_000);
  setInterval(episodeTick, 15 * 60_000);

  // Wallpaper auto-import (Pinterest). Checked every 5 min; each WallpaperSource
  // self-throttles via its own scheduleMinutes (default twice a day).
  setTimeout(wallpaperTick, 45_000);
  setInterval(wallpaperTick, 5 * 60_000);
}

async function wallpaperTick() {
  try {
    const { prisma } = await import("@/lib/prisma");

    // Shares the master switch with the RSS/episode scheduler.
    const enabledRow = await prisma.systemSetting.findUnique({ where: { key: "cron_enabled" } });
    if (enabledRow?.value !== "true") return;

    const { processWallpaperSources } = await import("@/lib/wallpaper-importer");
    const results = await processWallpaperSources({ force: false });

    const created = results.reduce((n, r) => n + r.created, 0);
    const errors = results.reduce((n, r) => n + r.errors, 0);

    if (created > 0 || errors > 0) {
      console.log(`[cron] Wallpaper tick: ${created} imported, ${errors} errors`);
      await prisma.systemSetting.upsert({
        where: { key: "wallpaper_last_run" },
        create: { key: "wallpaper_last_run", value: new Date().toISOString() },
        update: { value: new Date().toISOString() },
      });
    }
  } catch (err) {
    console.error("[cron] Wallpaper tick error:", err instanceof Error ? err.message : err);
  }
}

async function episodeTick() {
  try {
    const { prisma } = await import("@/lib/prisma");

    const enabledRow = await prisma.systemSetting.findUnique({ where: { key: "cron_enabled" } });
    if (enabledRow?.value !== "true") return;

    const { runEpisodeNotifier } = await import("@/lib/episode-notifier");
    const res = await runEpisodeNotifier();

    if (res.seeded) {
      console.log(`[cron] Episode notifier seeded ${res.scanned} anime (silent baseline)`);
    } else if (res.sent > 0 || res.errors > 0) {
      console.log(`[cron] Episode notifier: ${res.sent} pushes sent, ${res.errors} errors (${res.scanned} scanned)`);
    }

    if (res.sent > 0 || res.seeded) {
      await prisma.systemSetting.upsert({
        where: { key: "episode_notifier_last_run" },
        create: { key: "episode_notifier_last_run", value: new Date().toISOString() },
        update: { value: new Date().toISOString() },
      });
    }
  } catch (err) {
    console.error("[cron] Episode tick error:", err instanceof Error ? err.message : err);
  }
}

async function tick() {
  try {
    const { prisma } = await import("@/lib/prisma");

    // Only proceed if admin has enabled the scheduler
    const enabledRow = await prisma.systemSetting.findUnique({ where: { key: "cron_enabled" } });
    if (enabledRow?.value !== "true") return;

    // Record this tick so the UI can show "last checked X ago"
    await prisma.systemSetting.upsert({
      where: { key: "cron_last_tick" },
      create: { key: "cron_last_tick", value: new Date().toISOString() },
      update: { value: new Date().toISOString() },
    });

    // Resolve AI provider from DB settings (same logic as the manual run endpoint)
    const allSettings = await prisma.systemSetting.findMany();
    const cfg: Record<string, string> = Object.fromEntries(allSettings.map(s => [s.key, s.value]));

    let provider = "";
    let apiKey   = "";
    let model    = "";

    if (cfg.openrouter) { provider = "openrouter"; apiKey = cfg.openrouter; model = cfg.openrouterModel ?? ""; }
    else if (cfg.gemini) { provider = "gemini";    apiKey = cfg.gemini;    model = cfg.geminiModel    ?? ""; }
    else if (cfg.openai)  { provider = "openai";   apiKey = cfg.openai;   model = cfg.openaiModel    ?? ""; }
    else if (cfg.claude)  { provider = "claude";   apiKey = cfg.claude;   model = cfg.claudeModel    ?? ""; }
    else if (process.env.GEMINI_API_KEY) { provider = "gemini"; apiKey = process.env.GEMINI_API_KEY; }

    if (!provider || !apiKey) return; // no AI key configured yet

    const { processFeedsWithAi } = await import("@/lib/rss-processor");

    // force: false → each feed decides based on its own scheduleMinutes + lastRunAt
    const results = await processFeedsWithAi({
      aiSettings: { provider, apiKey, model },
      force: false,
    });

    const created = results.reduce((n, r) => n + r.created, 0);
    const errors  = results.reduce((n, r) => n + r.errors,  0);

    if (created > 0 || errors > 0) {
      console.log(`[cron] RSS tick: ${created} posts created, ${errors} errors`);

      // Persist last successful activity time
      await prisma.systemSetting.upsert({
        where: { key: "cron_last_run" },
        create: { key: "cron_last_run", value: new Date().toISOString() },
        update: { value: new Date().toISOString() },
      });
    }
  } catch (err) {
    // Never let a scheduler tick crash the server
    console.error("[cron] Tick error:", err instanceof Error ? err.message : err);
  }
}
