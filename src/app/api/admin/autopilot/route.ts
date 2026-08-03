/**
 * GET  /api/admin/autopilot — settings, topics (with live engagement stats), history
 * PATCH /api/admin/autopilot — update settings
 *
 * Seeds the default topic set on first load so the feature is usable immediately
 * rather than showing an empty screen that generates nothing.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { DEFAULT_TOPICS } from "@/lib/autopilot";
import { slugify } from "@/lib/post-creator";
import { SETTINGS } from "@/lib/autopilot-runner";
import { SCORING_WINDOW_DAYS, MIN_SAMPLES, EXPLORATION_RATE, READ_BONUS } from "@/lib/autopilot-scoring";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    if ((await prisma.aiTopic.count()) === 0) {
      for (const t of DEFAULT_TOPICS) {
        await prisma.aiTopic
          .create({ data: { name: t.name, slug: slugify(t.name), promptHint: t.promptHint, category: t.category } })
          .catch(() => {});
      }
    }

    const rows = await prisma.systemSetting.findMany({ where: { key: { in: Object.values(SETTINGS) } } });
    const cfg = Object.fromEntries(rows.map((r) => [r.key, r.value]));

    const topics = await prisma.aiTopic.findMany({
      orderBy: [{ weight: "desc" }, { name: "asc" }],
      include: { _count: { select: { posts: true } } },
    });

    // Lifetime views per topic — shown alongside the windowed average so an admin
    // can see both total reach and the normalised score the bandit actually uses.
    const totals = await prisma.post.groupBy({
      by: ["topicId"],
      where: { source: "autopilot", topicId: { not: null } },
      _sum: { viewsCount: true, readsCount: true },
    });
    const totalByTopic = Object.fromEntries(totals.map((t) => [t.topicId, t._sum.viewsCount ?? 0]));
    const readsByTopic = Object.fromEntries(totals.map((t) => [t.topicId, t._sum.readsCount ?? 0]));

    const history = await prisma.autopilotRun.findMany({
      orderBy: { createdAt: "desc" },
      take: 25,
      include: { topic: { select: { name: true } } },
    });

    // Resolve slugs for successful runs so the UI can link to the live posts.
    const postIds = history.map((h) => h.postId).filter((id): id is string => !!id);
    const posts = postIds.length
      ? await prisma.post.findMany({
          where: { id: { in: postIds } },
          select: { id: true, slug: true, viewsCount: true, published: true },
        })
      : [];
    const postById = Object.fromEntries(posts.map((p) => [p.id, p]));

    return NextResponse.json({
      settings: {
        enabled: cfg[SETTINGS.enabled] === "true",
        hour: Number(cfg[SETTINGS.hour] ?? 9),
        perDay: Number(cfg[SETTINGS.perDay] ?? 1),
        timezone: cfg[SETTINGS.timezone] || "UTC",
        lastRunDate: cfg[SETTINGS.lastRunDate] ?? null,
      },
      // Present only when the generator exhausted its retries for a day; the UI
      // renders it as a banner so a silent multi-day outage can't go unnoticed.
      alert: (() => {
        try {
          return cfg[SETTINGS.alert] ? JSON.parse(cfg[SETTINGS.alert]) : null;
        } catch {
          return null;
        }
      })(),
      scoring: {
        windowDays: SCORING_WINDOW_DAYS,
        minSamples: MIN_SAMPLES,
        explorationRate: EXPLORATION_RATE,
        readBonus: READ_BONUS,
      },
      topics: topics.map((t) => ({
        id: t.id,
        name: t.name,
        promptHint: t.promptHint,
        category: t.category,
        isActive: t.isActive,
        boost: t.boost,
        weight: t.weight,
        avgViews: t.avgViews,
        avgReads: t.avgReads,
        readRate: t.readRate,
        postsScored: t.postsScored,
        postsTotal: t._count.posts,
        totalViews: totalByTopic[t.id] ?? 0,
        totalReads: readsByTopic[t.id] ?? 0,
        lastUsedAt: t.lastUsedAt,
      })),
      history: history.map((h) => ({
        id: h.id,
        status: h.status,
        title: h.title,
        topic: h.topic?.name ?? null,
        videoId: h.videoId,
        model: h.model,
        errorMsg: h.errorMsg,
        trigger: h.trigger,
        createdAt: h.createdAt,
        slug: h.postId ? (postById[h.postId]?.slug ?? null) : null,
        views: h.postId ? (postById[h.postId]?.viewsCount ?? 0) : null,
      })),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load autopilot" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const updates: Array<[string, string]> = [];

    if (body.enabled !== undefined) updates.push([SETTINGS.enabled, body.enabled ? "true" : "false"]);
    if (body.hour !== undefined) {
      updates.push([SETTINGS.hour, String(Math.max(0, Math.min(23, Number(body.hour) || 0)))]);
    }
    if (body.perDay !== undefined) {
      updates.push([SETTINGS.perDay, String(Math.max(1, Math.min(5, Number(body.perDay) || 1)))]);
    }
    if (body.timezone !== undefined) updates.push([SETTINGS.timezone, String(body.timezone || "UTC")]);

    for (const [key, value] of updates) {
      await prisma.systemSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
