import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

/**
 * Admin: grant or revoke a user's verified blue tick.
 * POST { username: string, verified?: boolean }  (verified defaults to true)
 * (Paid self-serve verification comes later; for now it's admin-granted.)
 */
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { username?: string; verified?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const username = body.username?.trim().toLowerCase();
  if (!username) return NextResponse.json({ error: "username is required" }, { status: 400 });
  const verified = body.verified !== false; // default to granting

  try {
    const user = await prisma.user.update({
      where: { username },
      data: { verified },
      select: { id: true, username: true, displayName: true, verified: true },
    });
    return NextResponse.json({ ok: true, user });
  } catch {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
}
