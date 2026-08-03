/**
 * POST /api/admin/autopilot/run — generate a post right now.
 *
 * Bypasses the daily schedule entirely (and does not consume the day's slot), so
 * an admin can preview what the generator produces before trusting it to run
 * unattended. Pass { topicId } to force a topic, { publish: false } for a draft.
 */

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { generatePost, getAiSettings } from "@/lib/autopilot";
import { scoreTopics } from "@/lib/autopilot-scoring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));

    const aiSettings = await getAiSettings();
    if (!aiSettings) {
      return NextResponse.json(
        { error: "No AI API key configured — add a Gemini key in /admin/settings" },
        { status: 400 },
      );
    }

    const result = await generatePost({
      aiSettings,
      topicId: body.topicId || undefined,
      publish: body.publish !== false,
      trigger: "manual",
    });

    return NextResponse.json(result, { status: result.status === "ok" ? 200 : 500 });
  } catch (e) {
    return NextResponse.json(
      { status: "error", error: e instanceof Error ? e.message : "Generation failed" },
      { status: 500 },
    );
  }
}

/** Recompute engagement scores without generating anything. */
export async function PUT() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    return NextResponse.json({ ok: true, scores: await scoreTopics() });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
