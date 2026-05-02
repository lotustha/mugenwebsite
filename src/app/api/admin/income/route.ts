/**
 * GET /api/admin/income?start=YYYY-MM-DD&end=YYYY-MM-DD
 * Fetches AdMob + Unity Ads in parallel and merges into a unified daily timeline.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start") ?? new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
  const end   = searchParams.get("end")   ?? new Date().toISOString().slice(0, 10);

  const base = new URL(req.url);
  const qs   = `?start=${start}&end=${end}`;
  const hdrs = { cookie: req.headers.get("cookie") ?? "" };

  const [admob, unity] = await Promise.all([
    fetch(`${base.origin}/api/admin/income/admob${qs}`, { headers: hdrs })
      .then(r => r.json()).catch(() => ({ configured: false, error: "fetch failed" })),
    fetch(`${base.origin}/api/admin/income/unity${qs}`, { headers: hdrs })
      .then(r => r.json()).catch(() => ({ configured: false, error: "fetch failed" })),
  ]);

  type DayEntry = { date: string; admob: number; unity: number; total: number; impressions: number; ecpm: number };
  const dateMap: Record<string, DayEntry> = {};

  const merge = (source: any, key: "admob" | "unity") => {
    for (const d of (source?.daily ?? []) as any[]) {
      if (!d.date) continue;
      const dt = d.date.slice(0, 10);
      if (!dateMap[dt]) dateMap[dt] = { date: dt, admob: 0, unity: 0, total: 0, impressions: 0, ecpm: 0 };
      dateMap[dt][key] += d.earnings ?? 0;
      dateMap[dt].total = dateMap[dt].admob + dateMap[dt].unity;
      dateMap[dt].impressions += d.impressions ?? 0;
    }
  };

  if (!admob.error) merge(admob, "admob");
  if (!unity.error)  merge(unity, "unity");

  // Compute eCPM per day
  const daily = Object.values(dateMap)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(d => ({ ...d, ecpm: d.impressions > 0 ? parseFloat(((d.total / d.impressions) * 1000).toFixed(4)) : 0 }));

  return NextResponse.json({
    admob, unity, daily,
    totals: {
      admob:    admob.total  ?? 0,
      unity:    unity.total  ?? 0,
      combined: (admob.total ?? 0) + (unity.total ?? 0),
      impressions: (admob.impressions ?? 0) + (unity.impressions ?? 0),
      requests:    admob.requests  ?? 0,
      clicks:      admob.clicks    ?? 0,
      ecpm:        (() => {
        const imp = (admob.impressions ?? 0) + (unity.impressions ?? 0);
        const rev = (admob.total ?? 0) + (unity.total ?? 0);
        return imp > 0 ? parseFloat(((rev / imp) * 1000).toFixed(4)) : 0;
      })(),
      fillRate: admob.fillRate ?? 0,
      currency: "USD",
    },
    range: { start, end },
  });
}
