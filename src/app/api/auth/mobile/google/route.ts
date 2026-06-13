import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { issueMobileToken } from "@/lib/mobile-token";
import { suggestUsername } from "@/lib/username";

export const dynamic = "force-dynamic";

/**
 * Mobile Google sign-in. The Flutter app obtains a Google ID token via the
 * native Google Sign-In SDK and POSTs it here. We verify it against Google's
 * tokeninfo endpoint, upsert the user (email-linked), and return a bearer token.
 *
 * Accepts any audience in GOOGLE_OAUTH_AUDIENCES (comma-separated: web +
 * android + ios client IDs), falling back to GOOGLE_CLIENT_ID.
 */
export async function POST(req: Request) {
  let body: { idToken?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const idToken = typeof body.idToken === "string" ? body.idToken : "";
  if (!idToken) return NextResponse.json({ error: "idToken is required" }, { status: 400 });

  // Verify with Google.
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  if (!res.ok) return NextResponse.json({ error: "Invalid Google token" }, { status: 401 });
  const info = (await res.json()) as {
    aud?: string; email?: string; email_verified?: string | boolean; name?: string; picture?: string;
  };

  const allowed = (process.env.GOOGLE_OAUTH_AUDIENCES || process.env.GOOGLE_CLIENT_ID || "")
    .split(",").map((s) => s.trim()).filter(Boolean);
  if (allowed.length && (!info.aud || !allowed.includes(info.aud))) {
    return NextResponse.json({ error: "Token audience mismatch" }, { status: 401 });
  }
  const email = info.email?.trim().toLowerCase();
  const verified = info.email_verified === true || info.email_verified === "true";
  if (!email || !verified) {
    return NextResponse.json({ error: "Unverified Google account" }, { status: 401 });
  }

  // Upsert: link to existing email-matched user, else create.
  let user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, role: true, username: true, displayName: true, avatar: true },
  });
  if (!user) {
    // Generate a unique username.
    let username = suggestUsername(email);
    for (let i = 0; i < 50; i++) {
      const taken = await prisma.user.findUnique({ where: { username }, select: { id: true } });
      if (!taken) break;
      username = `${suggestUsername(email)}${Math.floor(10 + Math.random() * 89)}`.slice(0, 20);
    }
    user = await prisma.user.create({
      data: {
        email,
        role: "USER",
        username,
        displayName: info.name?.slice(0, 60) || username,
        avatar: info.picture || null,
      },
      select: { id: true, email: true, role: true, username: true, displayName: true, avatar: true },
    });
  }

  const token = issueMobileToken({ id: user.id, email: user.email, role: user.role });
  return NextResponse.json({ ok: true, token, user });
}
