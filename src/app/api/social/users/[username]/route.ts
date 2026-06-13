import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";
import { serializePost, userSelect, withAbsoluteMedia } from "@/lib/social-serialize";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ username: string }> };

/**
 * GET /api/social/users/[username] — public profile + their posts.
 * Query: ?tab=posts|reels|discussions  ?cursor=<id>
 */
export async function GET(req: Request, { params }: Ctx) {
  const { username } = await params;
  const url = new URL(req.url);
  const tab = url.searchParams.get("tab") ?? "posts";
  const cursor = url.searchParams.get("cursor") || undefined;
  const viewer = await getSessionUser(req);

  const user = await prisma.user.findUnique({
    where: { username: username.toLowerCase() },
    select: {
      id: true, username: true, displayName: true, avatar: true, bio: true, verified: true, lastSeenAt: true, createdAt: true,
      _count: { select: { followers: true, following: true, socialPosts: true, discussions: true } },
    },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const isFollowing = viewer
    ? !!(await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: viewer.id, followingId: user.id } },
        select: { id: true },
      }))
    : false;

  // Posts tab data.
  let items: unknown[] = [];
  let nextCursor: string | null = null;
  if (tab === "posts" || tab === "reels") {
    const posts = await prisma.socialPost.findMany({
      where: {
        authorId: user.id,
        status: "READY",
        ...(tab === "reels" ? { type: "REEL" } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 13,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        author: { select: userSelect },
        likes: viewer ? { where: { userId: viewer.id }, select: { userId: true } } : false,
        repostOf: { include: { author: { select: userSelect } } },
      },
    });
    const hasMore = posts.length > 12;
    const page = hasMore ? posts.slice(0, 12) : posts;
    items = page.map((p) => serializePost(p as never, viewer?.id));
    nextCursor = hasMore ? page[page.length - 1].id : null;
  } else if (tab === "discussions") {
    const discussions = await prisma.discussion.findMany({
      where: { authorId: user.id },
      orderBy: { lastActiveAt: "desc" },
      take: 20,
      select: { id: true, title: true, animeTag: true, replyCount: true, lastActiveAt: true, createdAt: true },
    });
    items = discussions.map((d) => ({
      id: d.id, title: d.title, animeTag: d.animeTag, replyCount: d.replyCount,
      lastActiveAt: d.lastActiveAt.toISOString(), createdAt: d.createdAt.toISOString(),
    }));
  }

  return NextResponse.json(
    withAbsoluteMedia({
      profile: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        bio: user.bio,
        verified: user.verified,
        online: !!user.lastSeenAt && Date.now() - new Date(user.lastSeenAt).getTime() < 3 * 60 * 1000,
        joinedAt: user.createdAt.toISOString(),
        counts: {
          followers: user._count.followers,
          following: user._count.following,
          posts: user._count.socialPosts,
          discussions: user._count.discussions,
        },
        isFollowing,
        isSelf: viewer?.id === user.id,
      },
      tab,
      items,
      nextCursor,
    }),
  );
}
