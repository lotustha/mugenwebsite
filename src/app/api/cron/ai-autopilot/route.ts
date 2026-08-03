/**
 * GET /api/cron/ai-autopilot — external trigger for the daily AI post generator.
 *
 * The in-process scheduler (src/lib/cron-scheduler.ts) already runs this on the
 * VPS; this route exists so an external scheduler (system crontab, Vercel Cron,
 * uptime pinger) can drive it too. Both paths share the same calendar-date guard,
 * so triggering from several places cannot double-post.
 *
 * ?force=1 bypasses the schedule and publishes immediately.
 */

import { NextResponse } from "next/server";
import { runDailyAutopilot } from "@/lib/autopilot-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = request.headers.get("x-cron-secret") ?? url.searchParams.get("secret");

  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runDailyAutopilot(url.searchParams.get("force") === "1");
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed" },
      { status: 500 },
    );
  }
}
