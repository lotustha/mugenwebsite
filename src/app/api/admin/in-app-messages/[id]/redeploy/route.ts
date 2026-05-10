/**
 * POST /api/admin/in-app-messages/[id]/redeploy
 *
 * Reactivates a message and optionally resets all tracking data.
 * Body: { resetStats?: boolean }
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { resetStats = false } = await req.json().catch(() => ({}));

  if (resetStats) {
    // Wipe click + impression history so all devices see it again
    await prisma.inAppImpression.deleteMany({ where: { messageId: id } });
    await prisma.inAppClick.deleteMany({ where: { messageId: id } });
  }

  const msg = await prisma.inAppMessage.update({
    where: { id },
    data:  { active: true, updatedAt: new Date() },
    include: { _count: { select: { impressions: true, clicks: true } } },
  });

  return NextResponse.json({
    ...msg,
    impressionCount: msg._count.impressions,
    clickCount:      msg._count.clicks,
    ctr: 0,
  });
}
