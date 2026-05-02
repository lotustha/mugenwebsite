/**
 * GET /api/admin/income/unity?start=YYYY-MM-DD&end=YYYY-MM-DD
 *
 * Unity Ads Monetization Statistics API v1.
 * Docs: https://docs.unity.com/ads/en-us/manual/MonetizationStatsAPI
 *
 * Credentials in SystemSetting:
 *   unity_org_id  — Organisation ID (number from Unity Dashboard URL)
 *   unity_api_key — Monetization Stats API Key (long hex string from
 *                   Unity Dashboard → Monetize → Setup → API Management
 *                   → "Monetization Stats API Access")
 *
 * Auth: Authorization: Token <apiKey>  (NOT Basic auth)
 * Base: https://monetization.api.unity.com/stats/v1/operate/organizations/:orgId
 * Dates: ISO 8601 UTC  e.g. 2026-05-01T00:00:00Z
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET(req: Request) {
  if (!await requireAuth()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start") ?? new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
  const end   = searchParams.get("end")   ?? new Date().toISOString().slice(0, 10);

  try {
    const rows = await prisma.systemSetting.findMany({
      where: { key: { in: ["unity_org_id", "unity_api_key", "unity_key_id"] } },
    });
    const cfg = Object.fromEntries(rows.map(r => [r.key, r.value]));

    const orgId  = cfg.unity_org_id;
    const apiKey = cfg.unity_api_key || cfg.unity_key_id || "";

    if (!orgId || !apiKey) {
      return NextResponse.json({ configured: false, error: "Unity Ads credentials not set" });
    }

    // ISO 8601 UTC — required by Unity's API
    const startISO = `${start}T00:00:00Z`;
    const endISO   = `${end}T23:59:59Z`;

    const params = new URLSearchParams({
      scale:  "day",
      start:  startISO,
      end:    endISO,
      fields: "revenue_sum,adrequest_count,available_sum,start_count,view_count",
    });

    const url = `https://monetization.api.unity.com/stats/v1/operate/organizations/${orgId}?${params}`;

    const res = await fetch(url, {
      headers: {
        // Correct auth: Token <key>  (not Basic)
        Authorization: `Token ${apiKey}`,
        Accept:        "application/json",
      },
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) {
      const txt = await res.text();
      let msg = `Unity API ${res.status}`;
      try { msg = JSON.parse(txt)?.message ?? msg; } catch { msg = txt.slice(0, 300) || msg; }
      return NextResponse.json({ configured: true, error: msg });
    }

    // Response is CSV by default; we requested JSON but handle both
    const contentType = res.headers.get("content-type") ?? "";
    const text = await res.text();

    let daily: { date: string; earnings: number; impressions: number; requests: number }[] = [];

    if (contentType.includes("json")) {
      const data = JSON.parse(text);
      const rows: any[] = Array.isArray(data) ? data : (data.rows ?? data.data ?? data.breakdown ?? []);
      daily = rows.map((r: any) => ({
        // Unity returns "timestamp": "2026-04-01T00:00:00.000Z"
        date:        (r.timestamp ?? r.date ?? r.start ?? "").slice(0, 10),
        earnings:    parseFloat(r.revenue_sum  ?? r.revenue     ?? "0"),
        impressions: parseInt(r.start_count   ?? r.starts      ?? r.impressions  ?? "0"),
        requests:    parseInt(r.adrequest_count ?? r.requests   ?? "0"),
      })).filter(d => d.date);
    } else {
      // Parse CSV — first line is headers
      const lines = text.trim().split("\n").filter(Boolean);
      if (lines.length > 1) {
        const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
        const idxDate = headers.findIndex(h => h.toLowerCase().includes("date") || h.toLowerCase().includes("timestamp") || h.toLowerCase().includes("start"));
        const idxRev  = headers.findIndex(h => h.toLowerCase().includes("revenue"));
        const idxImp  = headers.findIndex(h => h.toLowerCase().includes("start_count") || h.toLowerCase().includes("starts") || h.toLowerCase().includes("impression"));
        const idxReq  = headers.findIndex(h => h.toLowerCase().includes("adrequest") || h.toLowerCase().includes("request"));

        for (const line of lines.slice(1)) {
          const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
          const date = idxDate >= 0 ? cols[idxDate]?.slice(0, 10) : "";
          if (!date) continue;
          daily.push({
            date,
            earnings:    idxRev >= 0 ? parseFloat(cols[idxRev] ?? "0") : 0,
            impressions: idxImp >= 0 ? parseInt(cols[idxImp]  ?? "0") : 0,
            requests:    idxReq >= 0 ? parseInt(cols[idxReq]  ?? "0") : 0,
          });
        }
      }
    }

    const totalEarnings    = daily.reduce((s, r) => s + r.earnings, 0);
    const totalImpressions = daily.reduce((s, r) => s + r.impressions, 0);
    const totalRequests    = daily.reduce((s, r) => s + r.requests, 0);

    return NextResponse.json({
      configured:  true,
      source:      "unity",
      currency:    "USD",
      total:       parseFloat(totalEarnings.toFixed(2)),
      impressions: totalImpressions,
      requests:    totalRequests,
      daily,
    });
  } catch (e: any) {
    return NextResponse.json({ configured: true, error: e.message ?? "Failed" });
  }
}
