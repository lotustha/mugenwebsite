import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { issueMobileToken } from "@/lib/mobile-token";

export const dynamic = "force-dynamic";

/**
 * Mobile email/password login → returns a bearer token (no cookie).
 * The Flutter app stores the token and sends it as `Authorization: Bearer`.
 */
export async function POST(req: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, role: true, password: true, username: true, displayName: true, avatar: true },
  });
  if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const token = issueMobileToken({ id: user.id, email: user.email, role: user.role });
  const { password: _pw, ...safe } = user;
  return NextResponse.json({ ok: true, token, user: safe });
}
