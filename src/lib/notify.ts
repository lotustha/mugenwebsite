// Fire-and-forget notification creation for social interactions.
// Never notify yourself; failures are swallowed (notifications are non-critical).

import { prisma } from "@/lib/prisma";

type NotifType = "FOLLOW" | "LIKE" | "COMMENT" | "REPLY" | "REPOST" | "MENTION";

export async function notify(opts: {
  userId: string; // recipient
  actorId: string; // who triggered it
  type: NotifType;
  entityId?: string | null;
}): Promise<void> {
  if (opts.userId === opts.actorId) return; // no self-notifications
  try {
    await prisma.notification.create({
      data: {
        userId: opts.userId,
        actorId: opts.actorId,
        type: opts.type,
        entityId: opts.entityId ?? null,
      },
    });
  } catch {
    // best-effort
  }
}
