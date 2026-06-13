import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { notify } from "@/lib/notify";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** POST: like the post (idempotent). Returns the new like state + count. */
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const gate = await requireUser(req);
  if ("error" in gate) return gate.error;
  const { user } = gate;

  const post = await prisma.socialPost.findUnique({ where: { id }, select: { id: true, authorId: true } });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await prisma.$transaction([
      prisma.like.create({ data: { postId: id, userId: user.id } }),
      prisma.socialPost.update({ where: { id }, data: { likesCount: { increment: 1 } } }),
    ]);
    void notify({ userId: post.authorId, actorId: user.id, type: "LIKE", entityId: id });
  } catch {
    // Unique violation → already liked; treat as success (idempotent).
  }

  const likesCount = await prisma.like.count({ where: { postId: id } });
  return NextResponse.json({ liked: true, likesCount });
}

/** DELETE: unlike the post (idempotent). */
export async function DELETE(req: Request, { params }: Ctx) {
  const { id } = await params;
  const gate = await requireUser(req);
  if ("error" in gate) return gate.error;
  const { user } = gate;

  const existing = await prisma.like.findUnique({
    where: { postId_userId: { postId: id, userId: user.id } },
    select: { id: true },
  });
  if (existing) {
    await prisma.$transaction([
      prisma.like.delete({ where: { id: existing.id } }),
      prisma.socialPost.update({ where: { id }, data: { likesCount: { decrement: 1 } } }),
    ]);
  }

  const likesCount = await prisma.like.count({ where: { postId: id } });
  return NextResponse.json({ liked: false, likesCount });
}
