import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

/**
 * Presence heartbeat. The web client pings this on an interval while the tab is
 * active; we stamp `lastSeenAt` so others see the green online dot. Cheap and
 * best-effort — never errors the client.
 */
export async function POST(req: Request) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ ok: false }, { status: 200 });
  await prisma.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
