import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, requireUser } from "@/lib/auth-helpers";
import { notify } from "@/lib/notify";
import { userSelect, withAbsoluteMedia } from "@/lib/social-serialize";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** GET flat list of comments for a post (oldest first), with authors. */
export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;
  const comments = await prisma.comment.findMany({
    where: { postId: id },
    orderBy: { createdAt: "asc" },
    include: { author: { select: userSelect } },
    take: 200,
  });
  return NextResponse.json(
    withAbsoluteMedia({
      items: comments.map((c) => ({
        id: c.id,
        content: c.content,
        parentId: c.parentId,
        createdAt: c.createdAt.toISOString(),
        author: c.author,
      })),
    }),
  );
}

/** POST a comment (or threaded reply via parentId). */
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
  const content = body.content?.trim().slice(0, 2000);
  if (!content) return NextResponse.json({ error: "Comment cannot be empty" }, { status: 400 });

  const post = await prisma.socialPost.findUnique({ where: { id }, select: { authorId: true } });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [comment] = await prisma.$transaction([
    prisma.comment.create({
      data: { postId: id, authorId: user.id, content, parentId: body.parentId ?? null },
      include: { author: { select: userSelect } },
    }),
    prisma.socialPost.update({ where: { id }, data: { commentsCount: { increment: 1 } } }),
  ]);

  void notify({
    userId: post.authorId,
    actorId: user.id,
    type: body.parentId ? "REPLY" : "COMMENT",
    entityId: id,
  });

  return NextResponse.json(
    withAbsoluteMedia({
      comment: {
        id: comment.id,
        content: comment.content,
        parentId: comment.parentId,
        createdAt: comment.createdAt.toISOString(),
        author: comment.author,
      },
    }),
    { status: 201 },
  );
}
