/**
 * GET /api/in-app-messages?app={slug}&deviceId={id}
 *
 * Returns active messages for the given app (and global messages).
 * Flutter calls this on every app launch.
 * Messages are ordered by priority DESC, then createdAt DESC.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const appSlug  = searchParams.get("app")      ?? null;
  const deviceId = searchParams.get("deviceId") ?? null;

  const now = new Date();

  try {
    const messages = await prisma.inAppMessage.findMany({
      where: {
        active: true,
        OR: [{ targetApp: null }, { targetApp: appSlug ?? undefined }],
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt:   null }, { endsAt:   { gte: now } }] },
        ],
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      include: {
        _count: { select: { impressions: true, clicks: true } },
      },
    });

    // If deviceId provided, filter out messages this device already clicked
    // (for non-persistent messages). Persistent messages always return.
    let filtered = messages;
    if (deviceId) {
      const clickedIds = await prisma.inAppClick
        .findMany({ where: { deviceId }, select: { messageId: true } })
        .then(rows => new Set(rows.map(r => r.messageId)));

      filtered = messages.filter(m => m.persistent || !clickedIds.has(m.id));
    }

    // Strip internal count from response
    const result = filtered.map(({ _count, ...m }) => ({
      ...m,
      impressionCount: _count.impressions,
      clickCount:      _count.clicks,
    }));

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}
