import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";
import { serializeUser, userSelect, withAbsoluteMedia } from "@/lib/social-serialize";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ username: string }> };

/** GET /api/social/users/[username]/following — users this user follows. */
export async function GET(req: Request, { params }: Ctx) {
  const { username } = await params;
  const viewer = await getSessionUser(req);

  const user = await prisma.user.findUnique({
    where: { username: username.toLowerCase() },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const rows = await prisma.follow.findMany({
    where: { followerId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { following: { select: { ...userSelect, bio: true } } },
  });

  const ids = rows.map((r) => r.following.id);
  const viewerFollowing = viewer
    ? new Set(
        (
          await prisma.follow.findMany({
            where: { followerId: viewer.id, followingId: { in: ids } },
            select: { followingId: true },
          })
        ).map((f) => f.followingId),
      )
    : new Set<string>();

  const items = rows.map((r) => ({
    ...serializeUser(r.following),
    bio: r.following.bio,
    isFollowing: viewerFollowing.has(r.following.id),
    isSelf: viewer?.id === r.following.id,
  }));

  return NextResponse.json(withAbsoluteMedia({ items }));
}
