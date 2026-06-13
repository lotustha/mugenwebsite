import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";
import { serializePost, userSelect, withAbsoluteMedia } from "@/lib/social-serialize";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** GET a single post (with viewer like state). Also used to poll PROCESSING→READY. */
export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;
  const viewer = await getSessionUser(req);

  const post = await prisma.socialPost.findUnique({
    where: { id },
    include: {
      author: { select: userSelect },
      likes: viewer ? { where: { userId: viewer.id }, select: { userId: true } } : false,
      repostOf: { include: { author: { select: userSelect } } },
    },
  });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(withAbsoluteMedia({ post: serializePost(post as never, viewer?.id) }));
}

/** DELETE own post (author or admin). */
export async function DELETE(req: Request, { params }: Ctx) {
  const { id } = await params;
  const viewer = await getSessionUser(req);
  if (!viewer) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const post = await prisma.socialPost.findUnique({ where: { id }, select: { authorId: true } });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (post.authorId !== viewer.id && viewer.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.socialPost.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
