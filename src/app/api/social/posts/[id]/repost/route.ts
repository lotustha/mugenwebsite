import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { notify } from "@/lib/notify";
import { serializePost, userSelect, withAbsoluteMedia } from "@/lib/social-serialize";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** POST: repost (internal share) an existing post to your own feed, optional quote caption. */
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const gate = await requireUser(req);
  if ("error" in gate) return gate.error;
  const { user } = gate;

  let caption: string | null = null;
  try {
    const body = (await req.json()) as { caption?: string };
    caption = body.caption?.trim().slice(0, 2200) || null;
  } catch {
    /* caption optional */
  }

  const original = await prisma.socialPost.findUnique({
    where: { id },
    select: { id: true, type: true, authorId: true, repostOfId: true },
  });
  if (!original) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Repost the root, not a repost-of-a-repost.
  const rootId = original.repostOfId ?? original.id;

  const post = await prisma.socialPost.create({
    data: {
      authorId: user.id,
      type: original.type,
      status: "READY",
      caption,
      repostOfId: rootId,
    },
    include: {
      author: { select: userSelect },
      repostOf: { include: { author: { select: userSelect } } },
    },
  });

  void notify({ userId: original.authorId, actorId: user.id, type: "REPOST", entityId: rootId });

  return NextResponse.json(withAbsoluteMedia({ post: serializePost(post as never, user.id) }), { status: 201 });
}
