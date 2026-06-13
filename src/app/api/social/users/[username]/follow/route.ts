import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { notify } from "@/lib/notify";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ username: string }> };

async function targetOf(username: string) {
  return prisma.user.findUnique({ where: { username: username.toLowerCase() }, select: { id: true } });
}

/** POST: follow the user (idempotent). */
export async function POST(req: Request, { params }: Ctx) {
  const { username } = await params;
  const gate = await requireUser(req);
  if ("error" in gate) return gate.error;
  const { user } = gate;

  const target = await targetOf(username);
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (target.id === user.id) return NextResponse.json({ error: "You can't follow yourself" }, { status: 400 });

  try {
    await prisma.follow.create({ data: { followerId: user.id, followingId: target.id } });
    void notify({ userId: target.id, actorId: user.id, type: "FOLLOW", entityId: user.id });
  } catch {
    /* already following — idempotent */
  }
  const followers = await prisma.follow.count({ where: { followingId: target.id } });
  return NextResponse.json({ following: true, followers });
}

/** DELETE: unfollow (idempotent). */
export async function DELETE(req: Request, { params }: Ctx) {
  const { username } = await params;
  const gate = await requireUser(req);
  if ("error" in gate) return gate.error;
  const { user } = gate;

  const target = await targetOf(username);
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  await prisma.follow
    .delete({ where: { followerId_followingId: { followerId: user.id, followingId: target.id } } })
    .catch(() => {});
  const followers = await prisma.follow.count({ where: { followingId: target.id } });
  return NextResponse.json({ following: false, followers });
}
