import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { notify } from "@/lib/notify";
import { userSelect, withAbsoluteMedia } from "@/lib/social-serialize";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** POST a reply to a discussion (optionally nested via parentId). */
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const gate = await requireUser(req);
  if ("error" in gate) return gate.error;
  const { user } = gate;

  let body: { content?: string; parentId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const content = body.content?.trim().slice(0, 8000);
  if (!content) return NextResponse.json({ error: "Reply cannot be empty" }, { status: 400 });

  const discussion = await prisma.discussion.findUnique({ where: { id }, select: { authorId: true } });
  if (!discussion) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [reply] = await prisma.$transaction([
    prisma.discussionReply.create({
      data: { discussionId: id, authorId: user.id, content, parentId: body.parentId ?? null },
      include: { author: { select: userSelect } },
    }),
    prisma.discussion.update({
      where: { id },
      data: { replyCount: { increment: 1 }, lastActiveAt: new Date() },
    }),
  ]);

  void notify({ userId: discussion.authorId, actorId: user.id, type: "REPLY", entityId: id });
  // Notify the parent reply's author too, if nested.
  if (body.parentId) {
    const parent = await prisma.discussionReply.findUnique({
      where: { id: body.parentId },
      select: { authorId: true },
    });
    if (parent) void notify({ userId: parent.authorId, actorId: user.id, type: "REPLY", entityId: id });
  }

  return NextResponse.json(
    withAbsoluteMedia({
      reply: {
        id: reply.id, content: reply.content, parentId: reply.parentId,
        createdAt: reply.createdAt.toISOString(), author: reply.author,
      },
    }),
    { status: 201 },
  );
}
