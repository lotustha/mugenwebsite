import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { serializePost, userSelect, withAbsoluteMedia } from "@/lib/social-serialize";

export const dynamic = "force-dynamic";

/**
 * GET /api/social/feed — personalized "Following" timeline (auth required).
 * Posts from people the viewer follows, plus their own. Query: ?cursor=<id>
 */
export async function GET(req: Request) {
  const gate = await requireUser(req);
  if ("error" in gate) return gate.error;
  const { user } = gate;

  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor") || undefined;
  const limit = 12;

  const following = await prisma.follow.findMany({
    where: { followerId: user.id },
    select: { followingId: true },
  });
  const authorIds = [...following.map((f) => f.followingId), user.id];

  const posts = await prisma.socialPost.findMany({
    // Followed authors' posts + own. Hide others' PRIVATE posts (you follow them,
    // so their FOLLOWERS posts are fair game; only "Only me" is excluded).
    where: {
      status: "READY",
      authorId: { in: authorIds },
      OR: [{ authorId: user.id }, { visibility: { not: "PRIVATE" } }],
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      author: { select: userSelect },
      likes: { where: { userId: user.id }, select: { userId: true } },
      repostOf: { include: { author: { select: userSelect } } },
    },
  });

  const hasMore = posts.length > limit;
  const page = hasMore ? posts.slice(0, limit) : posts;
  return NextResponse.json(
    withAbsoluteMedia({
      items: page.map((p) => serializePost(p as never, user.id)),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    }),
  );
}
