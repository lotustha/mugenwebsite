/**
 * Cron endpoint — new-anime-episode notifications.
 * GET /api/cron/anime-episodes
 *
 * Polls the anizen feeds and pushes FCM notifications for newly-released
 * episodes. Protected by CRON_SECRET (header `x-cron-secret` or `?secret=`).
 *
 * Also runs in-process via src/lib/cron-scheduler.ts on the VPS; this route
 * exists for external schedulers and manual triggering.
 *
 * `?force=1` bypasses the silent-seed guard (re-notifies on the next count
 * change for everything currently known). Use sparingly.
 */

import { NextResponse } from "next/server";
import { runEpisodeNotifier } from "@/lib/episode-notifier";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = request.headers.get("x-cron-secret") || url.searchParams.get("secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const force = url.searchParams.get("force") === "1";
    const result = await runEpisodeNotifier({ force });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
