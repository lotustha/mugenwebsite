/**
 * GET /api/admin/income/admob?start=YYYY-MM-DD&end=YYYY-MM-DD
 *
 * Fetches revenue from Google AdMob Network Report API v1.
 * Requires in SystemSetting:
 *   admob_client_id, admob_client_secret, admob_refresh_token, admob_account_id
 *
 * admob_account_id format: "accounts/pub-XXXXXXXXXXXXXXXX"
 * OAuth scope needed: https://www.googleapis.com/auth/admob.readonly
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

async function refreshAccessToken(clientId: string, clientSecret: string, refreshToken: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(data.error_description ?? "Token refresh failed");
  return data.access_token as string;
}

export async function GET(req: Request) {
  if (!await requireAuth()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start") ?? new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
  const end   = searchParams.get("end")   ?? new Date().toISOString().slice(0, 10);

  try {
    const clientId     = process.env.GOOGLE_CLIENT_ID     ?? "";
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";

    const rows = await prisma.systemSetting.findMany({
      where: { key: { in: ["admob_refresh_token", "admob_account_id"] } },
    });
    const cfg = Object.fromEntries(rows.map(r => [r.key, r.value]));

    if (!clientId || !clientSecret || !cfg.admob_refresh_token || !cfg.admob_account_id) {
      return NextResponse.json({ configured: false, error: "AdMob credentials not set" });
    }

    const token = await refreshAccessToken(clientId, clientSecret, cfg.admob_refresh_token);

    const [sy, sm, sd] = start.split("-").map(Number);
    const [ey, em, ed] = end.split("-").map(Number);

    const account = cfg.admob_account_id.startsWith("accounts/") ? cfg.admob_account_id : `accounts/${cfg.admob_account_id}`;

    // AdMob uses POST + streaming NDJSON response
    const res = await fetch(`https://admob.googleapis.com/v1/${account}/networkReport:generate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        reportSpec: {
          dateRange: { startDate: { year: sy, month: sm, day: sd }, endDate: { year: ey, month: em, day: ed } },
          dimensions: ["DATE"],
          metrics: ["ESTIMATED_EARNINGS", "IMPRESSIONS", "AD_REQUESTS", "CLICKS", "MATCH_RATE", "SHOW_RATE"],
          sortConditions: [{ dimension: "DATE", order: "ASCENDING" }],
          currencyCode: "USD",
        },
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ configured: true, error: err?.error?.message ?? `AdMob API ${res.status}` });
    }

    // Parse NDJSON stream
    const text = await res.text();
    const daily: { date: string; earnings: number; impressions: number; requests: number; clicks: number; ecpm: number }[] = [];

    for (const line of text.split("\n")) {
      const trimmed = line.replace(/^,/, "").trim();
      if (!trimmed || trimmed === "[" || trimmed === "]") continue;
      try {
        const obj = JSON.parse(trimmed);
        if (!obj.row) continue;
        const dims = obj.row.dimensionValues ?? {};
        const mets = obj.row.metricValues    ?? {};

        const rawDate = dims.DATE?.value ?? "";
        if (!rawDate || rawDate.length !== 8) continue;
        const date = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;

        // AdMob earnings are in micros (1/1,000,000 of currency)
        const earnings    = (parseInt(mets.ESTIMATED_EARNINGS?.microsValue ?? "0") / 1_000_000);
        const impressions = parseInt(mets.IMPRESSIONS?.integerValue ?? "0");
        const requests    = parseInt(mets.AD_REQUESTS?.integerValue ?? "0");
        const clicks      = parseInt(mets.CLICKS?.integerValue ?? "0");
        const ecpm        = impressions > 0 ? parseFloat(((earnings / impressions) * 1000).toFixed(4)) : 0;

        daily.push({ date, earnings: parseFloat(earnings.toFixed(6)), impressions, requests, clicks, ecpm });
      } catch { /* skip malformed lines */ }
    }

    const totalEarnings    = daily.reduce((s, r) => s + r.earnings, 0);
    const totalImpressions = daily.reduce((s, r) => s + r.impressions, 0);
    const totalRequests    = daily.reduce((s, r) => s + r.requests, 0);
    const totalClicks      = daily.reduce((s, r) => s + r.clicks, 0);
    const avgEcpm          = totalImpressions > 0 ? (totalEarnings / totalImpressions) * 1000 : 0;
    const fillRate         = totalRequests > 0 ? (totalImpressions / totalRequests) * 100 : 0;

    return NextResponse.json({
      configured: true,
      source:     "admob",
      currency:   "USD",
      total:       parseFloat(totalEarnings.toFixed(2)),
      impressions: totalImpressions,
      requests:    totalRequests,
      clicks:      totalClicks,
      ecpm:        parseFloat(avgEcpm.toFixed(4)),
      fillRate:    parseFloat(fillRate.toFixed(2)),
      daily,
    });
  } catch (e: any) {
    return NextResponse.json({ configured: true, error: e.message ?? "Failed" });
  }
}
