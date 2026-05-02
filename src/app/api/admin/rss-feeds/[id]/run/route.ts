/**
 * POST /api/admin/rss-feeds/[id]/run
 * Manual "Run Now" trigger — reads AI settings from request body (from client localStorage)
 */

import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { processFeedsWithAi } from "@/lib/rss-processor";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Fetch settings from DB
  const { prisma } = await import("@/lib/prisma");
  const settings = await prisma.systemSetting.findMany();
  const config: Record<string, string> = {};
  for (const s of settings) config[s.key] = s.value;

  let provider = null;
  let effectiveKey = "";
  let model = "";

  if (config.openrouter) { provider = "openrouter"; effectiveKey = config.openrouter; model = config.openrouterModel || ""; }
  else if (config.gemini) { provider = "gemini"; effectiveKey = config.gemini; model = config.geminiModel || ""; }
  else if (config.openai) { provider = "openai"; effectiveKey = config.openai; model = config.openaiModel || ""; }
  else if (config.claude) { provider = "claude"; effectiveKey = config.claude; model = config.claudeModel || ""; }
  else if (process.env.GEMINI_API_KEY) { provider = "gemini"; effectiveKey = process.env.GEMINI_API_KEY; }

  if (!effectiveKey || !provider) {
    return NextResponse.json({ error: "No AI API key — add one in Settings first." }, { status: 400 });
  }

  try {
    const results = await processFeedsWithAi({
      feedId: id,
      aiSettings: { provider, apiKey: effectiveKey, model },
      force: true,
      invokingUser: {
        id: user.id,
        email: user.email || "admin@mugenstream.fun",
      },
    });
    return NextResponse.json({ ok: true, results });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
