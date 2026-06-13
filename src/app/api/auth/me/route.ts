import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";
import { generateUniqueUsername } from "@/lib/ensure-username";
import { isValidUsername } from "@/lib/username";
import { withAbsoluteMedia } from "@/lib/social-serialize";

export const dynamic = "force-dynamic";

/** Current signed-in user (web cookie or mobile bearer). */
export async function GET(req: Request) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) return NextResponse.json({ user: null }, { status: 200 });

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true, email: true, role: true, username: true, displayName: true, avatar: true, bio: true,
      _count: { select: { followers: true, following: true, socialPosts: true } },
    },
  });
  // OAuth users are created without a username (PrismaAdapter) → assign one so
  // profile links never resolve to /u/null. Idempotent: only runs while null.
  if (user && !user.username) {
    try {
      const username = await generateUniqueUsername(user.email);
      await prisma.user.update({ where: { id: user.id }, data: { username } });
      user.username = username;
    } catch {
      const fresh = await prisma.user.findUnique({ where: { id: user.id }, select: { username: true } });
      if (fresh?.username) user.username = fresh.username;
    }
  }
  return NextResponse.json(withAbsoluteMedia({ user }));
}

/** Update own profile: username (one-time/changeable), displayName, bio, avatar. */
export async function PATCH(req: Request) {
  const sessionUser = await getSessionUser(req);
  if (!sessionUser) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  let body: { username?: string; displayName?: string; bio?: string; avatar?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: Record<string, string | null> = {};
  if (typeof body.username === "string") {
    const username = body.username.trim().toLowerCase();
    if (!isValidUsername(username)) {
      return NextResponse.json({ error: "Invalid username" }, { status: 400 });
    }
    const taken = await prisma.user.findFirst({
      where: { username, NOT: { id: sessionUser.id } },
      select: { id: true },
    });
    if (taken) return NextResponse.json({ error: "Username is taken" }, { status: 409 });
    data.username = username;
  }
  if (typeof body.displayName === "string") data.displayName = body.displayName.trim().slice(0, 60) || null;
  if (typeof body.bio === "string") data.bio = body.bio.trim().slice(0, 280) || null;
  if (typeof body.avatar === "string") data.avatar = body.avatar.trim() || null;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: sessionUser.id },
    data,
    select: { id: true, email: true, role: true, username: true, displayName: true, avatar: true, bio: true },
  });
  return NextResponse.json(withAbsoluteMedia({ ok: true, user }));
}
