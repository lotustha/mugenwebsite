/**
 * GET /api/admin/income/adsense?start=YYYY-MM-DD&end=YYYY-MM-DD
 *
 * Fetches earnings from Google AdSense Management API v2.
 * Requires in SystemSetting:
 *   adsense_client_id, adsense_client_secret, adsense_refresh_token, adsense_account_id
 *
 * adsense_account_id format: "accounts/pub-XXXXXXXXXXXXXXXX"
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";

async function getAccessToken(clientId: string, clientSecret: string, refreshToken: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id:     clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type:    "refresh_token",
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(data.error_description ?? "Failed to refresh token");
  return data.access_token as string;
}

export async function GET(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start") ?? new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
  const end   = searchParams.get("end")   ?? new Date().toISOString().slice(0, 10);

  try {
    const rows = await prisma.systemSetting.findMany({
      where: { key: { in: ["adsense_client_id","adsense_client_secret","adsense_refresh_token","adsense_account_id"] } },
    });
    const cfg: Record<string, string> = Object.fromEntries(rows.map(r => [r.key, r.value]));

    if (!cfg.adsense_client_id || !cfg.adsense_client_secret || !cfg.adsense_refresh_token || !cfg.adsense_account_id) {
      return NextResponse.json({ configured: false, error: "AdSense credentials not set" }, { status: 200 });
    }

    const accessToken = await getAccessToken(cfg.adsense_client_id, cfg.adsense_client_secret, cfg.adsense_refresh_token);

    const [sy, sm, sd] = start.split("-").map(Number);
    const [ey, em, ed] = end.split("-").map(Number);

    const params = new URLSearchParams({
      dateRange:          "CUSTOM",
      "startDate.year":   String(sy),
      "startDate.month":  String(sm),
      "startDate.day":    String(sd),
      "endDate.year":     String(ey),
      "endDate.month":    String(em),
      "endDate.day":      String(ed),
      "metrics":          "ESTIMATED_EARNINGS",
      "dimensions":       "DATE",
      currencyCode:       "USD",
      reportingTimeZone:  "ACCOUNT_TIME_ZONE",
    });
    // Add additional metrics
    params.append("metrics", "IMPRESSIONS");
    params.append("metrics", "CLICKS");
    params.append("metrics", "PAGE_VIEWS");

    const account = cfg.adsense_account_id.startsWith("accounts/")
      ? cfg.adsense_account_id
      : `accounts/${cfg.adsense_account_id}`;

    const reportRes = await fetch(
      `https://adsense.googleapis.com/v2/${account}/reports:generate?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const report = await reportRes.json();

    if (!reportRes.ok) {
      return NextResponse.json({ configured: true, error: report.error?.message ?? "AdSense API error" }, { status: 200 });
    }

    // Parse rows: each row = [date, earnings, impressions, clicks, pageviews]
    const daily: { date: string; earnings: number; impressions: number; clicks: number }[] = [];
    for (const row of report.rows ?? []) {
      const cells = row.cells ?? [];
      daily.push({
        date:        cells[0]?.value ?? "",
        earnings:    parseFloat(cells[1]?.value ?? "0"),
        impressions: parseInt(cells[2]?.value ?? "0"),
        clicks:      parseInt(cells[3]?.value ?? "0"),
      });
    }

    const totalEarnings    = daily.reduce((s, r) => s + r.earnings, 0);
    const totalImpressions = daily.reduce((s, r) => s + r.impressions, 0);
    const totalClicks      = daily.reduce((s, r) => s + r.clicks, 0);
    const currency         = report.headers?.currencyCode ?? "USD";

    return NextResponse.json({
      configured: true,
      source:     "adsense",
      currency,
      total:      parseFloat(totalEarnings.toFixed(2)),
      impressions: totalImpressions,
      clicks:      totalClicks,
      ctr:         totalImpressions > 0 ? parseFloat(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0,
      daily,
    });
  } catch (e: any) {
    return NextResponse.json({ configured: true, error: e.message ?? "Failed" }, { status: 200 });
  }
}
