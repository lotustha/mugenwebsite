// Stateless bearer tokens for the mobile (Flutter) app.
//
// Why this exists: the web app authenticates with NextAuth cookies, but the
// mobile app can't ride a cookie session. Instead it logs in once via
// /api/auth/mobile/* and receives a signed token it sends as
// `Authorization: Bearer <token>` on every social API call.
//
// The token is an HMAC-SHA256-signed payload (no DB lookup needed to verify),
// keyed by AUTH_SECRET — the same secret NextAuth already uses. Tokens carry
// the Prisma User.id so the API can use it directly as a foreign key.

import crypto from "node:crypto";

const SECRET = process.env.AUTH_SECRET || "";
const DEFAULT_TTL_DAYS = 60;

export interface MobileTokenPayload {
  id: string; // Prisma User.id
  email: string;
  role: "USER" | "AUTHOR" | "ADMIN";
  exp: number; // unix seconds
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromB64url(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function sign(data: string): string {
  return b64url(crypto.createHmac("sha256", SECRET).update(data).digest());
}

/** Issue a signed token for a user. Defaults to a 60-day expiry. */
export function issueMobileToken(
  user: { id: string; email: string; role: MobileTokenPayload["role"] },
  ttlDays = DEFAULT_TTL_DAYS,
): string {
  if (!SECRET) throw new Error("AUTH_SECRET is not set");
  const nowSec = Math.floor(Date.now() / 1000);
  const payload: MobileTokenPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
    exp: nowSec + ttlDays * 24 * 60 * 60,
  };
  const body = b64url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

/** Verify a token; returns the payload or null if invalid/expired/tampered. */
export function verifyMobileToken(token: string | null | undefined): MobileTokenPayload | null {
  if (!token || !SECRET) return null;
  const dot = token.indexOf(".");
  if (dot < 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expected = sign(body);
  // Constant-time comparison to avoid signature-timing leaks.
  const a = fromB64url(sig);
  const b = fromB64url(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(fromB64url(body).toString("utf8")) as MobileTokenPayload;
    if (!payload?.id || typeof payload.exp !== "number") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
