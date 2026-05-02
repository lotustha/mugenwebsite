/**
 * GET /api/admin/oauth/admob/callback?code=...&state=...
 * Google redirects here after the user grants consent.
 * Exchanges the authorization code for tokens, fetches the AdMob account ID,
 * and stores everything in SystemSetting.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const SITE = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${SITE()}/admin/login`);

  const { searchParams } = new URL(req.url);
  const code   = searchParams.get("code");
  const state  = searchParams.get("state");
  const error  = searchParams.get("error");

  const redirectBase = `${SITE()}/admin/settings`;

  // User denied consent
  if (error) {
    return NextResponse.redirect(`${redirectBase}?admob_error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${redirectBase}?admob_error=no_code`);
  }

  // Verify CSRF state
  const jar          = await cookies();
  const savedState   = jar.get("admob_oauth_state")?.value;
  jar.delete("admob_oauth_state");

  if (!savedState || savedState !== state) {
    return NextResponse.redirect(`${redirectBase}?admob_error=invalid_state`);
  }

  const clientId     = process.env.GOOGLE_CLIENT_ID     ?? "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";
  const redirectUri  = `${SITE()}/api/admin/oauth/admob/callback`;

  // ── Step 1: Exchange code for tokens ─────────────────────────────────────────
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }),
  });
  const tokens = await tokenRes.json();

  if (!tokens.refresh_token) {
    console.error("[admob-oauth] No refresh_token in response:", tokens);
    return NextResponse.redirect(`${redirectBase}?admob_error=${encodeURIComponent(tokens.error_description ?? "no_refresh_token")}`);
  }

  // ── Step 2: Fetch AdMob account info ─────────────────────────────────────────
  let accountId    = "";
  let accountEmail = user.email ?? "";

  try {
    const acctRes = await fetch("https://admob.googleapis.com/v1/accounts", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const acctData = await acctRes.json();
    const accounts: any[] = acctData.account ?? [];
    if (accounts.length > 0) {
      accountId = accounts[0].name ?? ""; // e.g. "accounts/pub-XXXXXXXXXXXXXXXX"
    }
  } catch (e) {
    console.warn("[admob-oauth] Could not fetch account ID:", e);
  }

  // ── Step 3: Also get the Google account email from userinfo ───────────────────
  try {
    const infoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const info = await infoRes.json();
    if (info.email) accountEmail = info.email;
  } catch { /* non-fatal */ }

  // ── Step 4: Persist in SystemSetting ─────────────────────────────────────────
  const toSave: Record<string, string> = {
    admob_refresh_token:   tokens.refresh_token,
    admob_account_id:      accountId,
    admob_connected_email: accountEmail,
  };

  await Promise.all(
    Object.entries(toSave).map(([key, value]) =>
      prisma.systemSetting.upsert({ where: { key }, create: { key, value }, update: { value } })
    )
  );

  return NextResponse.redirect(`${redirectBase}?admob_connected=1`);
}
