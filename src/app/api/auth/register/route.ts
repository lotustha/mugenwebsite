import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { issueMobileToken } from "@/lib/mobile-token";
import { isValidUsername, suggestUsername } from "@/lib/username";

export const dynamic = "force-dynamic";

/**
 * Public sign-up (email + password). Creates a USER and returns a mobile bearer
 * token so the Flutter app can authenticate immediately. Web clients can ignore
 * the token and call signIn("credentials") to get a cookie session.
 */
export async function POST(req: Request) {
  let body: { email?: string; password?: string; username?: string; displayName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const displayName = typeof body.displayName === "string" ? body.displayName.trim().slice(0, 60) : null;

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  // Username: use provided or derive a unique one from the email.
  let username = typeof body.username === "string" ? body.username.trim().toLowerCase() : suggestUsername(email);
  if (!isValidUsername(username)) {
    return NextResponse.json(
      { error: "Username must be 3–20 chars: letters, digits, underscore; start with a letter" },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  // Ensure username uniqueness, appending digits if taken.
  let candidate = username;
  for (let i = 0; i < 50; i++) {
    const taken = await prisma.user.findUnique({ where: { username: candidate }, select: { id: true } });
    if (!taken) break;
    candidate = `${username}${Math.floor(10 + Math.random() * 89)}`.slice(0, 20);
  }
  username = candidate;

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, password: hashed, role: "USER", username, displayName: displayName ?? username },
    select: { id: true, email: true, role: true, username: true, displayName: true, avatar: true },
  });

  const token = issueMobileToken({ id: user.id, email: user.email, role: user.role });
  return NextResponse.json({ ok: true, token, user }, { status: 201 });
}
