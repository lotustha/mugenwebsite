/**
 * GET /api/admin/oauth/admob
 * Initiates the Google OAuth 2.0 flow for AdMob read access.
 * Redirects the admin's browser to Google's consent screen.
 *
 * Requires in .env:
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 *   NEXT_PUBLIC_SITE_URL  (used to build the redirect URI)
 */
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";

export async function GET() {
  // Must be authenticated admin
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(
      new URL("/admin/settings?error=missing_google_client_id", process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000")
    );
  }

  const siteUrl     = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const redirectUri = `${siteUrl}/api/admin/oauth/admob/callback`;

  // CSRF state token
  const state = randomBytes(24).toString("hex");
  const jar   = await cookies();
  jar.set("admob_oauth_state", state, { httpOnly: true, secure: process.env.NODE_ENV === "production", maxAge: 600, path: "/" });

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: "code",
    scope:         "https://www.googleapis.com/auth/admob.readonly email",
    access_type:   "offline",
    prompt:        "consent",    // always show consent to guarantee a refresh_token
    state,
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
