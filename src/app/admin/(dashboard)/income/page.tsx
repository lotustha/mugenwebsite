"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";

// ─── Design tokens ────────────────────────────────────────────────────────────
const BG    = "#070B14";
const CARD  = "rgba(13,20,40,0.8)";
const BDR   = "rgba(255,255,255,0.07)";
const MUTED = "rgba(222,229,255,0.4)";
const DIM   = "rgba(222,229,255,0.2)";

const ADMOB  = "#3B82F6"; // blue
const UNITY  = "#8B5CF6"; // purple
const TOTAL  = "#10B981"; // emerald
const AMBER  = "#F59E0B"; // amber

// ─── Count-up animation hook ──────────────────────────────────────────────────
function useCountUp(target: number, duration = 750) {
  const [display, setDisplay] = useState(target);
  const prevRef  = useRef(target);
  const rafRef   = useRef<number>(0);

  useEffect(() => {
    const from = prevRef.current;
    if (from === target) return;
    let startTime: number | null = null;

    const tick = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased    = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplay(from + (target - from) * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(target);
        prevRef.current = target;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return display;
}

function AnimatedNumber({ value, fmt: format }: { value: number; fmt: (n: number) => string }) {
  const display = useCountUp(value);
  return <>{format(display)}</>;
}

// ─── localStorage cache ───────────────────────────────────────────────────────
const CACHE_KEY = (start: string, end: string) => `mugen_income_v1_${start}_${end}`;

function readCache(key: string): any | null {
  try { return JSON.parse(localStorage.getItem(key) ?? "null"); } catch { return null; }
}
function writeCache(key: string, data: any) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt  = (d: Date) => d.toISOString().slice(0, 10);
const usd  = (v: number, dec = 2) =>
  v.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: dec, maximumFractionDigits: dec });
const num  = (v: number) => v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v/1_000).toFixed(1)}K` : String(v);

function pct(a: number, b: number) {
  if (!b) return null;
  const diff = ((a - b) / b) * 100;
  return { diff: parseFloat(diff.toFixed(1)), up: diff >= 0 };
}

// ─── Date ranges ─────────────────────────────────────────────────────────────
const RANGES = [
  { label: "Today",       start: () => fmt(new Date()),                                                                                     end: () => fmt(new Date()) },
  { label: "Yesterday",   start: () => fmt(new Date(Date.now() - 86400000)),                                                                end: () => fmt(new Date(Date.now() - 86400000)) },
  { label: "7D",          start: () => fmt(new Date(Date.now() - 6  * 86400000)),                                                           end: () => fmt(new Date()) },
  { label: "30D",         start: () => fmt(new Date(Date.now() - 29 * 86400000)),                                                           end: () => fmt(new Date()) },
  { label: "90D",         start: () => fmt(new Date(Date.now() - 89 * 86400000)),                                                           end: () => fmt(new Date()) },
  { label: "This Month",  start: () => fmt(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),                                    end: () => fmt(new Date()) },
  { label: "Last Month",  start: () => fmt(new Date(new Date().getFullYear(), new Date().getMonth()-1, 1)),                                  end: () => fmt(new Date(new Date().getFullYear(), new Date().getMonth(), 0)) },
  { label: "12 Months",   start: () => fmt(new Date(new Date().getFullYear(), new Date().getMonth()-11, 1)),                                 end: () => fmt(new Date()) },
] as const;

// ─── SVG Area / Bar chart ─────────────────────────────────────────────────────
function RevenueChart({
  daily, chartType, network,
}: {
  daily: any[];
  chartType: "area" | "bar";
  network: "all" | "admob" | "unity";
}) {
  const W = 900, H = 200, PAD_L = 52, PAD_B = 28;
  const cW = W - PAD_L;
  const cH = H - PAD_B;

  const getValue = (d: any) =>
    network === "admob" ? d.admob : network === "unity" ? d.unity : d.total;

  const color  = network === "admob" ? ADMOB : network === "unity" ? UNITY : TOTAL;
  const values = daily.map(getValue);
  const maxV   = Math.max(...values, 0.01);
  const n      = daily.length;

  const xOf = (i: number) => PAD_L + (n > 1 ? (i / (n - 1)) * cW : cW / 2);
  const yOf = (v: number) => (H - PAD_B) - (v / maxV) * cH;

  // Y-axis labels
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    y:  (H - PAD_B) - f * cH,
    v:  maxV * f,
  }));

  // X-axis labels — show ~5 evenly spaced
  const step   = Math.max(1, Math.floor(n / 5));
  const xLabels = daily
    .map((d, i) => ({ i, label: d.date?.slice(5) ?? "" }))
    .filter((_, i) => i % step === 0 || i === n - 1);

  if (chartType === "area") {
    const pts  = daily.map((d, i) => [xOf(i), yOf(getValue(d))] as [number, number]);
    const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
    const area = `${line} L${pts[pts.length-1][0].toFixed(1)},${(H-PAD_B).toFixed(1)} L${PAD_L},${(H-PAD_B).toFixed(1)} Z`;

    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: "auto", maxHeight: 220 }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {yTicks.map(t => (
          <g key={t.v}>
            <line x1={PAD_L} y1={t.y} x2={W} y2={t.y} stroke={BDR} strokeWidth="1" />
            <text x={PAD_L - 6} y={t.y + 4} textAnchor="end" fontSize="10" fill={DIM} fontFamily="monospace">
              {t.v >= 1 ? `$${t.v.toFixed(0)}` : t.v > 0 ? `$${t.v.toFixed(2)}` : "$0"}
            </text>
          </g>
        ))}
        {/* Area fill */}
        <path d={area} fill="url(#areaGrad)" />
        {/* Line */}
        <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
        {/* Dots on hover — rendered as tiny circles */}
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3" fill={color} fillOpacity="0.8">
            <title>{`${daily[i]?.date}: ${usd(getValue(daily[i]))}`}</title>
          </circle>
        ))}
        {/* X-axis labels */}
        {xLabels.map(({ i, label }) => (
          <text key={i} x={xOf(i)} y={H - 4} textAnchor="middle" fontSize="10" fill={DIM} fontFamily="monospace">
            {label}
          </text>
        ))}
        {/* Baseline */}
        <line x1={PAD_L} y1={H-PAD_B} x2={W} y2={H-PAD_B} stroke={BDR} strokeWidth="1" />
      </svg>
    );
  }

  // Bar chart
  const barW = Math.max(2, (cW / n) * 0.7);
  const gap  = cW / n;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: "auto", maxHeight: 220 }}>
      {/* Grid */}
      {yTicks.map(t => (
        <g key={t.v}>
          <line x1={PAD_L} y1={t.y} x2={W} y2={t.y} stroke={BDR} strokeWidth="1" />
          <text x={PAD_L - 6} y={t.y + 4} textAnchor="end" fontSize="10" fill={DIM} fontFamily="monospace">
            {t.v >= 1 ? `$${t.v.toFixed(0)}` : t.v > 0 ? `$${t.v.toFixed(2)}` : "$0"}
          </text>
        </g>
      ))}
      {/* Bars — stacked admob + unity when network === all */}
      {daily.map((d, i) => {
        const x   = PAD_L + i * gap + (gap - barW) / 2;
        const bAdm = network !== "unity" ? (d.admob / maxV) * cH : 0;
        const bUni = network !== "admob" ? (d.unity / maxV) * cH : 0;
        const yAdm = H - PAD_B - bAdm - bUni;
        const yUni = H - PAD_B - bUni;
        return (
          <g key={i}>
            <title>{`${d.date}: ${usd(getValue(d))}`}</title>
            {bAdm > 0 && <rect x={x} y={yAdm} width={barW} height={bAdm} fill={ADMOB} fillOpacity="0.75" rx="1" />}
            {bUni > 0 && <rect x={x} y={yUni} width={barW} height={bUni} fill={UNITY} fillOpacity="0.75" rx="1" />}
          </g>
        );
      })}
      {/* X labels */}
      {xLabels.map(({ i, label }) => (
        <text key={i} x={PAD_L + i * gap + gap/2} y={H-4} textAnchor="middle" fontSize="10" fill={DIM} fontFamily="monospace">
          {label}
        </text>
      ))}
      <line x1={PAD_L} y1={H-PAD_B} x2={W} y2={H-PAD_B} stroke={BDR} strokeWidth="1" />
    </svg>
  );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, rawValue, fmt: formatter, sub, color, trend }: {
  label: string;
  rawValue: number;
  fmt: (n: number) => string;
  sub?: string;
  color: string;
  trend?: { diff: number; up: boolean } | null;
}) {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-3"
      style={{ background: CARD, border: `1px solid ${BDR}`, boxShadow: `0 0 0 0.5px ${color}18` }}>
      <div className="flex items-center justify-between">
        <p className="font-body text-[0.625rem] uppercase tracking-widest font-semibold" style={{ color: DIM }}>
          {label}
        </p>
        {trend && (
          <span className="font-mono text-[0.625rem] font-semibold flex items-center gap-0.5 px-1.5 py-0.5 rounded"
            style={{
              background: trend.up ? "rgba(16,185,129,0.1)" : "rgba(248,113,113,0.1)",
              color:      trend.up ? "#34d399" : "#f87171",
            }}>
            {trend.up ? "▲" : "▼"} {Math.abs(trend.diff)}%
          </span>
        )}
      </div>
      <p className="font-headline text-2xl font-bold" style={{ color }}>
        <AnimatedNumber value={rawValue} fmt={formatter} />
      </p>
      {sub && <p className="font-body text-xs" style={{ color: DIM }}>{sub}</p>}
    </div>
  );
}

// ─── Monthly aggregation ──────────────────────────────────────────────────────
function aggregateByMonth(daily: any[]) {
  const months: Record<string, { month: string; admob: number; unity: number; total: number; impressions: number }> = {};
  for (const d of daily) {
    const m = d.date?.slice(0, 7) ?? "";
    if (!m) continue;
    if (!months[m]) months[m] = { month: m, admob: 0, unity: 0, total: 0, impressions: 0 };
    months[m].admob       += d.admob  ?? 0;
    months[m].unity       += d.unity  ?? 0;
    months[m].total       += d.total  ?? 0;
    months[m].impressions += d.impressions ?? 0;
  }
  return Object.values(months).sort((a, b) => b.month.localeCompare(a.month));
}

// ─── Upcoming payment card ────────────────────────────────────────────────────
function UpcomingPaymentCard() {
  const [data, setData]     = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const now        = new Date();
  const monthStart = fmt(new Date(now.getFullYear(), now.getMonth(), 1));
  const todayStr   = fmt(now);

  // NET 60 payment cycle — both AdMob and Unity pay 2 months after the earning month
  // e.g. May earnings → paid in July
  const admobPay = new Date(now.getFullYear(), now.getMonth() + 2, 21);  // ~21st, 2 months out
  const unityPay = new Date(now.getFullYear(), now.getMonth() + 3, 0);  // last day, 2 months out
  const fmtDate  = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  useEffect(() => {
    const key    = CACHE_KEY(monthStart, todayStr);
    const cached = readCache(key);
    if (cached) { setData(cached); setLoading(false); }
    fetch(`/api/admin/income?start=${monthStart}&end=${todayStr}`)
      .then(r => r.json())
      .then(d => { setData(d); writeCache(key, d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []); // eslint-disable-line

  const admobEarnings = data?.totals?.admob  ?? 0;
  const unityEarnings = data?.totals?.unity  ?? 0;
  const combined      = admobEarnings + unityEarnings;
  const THRESHOLD     = 100; // $100 minimum payout threshold
  const progress      = Math.min((combined / THRESHOLD) * 100, 100);
  const thresholdMet  = combined >= THRESHOLD;
  const monthName     = now.toLocaleString("default", { month: "long" });

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BDR}` }}>
      {/* Header */}
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: BDR }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: thresholdMet ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.12)" }}>
            <svg viewBox="0 0 16 16" fill={thresholdMet ? TOTAL : AMBER} className="w-3.5 h-3.5">
              <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
            </svg>
          </div>
          <p className="font-headline text-sm font-semibold text-white">Upcoming Payment</p>
        </div>
        <span className="font-body text-[0.625rem]" style={{ color: DIM }}>{monthName} earnings</span>
      </div>

      <div className="p-5 space-y-4">
        {loading ? (
          <div className="h-20 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
        ) : (
          <>
            {/* Total + threshold progress */}
            <div>
              <div className="flex items-end justify-between mb-2">
                <div>
                  <p className="font-body text-[0.625rem] uppercase tracking-widest font-semibold mb-1" style={{ color: DIM }}>
                    Estimated payout
                  </p>
                  <p className="font-headline text-2xl font-bold" style={{ color: thresholdMet ? TOTAL : "rgba(222,229,255,0.8)" }}>
                    <AnimatedNumber value={combined} fmt={n => usd(n)} />
                  </p>
                </div>
                {thresholdMet ? (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full font-body text-[0.625rem] font-semibold mb-0.5"
                    style={{ background: "rgba(16,185,129,0.12)", color: "#34d399", border: "1px solid rgba(16,185,129,0.25)" }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Threshold met
                  </span>
                ) : (
                  <span className="font-body text-[0.625rem] mb-0.5" style={{ color: DIM }}>
                    {usd(THRESHOLD - combined)} to go
                  </span>
                )}
              </div>

              {/* Progress bar */}
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${progress}%`,
                    background: thresholdMet
                      ? `linear-gradient(90deg,${TOTAL},#34d399)`
                      : `linear-gradient(90deg,${ADMOB},${UNITY})`,
                  }} />
              </div>
              <p className="font-body text-[0.5625rem] mt-1" style={{ color: DIM }}>
                ${THRESHOLD} minimum payout threshold
              </p>
            </div>

            {/* Per-network breakdown with payment dates */}
            <div className="grid grid-cols-2 gap-3">
              {/* AdMob */}
              <div className="rounded-xl p-4 space-y-2"
                style={{ background: `${ADMOB}0d`, border: `1px solid ${ADMOB}28` }}>
                <p className="font-body text-[0.5625rem] uppercase tracking-widest font-semibold" style={{ color: `${ADMOB}99` }}>
                  AdMob
                </p>
                <p className="font-headline text-base font-bold" style={{ color: ADMOB }}>
                  <AnimatedNumber value={admobEarnings} fmt={n => usd(n)} />
                </p>
                <div className="flex items-center gap-1.5">
                  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3 flex-none" style={{ color: `${ADMOB}70` }}>
                    <circle cx="6" cy="6" r="5" /><path strokeLinecap="round" d="M6 3.5V6l1.5 1.5" />
                  </svg>
                  <p className="font-body text-[0.5625rem]" style={{ color: DIM }}>
                    ~{fmtDate(admobPay)}
                  </p>
                </div>
              </div>

              {/* Unity Ads */}
              <div className="rounded-xl p-4 space-y-2"
                style={{ background: `${UNITY}0d`, border: `1px solid ${UNITY}28` }}>
                <p className="font-body text-[0.5625rem] uppercase tracking-widest font-semibold" style={{ color: `${UNITY}99` }}>
                  Unity Ads
                </p>
                <p className="font-headline text-base font-bold" style={{ color: UNITY }}>
                  <AnimatedNumber value={unityEarnings} fmt={n => usd(n)} />
                </p>
                <div className="flex items-center gap-1.5">
                  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3 flex-none" style={{ color: `${UNITY}70` }}>
                    <circle cx="6" cy="6" r="5" /><path strokeLinecap="round" d="M6 3.5V6l1.5 1.5" />
                  </svg>
                  <p className="font-body text-[0.5625rem]" style={{ color: DIM }}>
                    ~{fmtDate(unityPay)}
                  </p>
                </div>
              </div>
            </div>

            {/* Note */}
            <p className="font-body text-[0.5625rem] leading-relaxed" style={{ color: "rgba(255,255,255,0.18)" }}>
              Payment dates are estimates (NET 60 cycle). AdMob pays ~21st of the month after next; Unity pays ~end of the month after next. Actual dates depend on your account settings and payment method.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function IncomePage() {
  const [rangeIdx,   setRangeIdx]   = useState(3); // 30D default (Today=0, Yesterday=1, 7D=2, 30D=3)
  const [view,       setView]       = useState<"day"|"month">("day");
  const [chartType,  setChartType]  = useState<"area"|"bar">("area");
  const [network,    setNetwork]    = useState<"all"|"admob"|"unity">("all");
  const [data,       setData]       = useState<any>(null);
  const [loading,    setLoading]    = useState(true);
  const [sort,       setSort]       = useState<{ col: string; dir: 1|-1 }>({ col: "date", dir: -1 });

  const range = RANGES[rangeIdx];

  const load = useCallback(async () => {
    const start   = range.start();
    const end     = range.end();
    const cacheKey = CACHE_KEY(start, end);

    // Show cached data instantly — no spinner on return visits
    const cached = readCache(cacheKey);
    if (cached) {
      setData(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    // Always fetch fresh in background — numbers animate if values changed
    try {
      const res   = await fetch(`/api/admin/income?start=${start}&end=${end}`);
      const fresh = await res.json();
      setData(fresh);
      writeCache(cacheKey, fresh);
    } catch {
      if (!cached) setData(null);
    }
    setLoading(false);
  }, [range]);

  useEffect(() => { load(); }, [load]);

  const totals: any = data?.totals ?? {};
  const admob:  any = data?.admob  ?? {};
  const unity:  any = data?.unity  ?? {};
  const daily:  any[] = data?.daily  ?? [];

  // Month aggregates
  const monthly = useMemo(() => aggregateByMonth(daily), [daily]);

  // Chart data (month view = aggregate)
  const chartData = useMemo(() => {
    if (view === "month") return monthly.slice().reverse().map(m => ({ ...m, date: m.month }));
    return daily;
  }, [view, daily, monthly]);

  // Sorted table data
  const tableData = useMemo(() => {
    const arr = view === "day" ? [...daily] : [...monthly].map(m => ({ ...m, date: m.month }));
    return arr.sort((a, b) => {
      const av = a[sort.col] ?? 0, bv = b[sort.col] ?? 0;
      if (typeof av === "string") return av.localeCompare(bv) * sort.dir;
      return (av - bv) * sort.dir;
    });
  }, [daily, monthly, view, sort]);

  const sortBy = (col: string) =>
    setSort(s => s.col === col ? { col, dir: (s.dir * -1) as 1|-1 } : { col, dir: -1 });

  const notConfigured = !admob.configured && !unity.configured;

  // CSV export
  const exportCsv = () => {
    const cols = ["Date", "AdMob ($)", "Unity ($)", "Total ($)", "Impressions", "eCPM ($)"];
    const rows = tableData.map(d =>
      [d.date, d.admob?.toFixed(2), d.unity?.toFixed(2), d.total?.toFixed(2), d.impressions, d.ecpm?.toFixed(4)]
    );
    const csv  = [cols, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a    = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "income.csv"; a.click();
  };

  const thCls = "px-4 py-3 text-left font-body text-[0.5625rem] uppercase tracking-widest font-semibold cursor-pointer select-none hover:text-primary transition-colors";

  return (
    <div className="space-y-6 max-w-6xl" style={{ color: MUTED }}>

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-headline text-2xl font-bold text-white">Ad Revenue Analytics</h1>
          <p className="font-body text-sm mt-0.5" style={{ color: MUTED }}>
            {range.start()} — {range.end()}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Network filter */}
          {(["all","admob","unity"] as const).map(n => (
            <button key={n} type="button" onClick={() => setNetwork(n)}
              className="px-3 py-1.5 rounded-lg font-body text-xs cursor-pointer transition-all"
              style={{
                background: network === n
                  ? (n === "admob" ? `${ADMOB}22` : n === "unity" ? `${UNITY}22` : `${TOTAL}22`)
                  : "transparent",
                color: network === n
                  ? (n === "admob" ? ADMOB : n === "unity" ? UNITY : TOTAL)
                  : MUTED,
                border: `1px solid ${network === n ? (n === "admob" ? ADMOB : n === "unity" ? UNITY : TOTAL) + "40" : BDR}`,
              }}>
              {n === "all" ? "All Networks" : n === "admob" ? "AdMob" : "Unity Ads"}
            </button>
          ))}
          {/* Refresh */}
          <button onClick={load} disabled={loading} title="Refresh"
            className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors hover:bg-white/5 disabled:opacity-40"
            style={{ border: `1px solid ${BDR}` }}>
            <svg viewBox="0 0 16 16" fill="currentColor" className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} style={{ color: MUTED }}>
              <path d="M1.705 8.005a.75.75 0 0 1 .834.656 5.5 5.5 0 0 0 9.592 2.97l-1.204-1.204a.25.25 0 0 1 .177-.427h3.646a.25.25 0 0 1 .25.25v3.646a.25.25 0 0 1-.427.177l-1.38-1.38A7.002 7.002 0 0 1 1.05 8.84a.75.75 0 0 1 .656-.834Z" />
              <path d="M14.95 7.16a.75.75 0 0 1-1.49.178A5.5 5.5 0 0 0 4.869 4.369l1.204 1.204a.25.25 0 0 1-.177.427H2.25A.25.25 0 0 1 2 5.75V2.104a.25.25 0 0 1 .427-.177l1.38 1.38A7.002 7.002 0 0 1 14.95 7.16Z" />
            </svg>
          </button>
          {/* Settings link */}
          <Link href="/admin/settings"
            className="px-3 py-1.5 rounded-lg font-body text-xs cursor-pointer transition-colors hover:bg-white/5"
            style={{ color: MUTED, border: `1px solid ${BDR}` }}>
            Credentials
          </Link>
        </div>
      </div>

      {/* ── Date range tabs ── */}
      <div className="flex gap-1.5 flex-wrap">
        {RANGES.map((r, i) => (
          <button key={r.label} type="button" onClick={() => setRangeIdx(i)}
            className="px-3.5 py-1.5 rounded-xl font-body text-xs cursor-pointer transition-all"
            style={{
              background: rangeIdx === i ? `${TOTAL}18` : "transparent",
              color:      rangeIdx === i ? TOTAL : MUTED,
              border:     `1px solid ${rangeIdx === i ? TOTAL + "40" : BDR}`,
            }}>
            {r.label}
          </button>
        ))}
      </div>

      {/* ── Not configured ── */}
      {notConfigured && (
        <div className="rounded-2xl p-6 flex items-start gap-4"
          style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <svg viewBox="0 0 16 16" fill={AMBER} className="w-5 h-5 flex-none mt-0.5">
            <path fillRule="evenodd" d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="font-headline text-sm font-semibold" style={{ color: AMBER }}>No ad networks configured</p>
            <p className="font-body text-xs mt-1 leading-relaxed" style={{ color: "rgba(245,158,11,0.65)" }}>
              Add your AdMob and Unity Ads credentials in{" "}
              <Link href="/admin/settings" className="underline hover:text-yellow-300">Settings → Ad Revenue</Link>{" "}
              to start tracking earnings.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Array.from({length: 5}).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: CARD }} />
          ))}
        </div>
      ) : (
        <>
          {/* ── KPI strip ── */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <KpiCard label="Total Revenue"  rawValue={totals.combined ?? 0} fmt={n => usd(n)}                         color={TOTAL} sub={range.label} />
            <KpiCard label="AdMob Revenue"  rawValue={totals.admob ?? 0}    fmt={n => usd(n)}                         color={ADMOB} sub={admob.configured && !admob.error ? `${num(admob.impressions ?? 0)} impr.` : admob.error ? "Error" : "Not set"} />
            <KpiCard label="Unity Revenue"  rawValue={totals.unity ?? 0}    fmt={n => usd(n)}                         color={UNITY} sub={unity.configured && !unity.error ? `${num(unity.impressions ?? 0)} impr.` : unity.error ? "Error" : "Not set"} />
            <KpiCard label="Avg. eCPM"      rawValue={totals.ecpm  ?? 0}    fmt={n => `$${n.toFixed(4)}`}            color={AMBER} sub="per 1K impressions" />
            <KpiCard label="Fill Rate"      rawValue={admob.fillRate ?? 0}  fmt={n => `${n.toFixed(1)}%`}            color="rgba(96,165,250,0.9)" sub="AdMob only" />
          </div>

          {/* ── Upcoming payment ── */}
          <UpcomingPaymentCard />

          {/* ── Chart ── */}
          {chartData.length > 0 && (
            <div className="rounded-2xl p-6" style={{ background: CARD, border: `1px solid ${BDR}` }}>
              <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
                <div>
                  <p className="font-headline text-sm font-semibold text-white">Revenue Over Time</p>
                  <p className="font-body text-xs mt-0.5" style={{ color: DIM }}>
                    {view === "day" ? "Daily breakdown" : "Monthly aggregate"}
                    {network !== "all" && ` · ${network === "admob" ? "AdMob only" : "Unity Ads only"}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {/* View toggle */}
                  <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${BDR}` }}>
                    {(["day","month"] as const).map(v => (
                      <button key={v} type="button" onClick={() => setView(v)}
                        className="px-3 py-1.5 font-body text-xs cursor-pointer transition-all"
                        style={{
                          background: view === v ? "rgba(16,185,129,0.15)" : "transparent",
                          color:      view === v ? TOTAL : MUTED,
                        }}>
                        {v === "day" ? "Daily" : "Monthly"}
                      </button>
                    ))}
                  </div>
                  {/* Chart type */}
                  <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${BDR}` }}>
                    {(["area","bar"] as const).map(t => (
                      <button key={t} type="button" onClick={() => setChartType(t)}
                        className="px-3 py-1.5 font-body text-xs cursor-pointer transition-all"
                        style={{
                          background: chartType === t ? "rgba(255,255,255,0.07)" : "transparent",
                          color:      chartType === t ? "rgba(222,229,255,0.8)" : MUTED,
                        }}>
                        {t === "area" ? (
                          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                            <path d="M1 3.75A.75.75 0 0 1 1.75 3h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 3.75ZM1 7.5a.75.75 0 0 1 .75-.75h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 7.5ZM1 11.25a.75.75 0 0 1 .75-.75h12.5a.75.75 0 0 1 0 1.5H1.75a.75.75 0 0 1-.75-.75Z" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                            <path d="M1 11.25a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5A.75.75 0 0 1 1 11.25Zm4-3.5a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5A.75.75 0 0 1 5 7.75Zm4-3.5a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5A.75.75 0 0 1 9 4.25Z" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                  {/* Legend */}
                  {network === "all" && (
                    <div className="hidden sm:flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: ADMOB }} />
                        <span className="font-body text-[0.625rem]" style={{ color: MUTED }}>AdMob</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: UNITY }} />
                        <span className="font-body text-[0.625rem]" style={{ color: MUTED }}>Unity</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <RevenueChart daily={chartData} chartType={chartType} network={network} />
            </div>
          )}

          {/* ── Network breakdown cards ── */}
          {(admob.configured || unity.configured) && (
            <div className="grid sm:grid-cols-2 gap-4">
              {admob.configured && !admob.error && (
                <div className="rounded-2xl p-5 space-y-4" style={{ background: CARD, border: `1px solid ${ADMOB}25` }}>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: ADMOB, boxShadow: `0 0 6px ${ADMOB}80` }} />
                    <p className="font-headline text-sm font-semibold text-white">Google AdMob</p>
                    <span className="ml-auto font-headline text-lg font-bold" style={{ color: ADMOB }}>{usd(totals.admob ?? 0)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Impressions", value: num(admob.impressions ?? 0) },
                      { label: "Requests",    value: num(admob.requests    ?? 0) },
                      { label: "eCPM",        value: `$${(admob.ecpm ?? 0).toFixed(4)}` },
                      { label: "Clicks",      value: num(admob.clicks      ?? 0) },
                      { label: "Fill Rate",   value: `${(admob.fillRate ?? 0).toFixed(1)}%` },
                    ].map(s => (
                      <div key={s.label}>
                        <p className="font-body text-[0.5625rem] uppercase tracking-widest mb-0.5" style={{ color: DIM }}>{s.label}</p>
                        <p className="font-headline text-sm font-bold text-white">{s.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {unity.configured && !unity.error && (
                <div className="rounded-2xl p-5 space-y-4" style={{ background: CARD, border: `1px solid ${UNITY}25` }}>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: UNITY, boxShadow: `0 0 6px ${UNITY}80` }} />
                    <p className="font-headline text-sm font-semibold text-white">Unity Ads</p>
                    <span className="ml-auto font-headline text-lg font-bold" style={{ color: UNITY }}>{usd(totals.unity ?? 0)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Impressions", value: num(unity.impressions ?? 0) },
                    ].map(s => (
                      <div key={s.label}>
                        <p className="font-body text-[0.5625rem] uppercase tracking-widest mb-0.5" style={{ color: DIM }}>{s.label}</p>
                        <p className="font-headline text-sm font-bold text-white">{s.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Data table ── */}
          {tableData.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ background: CARD, border: `1px solid ${BDR}` }}>
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: BDR }}>
                <div className="flex items-center gap-3">
                  <p className="font-headline text-sm font-semibold text-white">
                    {view === "day" ? "Day-by-Day" : "Monthly Summary"}
                  </p>
                  <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${BDR}` }}>
                    {(["day","month"] as const).map(v => (
                      <button key={v} type="button" onClick={() => setView(v)}
                        className="px-2.5 py-1 font-body text-[0.625rem] cursor-pointer transition-all"
                        style={{ background: view === v ? "rgba(16,185,129,0.12)" : "transparent", color: view === v ? TOTAL : MUTED }}>
                        {v === "day" ? "Daily" : "Monthly"}
                      </button>
                    ))}
                  </div>
                </div>
                <button type="button" onClick={exportCsv}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-body text-xs cursor-pointer transition-all hover:bg-white/5"
                  style={{ color: MUTED, border: `1px solid ${BDR}` }}>
                  <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="M8.75 2.75a.75.75 0 0 0-1.5 0v5.69L5.03 6.22a.75.75 0 0 0-1.06 1.06l3.5 3.5a.75.75 0 0 0 1.06 0l3.5-3.5a.75.75 0 0 0-1.06-1.06L8.75 8.44V2.75Z" />
                    <path d="M3.5 9.75a.75.75 0 0 0-1.5 0v1.5A2.75 2.75 0 0 0 4.75 14h6.5A2.75 2.75 0 0 0 14 11.25v-1.5a.75.75 0 0 0-1.5 0v1.5c0 .69-.56 1.25-1.25 1.25h-6.5c-.69 0-1.25-.56-1.25-1.25v-1.5Z" />
                  </svg>
                  Export CSV
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${BDR}`, background: "rgba(6,14,32,0.4)" }}>
                      {[
                        { col: "date",        label: view === "day" ? "Date" : "Month" },
                        { col: "admob",       label: "AdMob ($)" },
                        { col: "unity",       label: "Unity ($)" },
                        { col: "total",       label: "Total ($)" },
                        { col: "impressions", label: "Impressions" },
                        { col: "ecpm",        label: "eCPM ($)" },
                      ].map(h => (
                        <th key={h.col} className={thCls}
                          style={{ color: sort.col === h.col ? "rgba(222,229,255,0.8)" : DIM }}
                          onClick={() => sortBy(h.col)}>
                          {h.label}
                          {sort.col === h.col && <span className="ml-1">{sort.dir === -1 ? "↓" : "↑"}</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.map((d, i) => (
                      <tr key={i} className="transition-colors hover:bg-white/[0.025]"
                        style={{ borderBottom: i < tableData.length - 1 ? `1px solid rgba(255,255,255,0.04)` : "none" }}>
                        <td className="px-4 py-3 font-mono text-xs text-white/80">{d.date}</td>
                        <td className="px-4 py-3 font-mono text-xs" style={{ color: ADMOB }}>{d.admob > 0 ? usd(d.admob) : "—"}</td>
                        <td className="px-4 py-3 font-mono text-xs" style={{ color: UNITY }}>{d.unity > 0 ? usd(d.unity) : "—"}</td>
                        <td className="px-4 py-3 font-mono text-xs font-bold" style={{ color: TOTAL }}>{usd(d.total)}</td>
                        <td className="px-4 py-3 font-mono text-xs text-white/60">{num(d.impressions ?? 0)}</td>
                        <td className="px-4 py-3 font-mono text-xs" style={{ color: AMBER }}>
                          {d.impressions > 0 ? `$${((d.total / d.impressions) * 1000).toFixed(4)}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Totals footer */}
                  <tfoot>
                    <tr style={{ borderTop: `1px solid ${BDR}`, background: "rgba(6,14,32,0.5)" }}>
                      <td className="px-4 py-3 font-body text-[0.625rem] uppercase tracking-widest font-semibold" style={{ color: DIM }}>Total</td>
                      <td className="px-4 py-3 font-mono text-xs font-bold" style={{ color: ADMOB }}>{usd(totals.admob ?? 0)}</td>
                      <td className="px-4 py-3 font-mono text-xs font-bold" style={{ color: UNITY }}>{usd(totals.unity ?? 0)}</td>
                      <td className="px-4 py-3 font-mono text-xs font-bold" style={{ color: TOTAL }}>{usd(totals.combined ?? 0)}</td>
                      <td className="px-4 py-3 font-mono text-xs font-bold text-white/70">{num(totals.impressions ?? 0)}</td>
                      <td className="px-4 py-3 font-mono text-xs font-bold" style={{ color: AMBER }}>
                        {totals.ecpm > 0 ? `$${totals.ecpm.toFixed(4)}` : "—"}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Error notices */}
          {[{ name: "AdMob", src: admob }, { name: "Unity Ads", src: unity }]
            .filter(({ src }) => src.configured && src.error)
            .map(({ name, src }) => (
              <div key={name} className="rounded-xl p-4 flex items-start gap-3"
                style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.15)" }}>
                <svg viewBox="0 0 16 16" fill="#f87171" className="w-4 h-4 flex-none mt-0.5">
                  <path fillRule="evenodd" d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm7.25-3.25a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0v-3.5ZM8 11a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" clipRule="evenodd" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="font-body text-xs font-semibold text-red-400">{name} — {src.error}</p>
                  <Link href="/admin/settings" className="font-body text-xs mt-1 inline-block text-red-400/60 hover:text-red-400 underline">
                    Fix credentials →
                  </Link>
                </div>
              </div>
            ))
          }
        </>
      )}
    </div>
  );
}
