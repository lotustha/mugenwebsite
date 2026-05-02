/**
 * Cron endpoint — called by Vercel Cron or any external scheduler.
 * GET /api/cron/rss-import
 *
 * Vercel Cron calls it every hour; schedule filtering is done inside processFeedsWithAi.
 * Protected by CRON_SECRET env var (set in Vercel dashboard).
 */

import { NextResponse } from "next/server";
import { processFeedsWithAi } from "@/lib/rss-processor";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 min max (Vercel Pro)

async function getAiSettings() {
  const { prisma } = await import("@/lib/prisma");
  const settings = await prisma.systemSetting.findMany();
  const config: Record<string, string> = {};
  for (const s of settings) config[s.key] = s.value;

  let provider = "gemini";
  let apiKey = "";
  let model = "";

  if (config.openrouter) { provider = "openrouter"; apiKey = config.openrouter; model = config.openrouterModel || ""; }
  else if (config.gemini) { provider = "gemini"; apiKey = config.gemini; model = config.geminiModel || ""; }
  else if (config.openai) { provider = "openai"; apiKey = config.openai; model = config.openaiModel || ""; }
  else if (config.claude) { provider = "claude"; apiKey = config.claude; model = config.claudeModel || ""; }
  else if (process.env.GEMINI_API_KEY) { provider = "gemini"; apiKey = process.env.GEMINI_API_KEY; }

  return { provider, apiKey, model };
}

export async function GET(request: Request) {
  // Verify cron secret
  const secret = request.headers.get("x-cron-secret") || new URL(request.url).searchParams.get("secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const aiSettings = await getAiSettings();
  if (!aiSettings.apiKey) {
    return NextResponse.json({ error: "No AI API key configured (set AI_API_KEY or GEMINI_API_KEY env var)" }, { status: 500 });
  }

  try {
    const results = await processFeedsWithAi({ aiSettings });
    return NextResponse.json({ ok: true, results });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
