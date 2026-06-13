import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { userSelect, withAbsoluteMedia } from "@/lib/social-serialize";

export const dynamic = "force-dynamic";

/** GET own notifications (newest first) + unread count. */
export async function GET(req: Request) {
  const gate = await requireUser(req);
  if ("error" in gate) return gate.error;
  const { user } = gate;

  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { actor: { select: userSelect } },
    }),
    prisma.notification.count({ where: { userId: user.id, read: false } }),
  ]);

  return NextResponse.json(
    withAbsoluteMedia({
      unread,
      items: items.map((n) => ({
        id: n.id,
        type: n.type,
        entityId: n.entityId,
        read: n.read,
        createdAt: n.createdAt.toISOString(),
        actor: n.actor,
      })),
    }),
  );
}

/** PATCH: mark notifications read. Body: { ids?: string[] } — omit to mark all. */
export async function PATCH(req: Request) {
  const gate = await requireUser(req);
  if ("error" in gate) return gate.error;
  const { user } = gate;

  let ids: string[] | undefined;
  try {
    const body = (await req.json()) as { ids?: string[] };
    ids = Array.isArray(body.ids) ? body.ids : undefined;
  } catch {
    /* mark-all */
  }

  await prisma.notification.updateMany({
    where: { userId: user.id, ...(ids ? { id: { in: ids } } : {}) },
    data: { read: true },
  });
  return NextResponse.json({ ok: true });
}
