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

  if (!(await canView(post.authorId, post.visibility, viewer?.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(withAbsoluteMedia({ post: serializePost(post as never, viewer?.id) }));
}

/** Can `viewerId` see a post with this author + visibility? */
async function canView(authorId: string, visibility: string, viewerId?: string | null): Promise<boolean> {
  if (visibility === "PUBLIC") return true;
  if (!viewerId) return false;
  if (viewerId === authorId) return true;
  if (visibility === "PRIVATE") return false;
  // FOLLOWERS: visible if the viewer follows the author.
  const f = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: viewerId, followingId: authorId } },
    select: { id: true },
  });
  return !!f;
}

/** PATCH own post — edit caption, anime tag, and audience (author or admin). */
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const viewer = await getSessionUser(req);
  if (!viewer) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const existing = await prisma.socialPost.findUnique({ where: { id }, select: { authorId: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.authorId !== viewer.id && viewer.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { caption?: string; animeTag?: string | null; visibility?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.caption === "string") data.caption = body.caption.slice(0, 2200) || null;
  if (body.animeTag === null) data.animeTag = null;
  else if (typeof body.animeTag === "string") data.animeTag = body.animeTag.trim().slice(0, 80) || null;
  if (typeof body.visibility === "string" && ["PUBLIC", "FOLLOWERS", "PRIVATE"].includes(body.visibility)) {
    data.visibility = body.visibility;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const post = await prisma.socialPost.update({
    where: { id },
    data,
    include: {
      author: { select: userSelect },
      likes: { where: { userId: viewer.id }, select: { userId: true } },
      repostOf: { include: { author: { select: userSelect } } },
    },
  });
  return NextResponse.json(withAbsoluteMedia({ post: serializePost(post as never, viewer.id) }));
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
