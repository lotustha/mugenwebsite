"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

// ─── Constants ────────────────────────────────────────────────────────────────
const SCHEDULES = [
  { label: "Every 30 min", value: 30 },
  { label: "Every hour",   value: 60 },
  { label: "Every 6 hrs",  value: 360 },
  { label: "Every 12 hrs", value: 720 },
  { label: "Every day",    value: 1440 },
];

const PIPELINE_STAGES = [
  { label: "Fetching RSS feed",           icon: "fetch"  },
  { label: "Deduplicating items",         icon: "dedup"  },
  { label: "AI rewriting content",        icon: "ai"     },
  { label: "Uploading images",            icon: "image"  },
  { label: "Saving posts to database",    icon: "save"   },
];

// ─── Types ────────────────────────────────────────────────────────────────────
interface Log {
  id: string;
  status: string;
  createdAt: string;
  errorMsg: string | null;
  itemGuid: string;
  postId?: string | null;
}
interface Feed {
  id: string; name: string; url: string;
  scheduleMinutes: number; isActive: boolean; autoPublish: boolean;
  lastRunAt: string | null;
  _count: { logs: number };
  logs: Log[];
}
interface RunDetail {
  guid: string; status: string; error?: string; postId?: string;
}
interface RunResult {
  feedId: string; feedName: string;
  processed: number; created: number; skipped: number; errors: number;
  details: RunDetail[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function shortGuid(guid: string) {
  try {
    const path = new URL(guid).pathname.replace(/^\//, "");
    return path.length > 55 ? "…" + path.slice(-55) : path || guid;
  } catch {
    return guid.length > 60 ? guid.slice(0, 30) + "…" + guid.slice(-20) : guid;
  }
}

function statusStyle(s: string) {
  if (s === "ok")      return { dot: "#34d399", bg: "rgba(52,211,153,0.08)", border: "rgba(52,211,153,0.2)", text: "#6ee7b7" };
  if (s === "error")   return { dot: "#f87171", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.2)", text: "#fca5a5" };
  return                      { dot: "#94a3b8", bg: "rgba(148,163,184,0.06)", border: "rgba(148,163,184,0.12)", text: "#94a3b8" };
}

// ─── Pipeline icons ───────────────────────────────────────────────────────────
function StageIcon({ type, size = 14 }: { type: string; size?: number }) {
  const cls = `w-[${size}px] h-[${size}px]`;
  if (type === "fetch") return <svg viewBox="0 0 16 16" fill="currentColor" className={cls}><path d="M8.75 2.75a.75.75 0 0 0-1.5 0v5.69L5.03 6.22a.75.75 0 0 0-1.06 1.06l3.5 3.5a.75.75 0 0 0 1.06 0l3.5-3.5a.75.75 0 0 0-1.06-1.06L8.75 8.44V2.75Z" /><path d="M3.5 9.75a.75.75 0 0 0-1.5 0v1.5A2.75 2.75 0 0 0 4.75 14h6.5A2.75 2.75 0 0 0 14 11.25v-1.5a.75.75 0 0 0-1.5 0v1.5c0 .69-.56 1.25-1.25 1.25h-6.5c-.69 0-1.25-.56-1.25-1.25v-1.5Z" /></svg>;
  if (type === "dedup") return <svg viewBox="0 0 16 16" fill="currentColor" className={cls}><path fillRule="evenodd" d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm11.78-1.72a.75.75 0 0 0-1.06-1.06L7 8.94 5.28 7.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.06 0l4.25-4.25Z" clipRule="evenodd" /></svg>;
  if (type === "ai")    return <svg viewBox="0 0 16 16" fill="currentColor" className={cls}><path d="M8.5 1.75a.75.75 0 0 0-1.5 0V4h-1A2.75 2.75 0 0 0 3.25 6.75v.5a.75.75 0 0 0 1.5 0v-.5c0-.69.56-1.25 1.25-1.25H6v1.25a.75.75 0 0 0 1.5 0V5.5h1c.69 0 1.25.56 1.25 1.25v.5a.75.75 0 0 0 1.5 0v-.5A2.75 2.75 0 0 0 9.5 4H8.5V1.75Z" /><path d="M4 9.25a.75.75 0 0 1 .75-.75h6.5a.75.75 0 0 1 0 1.5H9.56l1.22 1.97a.75.75 0 1 1-1.28.78L8 10.56l-1.5 2.19a.75.75 0 1 1-1.28-.78L6.44 10H4.75A.75.75 0 0 1 4 9.25Z" /></svg>;
  if (type === "image") return <svg viewBox="0 0 16 16" fill="currentColor" className={cls}><path fillRule="evenodd" d="M2 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4Zm9.5 6.5-3-2.5-1.5 1.5-2-2.5-2 3H12l-.5-1.5Z" clipRule="evenodd" /></svg>;
  return <svg viewBox="0 0 16 16" fill="currentColor" className={cls}><path d="M2.5 3.5A.5.5 0 0 1 3 3h10a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5H3a.5.5 0 0 1-.5-.5v-9Zm1 1v8h9v-8h-9Zm2 2h5v1.5h-5V6.5Zm0 2.5h5V10.5h-5V9Z" /></svg>;
}

// ─── Pipeline panel ───────────────────────────────────────────────────────────
function PipelinePanel({ stage }: { stage: number }) {
  return (
    <div className="rounded-xl p-5 space-y-3" style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.18)" }}>
      <p className="font-headline text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(167,139,250,0.7)" }}>
        Processing…
      </p>
      <div className="space-y-2.5">
        {PIPELINE_STAGES.map((s, i) => {
          const done    = i < stage;
          const active  = i === stage;
          const pending = i > stage;
          return (
            <div key={i} className="flex items-center gap-3">
              {/* Step indicator */}
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-none transition-all duration-300"
                style={{
                  background: done   ? "rgba(52,211,153,0.2)"  :
                               active ? "rgba(124,58,237,0.3)"  : "rgba(255,255,255,0.04)",
                  border: done   ? "1px solid rgba(52,211,153,0.4)"  :
                          active ? "1px solid rgba(167,139,250,0.5)" : "1px solid rgba(255,255,255,0.08)",
                }}>
                {done ? (
                  <svg viewBox="0 0 12 12" fill="none" stroke="#34d399" strokeWidth="2" className="w-3 h-3">
                    <polyline points="2,6 5,9 10,3" />
                  </svg>
                ) : active ? (
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#a78bfa" }} />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
                )}
              </div>
              {/* Label */}
              <div className="flex items-center gap-2 flex-1">
                <span className="flex-none" style={{ color: done ? "#34d399" : active ? "#a78bfa" : "rgba(255,255,255,0.2)" }}>
                  <StageIcon type={s.icon} size={13} />
                </span>
                <span className="font-body text-sm transition-all duration-300"
                  style={{ color: done ? "rgba(52,211,153,0.8)" : active ? "#e2d9f3" : "rgba(255,255,255,0.25)" }}>
                  {s.label}
                </span>
                {active && (
                  <span className="flex gap-0.5 ml-1">
                    {[0,1,2].map(d => (
                      <span key={d} className="w-1 h-1 rounded-full animate-bounce" style={{ background: "#a78bfa", animationDelay: `${d * 150}ms` }} />
                    ))}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Results panel ────────────────────────────────────────────────────────────
function ResultsPanel({ result, onDismiss }: { result: RunResult; onDismiss: () => void }) {
  const hasErrors = result.errors > 0;
  const stats = [
    { label: "Processed", value: result.processed, color: "#a78bfa" },
    { label: "Created",   value: result.created,   color: "#34d399" },
    { label: "Skipped",   value: result.skipped,   color: "#94a3b8" },
    { label: "Errors",    value: result.errors,    color: "#f87171" },
  ];

  // Sort: ok first, then skipped, then errors
  const sorted = [...result.details].sort((a, b) => {
    const order = { ok: 0, skipped: 1, error: 2 };
    return (order[a.status as keyof typeof order] ?? 3) - (order[b.status as keyof typeof order] ?? 3);
  });

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${hasErrors ? "rgba(248,113,113,0.2)" : "rgba(52,211,153,0.2)"}` }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3"
        style={{ background: hasErrors ? "rgba(248,113,113,0.07)" : "rgba(52,211,153,0.07)" }}>
        <div className="flex items-center gap-2">
          {hasErrors ? (
            <svg viewBox="0 0 16 16" fill="#f87171" className="w-4 h-4"><path fillRule="evenodd" d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm7.25-3.25a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0v-3.5ZM8 11a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" clipRule="evenodd" /></svg>
          ) : (
            <svg viewBox="0 0 16 16" fill="#34d399" className="w-4 h-4"><path fillRule="evenodd" d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm11.78-1.72a.75.75 0 0 0-1.06-1.06L7 8.94 5.28 7.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.06 0l4.25-4.25Z" clipRule="evenodd" /></svg>
          )}
          <span className="font-headline text-sm font-semibold" style={{ color: hasErrors ? "#fca5a5" : "#6ee7b7" }}>
            Import complete
          </span>
        </div>
        <button onClick={onDismiss} className="text-white/30 hover:text-white/60 transition-colors cursor-pointer">
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" /></svg>
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 divide-x divide-white/[0.06]" style={{ background: "rgba(6,14,32,0.5)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        {stats.map(s => (
          <div key={s.label} className="flex flex-col items-center py-4 gap-1">
            <span className="font-headline text-2xl font-bold" style={{ color: s.color }}>{s.value}</span>
            <span className="font-body text-[10px] uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Item list */}
      {sorted.length > 0 && (
        <div className="max-h-72 overflow-y-auto" style={{ background: "rgba(6,14,32,0.3)" }}>
          {sorted.map((d, i) => {
            const st = statusStyle(d.status);
            return (
              <div key={i} className="px-4 py-2.5 border-b last:border-0 space-y-1"
                style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                <div className="flex items-center gap-2.5">
                  {/* Status dot */}
                  <span className="w-4 h-4 rounded-full flex items-center justify-center flex-none"
                    style={{ background: st.bg, border: `1px solid ${st.border}` }}>
                    {d.status === "ok"    && <svg viewBox="0 0 8 8" fill="none" stroke={st.dot} strokeWidth="1.5" className="w-2.5 h-2.5"><polyline points="1.5,4 3,5.5 6.5,2" /></svg>}
                    {d.status === "error" && <svg viewBox="0 0 8 8" fill="none" stroke={st.dot} strokeWidth="1.5" className="w-2.5 h-2.5"><path d="M2 2L6 6M6 2L2 6" /></svg>}
                    {d.status === "skipped" && <span style={{ width: 4, height: 2, background: st.dot, borderRadius: 1, display: "block" }} />}
                  </span>
                  {/* Guid */}
                  <span className="font-mono text-[11px] flex-1 truncate" style={{ color: "rgba(222,229,255,0.5)" }}>
                    {shortGuid(d.guid)}
                  </span>
                  {/* Status label / Post link */}
                  <div className="flex-none flex items-center gap-2">
                    <span className="font-body text-[10px] px-1.5 py-0.5 rounded" style={{ background: st.bg, color: st.text }}>
                      {d.status === "ok" ? "saved" : d.status}
                    </span>
                    {d.status === "ok" && d.postId && (
                      <Link href={`/admin/posts`} className="font-body text-[10px] flex items-center gap-1 transition-colors hover:text-violet-300"
                        style={{ color: "rgba(167,139,250,0.5)" }}>
                        post
                        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-2.5 h-2.5">
                          <path d="M3.5 8.5L8.5 3.5M5.5 3.5h3v3" />
                        </svg>
                      </Link>
                    )}
                  </div>
                </div>
                {/* Error detail */}
                {d.error && (
                  <div className="ml-6 font-mono text-[10px] rounded px-2 py-1 leading-relaxed"
                    style={{ background: "rgba(248,113,113,0.07)", color: "#fca5a5", border: "1px solid rgba(248,113,113,0.12)" }}>
                    {d.error}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── History panel ────────────────────────────────────────────────────────────
function HistoryPanel({ feedId, totalCount }: { feedId: string; totalCount: number }) {
  const [logs, setLogs]       = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/rss-feeds/${feedId}`)
      .then(r => r.json())
      .then(d => setLogs(d.logs ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [feedId]);

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "rgba(6,14,32,0.4)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <span className="font-headline text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(167,139,250,0.7)" }}>
          Import History
        </span>
        <span className="font-body text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>
          {totalCount} total · showing last {logs.length}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <span className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(124,58,237,0.2)", borderTopColor: "#a78bfa" }} />
        </div>
      ) : logs.length === 0 ? (
        <p className="font-body text-xs text-center py-6" style={{ color: "rgba(255,255,255,0.2)" }}>No imports yet</p>
      ) : (
        <div className="max-h-80 overflow-y-auto divide-y divide-white/[0.04]">
          {logs.map(log => {
            const st = statusStyle(log.status);
            return (
              <div key={log.id} className="px-4 py-2.5 space-y-1">
                <div className="flex items-center gap-2.5">
                  <span className="w-3.5 h-3.5 rounded-full flex-none" style={{ background: st.dot, boxShadow: `0 0 6px ${st.dot}60` }} />
                  <span className="font-mono text-[11px] flex-1 truncate" style={{ color: "rgba(222,229,255,0.45)" }}>
                    {shortGuid(log.itemGuid)}
                  </span>
                  <span className="font-body text-[10px] flex-none" style={{ color: "rgba(255,255,255,0.22)" }}>
                    {timeAgo(log.createdAt)}
                  </span>
                  <span className="font-body text-[10px] px-1.5 py-0.5 rounded flex-none" style={{ background: st.bg, color: st.text }}>
                    {log.status}
                  </span>
                  {log.postId && (
                    <Link href={`/admin/posts`}
                      className="font-body text-[10px] flex items-center gap-0.5 flex-none transition-colors hover:text-violet-300"
                      style={{ color: "rgba(167,139,250,0.45)" }}>
                      post
                      <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-2.5 h-2.5">
                        <path d="M3.5 8.5L8.5 3.5M5.5 3.5h3v3" />
                      </svg>
                    </Link>
                  )}
                </div>
                {log.errorMsg && (
                  <div className="ml-6 font-mono text-[10px] rounded px-2 py-1"
                    style={{ background: "rgba(248,113,113,0.07)", color: "#fca5a5", border: "1px solid rgba(248,113,113,0.1)" }}>
                    {log.errorMsg}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Feed card ────────────────────────────────────────────────────────────────
function FeedCard({
  feed, running, pipelineStage, runResult,
  onRunNow, onToggle, onEdit, onDelete, onDismissResult,
}: {
  feed: Feed; running: boolean; pipelineStage: number;
  runResult: RunResult | null;
  onRunNow: () => void; onToggle: () => void;
  onEdit: () => void; onDelete: () => void;
  onDismissResult: () => void;
}) {
  const [showHistory, setShowHistory] = useState(false);

  const okLogs   = feed.logs.filter(l => l.status === "ok");
  const errLogs  = feed.logs.filter(l => l.status === "error");
  // Only count ok + error as "attempted" — skipped items are deduplicated, not failures
  const attempted = okLogs.length + errLogs.length;
  const successRate = attempted > 0 ? Math.round((okLogs.length / attempted) * 100) : null;

  return (
    <div className="rounded-2xl overflow-hidden transition-all"
      style={{
        background: "rgba(9,19,40,0.6)",
        border: `1px solid ${feed.isActive ? "rgba(124,58,237,0.22)" : "rgba(255,255,255,0.07)"}`,
        boxShadow: running ? "0 0 0 1px rgba(124,58,237,0.4), 0 8px 32px rgba(124,58,237,0.12)" : "none",
      }}>

      {/* ── Card header ── */}
      <div className="p-5 space-y-4">
        <div className="flex items-start gap-3 flex-wrap">
          {/* Icon */}
          <div className="w-10 h-10 rounded-xl flex-none flex items-center justify-center"
            style={{ background: feed.isActive ? "rgba(124,58,237,0.18)" : "rgba(255,255,255,0.04)" }}>
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5"
              stroke={feed.isActive ? "#a78bfa" : "rgba(255,255,255,0.2)"} strokeWidth="2">
              <circle cx="5" cy="19" r="2" /><path d="M5 14a7 7 0 0 1 7 7"/><path d="M5 9a12 12 0 0 1 12 12"/>
            </svg>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-headline text-base font-semibold text-white/90">{feed.name}</p>
              <span className={`px-2 py-0.5 rounded-full font-body text-[10px] font-semibold border
                ${feed.isActive ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" : "bg-white/5 text-white/30 border-white/10"}`}>
                {feed.isActive ? "Active" : "Paused"}
              </span>
              {feed.autoPublish && (
                <span className="px-2 py-0.5 rounded-full font-body text-[10px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/25">
                  Auto-publish
                </span>
              )}
              {running && (
                <span className="px-2 py-0.5 rounded-full font-body text-[10px] font-semibold animate-pulse bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  Running…
                </span>
              )}
            </div>
            <p className="font-mono text-xs mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.28)" }}>{feed.url}</p>
            <div className="flex items-center gap-4 mt-1.5 font-body text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>
              <span>{SCHEDULES.find(s => s.value === feed.scheduleMinutes)?.label ?? `${feed.scheduleMinutes}m`}</span>
              <span className="flex items-center gap-1">
                <svg viewBox="0 0 12 12" fill="currentColor" className="w-3 h-3 opacity-60"><path d="M6 .5a5.5 5.5 0 1 0 0 11A5.5 5.5 0 0 0 6 .5ZM6 10a4 4 0 1 1 0-8 4 4 0 0 1 0 8ZM5.5 3.5V6l2 1.5.5-.75-1.5-1.1V3.5h-1Z"/></svg>
                {feed._count.logs} imported
              </span>
              {feed.lastRunAt && <span>Last: {timeAgo(feed.lastRunAt)}</span>}
              {attempted > 0 && successRate !== null && (
                <span style={{ color: successRate === 100 ? "#34d399" : successRate < 50 ? "#f87171" : "rgba(255,255,255,0.3)" }}>
                  {successRate}% of {attempted} created
                </span>
              )}
              {attempted === 0 && feed.logs.length > 0 && (
                <span style={{ color: "rgba(148,163,184,0.6)" }}>
                  all {feed.logs.length} already imported
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 flex-none">
            <button onClick={onRunNow} disabled={running}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-body text-xs font-semibold disabled:opacity-50 transition-all cursor-pointer"
              style={{ background: "rgba(124,58,237,0.2)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.3)" }}>
              {running ? (
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" />
                </svg>
              ) : (
                <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1ZM6.5 5.5l4 2.5-4 2.5V5.5Z" /></svg>
              )}
              {running ? "Running" : "Run Now"}
            </button>
            <button onClick={onToggle}
              className="px-3 py-1.5 rounded-lg font-body text-xs cursor-pointer transition-all hover:bg-white/5"
              style={{ color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {feed.isActive ? "Pause" : "Resume"}
            </button>
            <button onClick={onEdit} title="Edit"
              className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors hover:bg-white/5"
              style={{ color: "rgba(255,255,255,0.35)" }}>
              <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.261-4.263a1.75 1.75 0 0 0 0-2.474Z" /></svg>
            </button>
            <button onClick={onDelete} title="Delete"
              className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors hover:bg-red-500/10"
              style={{ color: "rgba(248,113,113,0.45)" }}>
              <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Z" /></svg>
            </button>
          </div>
        </div>

        {/* ── Recent log dots ── */}
        {feed.logs.length > 0 && !running && !runResult && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-body text-[10px] uppercase tracking-widest mr-1" style={{ color: "rgba(255,255,255,0.2)" }}>Recent</span>
            {feed.logs.map((log, i) => {
              const st = statusStyle(log.status);
              return (
                <span key={i} title={`${log.status} · ${timeAgo(log.createdAt)}${log.errorMsg ? " · " + log.errorMsg : ""}`}
                  className="w-4 h-4 rounded-full flex items-center justify-center transition-all hover:scale-125 cursor-default"
                  style={{ background: st.bg, border: `1px solid ${st.border}` }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: st.dot }} />
                </span>
              );
            })}
            {errLogs.length > 0 && (
              <span className="font-body text-[10px] ml-1" style={{ color: "#f87171" }}>
                {errLogs.length} error{errLogs.length !== 1 ? "s" : ""}
              </span>
            )}
            <button onClick={() => setShowHistory(h => !h)}
              className="ml-auto font-body text-[10px] flex items-center gap-1 cursor-pointer transition-colors hover:text-violet-300"
              style={{ color: "rgba(167,139,250,0.5)" }}>
              History
              <svg viewBox="0 0 12 12" fill="currentColor" className={`w-3 h-3 transition-transform ${showHistory ? "rotate-180" : ""}`}>
                <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* ── Pipeline (while running) ── */}
      {running && (
        <div className="px-5 pb-5">
          <PipelinePanel stage={pipelineStage} />
        </div>
      )}

      {/* ── Run results ── */}
      {!running && runResult && (
        <div className="px-5 pb-5">
          <ResultsPanel result={runResult} onDismiss={onDismissResult} />
        </div>
      )}

      {/* ── History ── */}
      {showHistory && !running && (
        <div className="px-5 pb-5">
          <HistoryPanel feedId={feed.id} totalCount={feed._count.logs} />
        </div>
      )}
    </div>
  );
}

// ─── Add/Edit modal ───────────────────────────────────────────────────────────
function FeedModal({ initial, onSave, onClose }: {
  initial?: Feed;
  onSave: (d: { name: string; url: string; scheduleMinutes: number; isActive: boolean; autoPublish: boolean }) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName]             = useState(initial?.name ?? "Anime News Network");
  const [url, setUrl]               = useState(initial?.url ?? "https://www.animenewsnetwork.com/all-reviews/rss.xml?ann-edition=w");
  const [schedule, setSchedule]     = useState(initial?.scheduleMinutes ?? 60);
  const [isActive, setIsActive]     = useState(initial?.isActive ?? true);
  const [autoPublish, setAutoPublish] = useState(initial?.autoPublish ?? false);
  const [saving, setSaving]         = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    await onSave({ name, url, scheduleMinutes: schedule, isActive, autoPublish });
    setSaving(false);
  };

  const Toggle = ({ value, onChange, label }: { value: boolean; onChange: () => void; label: string }) => (
    <label className="flex items-center gap-2.5 cursor-pointer" onClick={onChange}>
      <div className="relative w-9 h-5 rounded-full transition-colors"
        style={{ background: value ? "rgba(124,58,237,0.6)" : "rgba(255,255,255,0.1)" }}>
        <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform"
          style={{ transform: value ? "translateX(16px)" : "none" }} />
      </div>
      <span className="font-body text-sm text-white/70">{label}</span>
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-lg rounded-2xl p-6 space-y-5" style={{ background: "rgba(9,19,40,0.98)", border: "1px solid rgba(124,58,237,0.25)" }}>
        <div className="flex items-center justify-between">
          <h2 className="font-headline text-lg font-bold text-white/90">{initial ? "Edit Feed" : "Add RSS Feed"}</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors cursor-pointer">
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" /></svg>
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          {[
            { label: "Feed Name", value: name, set: setName, type: "text", mono: false },
            { label: "RSS URL",   value: url,  set: setUrl,  type: "url",  mono: true  },
          ].map(f => (
            <div key={f.label}>
              <label className="block font-body text-[11px] uppercase tracking-widest text-white/40 mb-1.5">{f.label}</label>
              <input value={f.value} onChange={e => f.set(e.target.value)} required type={f.type}
                className={`w-full px-3.5 py-2.5 rounded-lg text-sm text-white/80 outline-none ${f.mono ? "font-mono" : "font-body"}`}
                style={{ background: "rgba(6,14,32,0.7)", border: "1px solid rgba(255,255,255,0.08)" }} />
            </div>
          ))}
          <div>
            <label className="block font-body text-[11px] uppercase tracking-widest text-white/40 mb-1.5">Schedule</label>
            <select value={schedule} onChange={e => setSchedule(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-lg font-body text-sm text-white/80 outline-none cursor-pointer"
              style={{ background: "rgba(6,14,32,0.7)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {SCHEDULES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="flex gap-6">
            <Toggle value={isActive}     onChange={() => setIsActive(p => !p)}     label="Active" />
            <Toggle value={autoPublish}  onChange={() => setAutoPublish(p => !p)}  label="Auto-publish" />
          </div>
          <button type="submit" disabled={saving}
            className="w-full py-2.5 rounded-xl font-headline text-sm font-semibold text-white disabled:opacity-50 cursor-pointer transition-all"
            style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", boxShadow: "0 0 20px rgba(124,58,237,0.3)" }}>
            {saving ? "Saving…" : initial ? "Update Feed" : "Add Feed"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Scheduler status card ────────────────────────────────────────────────────
function SchedulerCard() {
  const [enabled,   setEnabled]   = useState(false);
  const [lastTick,  setLastTick]  = useState<string | null>(null);
  const [lastRun,   setLastRun]   = useState<string | null>(null);
  const [saving,    setSaving]    = useState(false);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    fetch("/api/admin/cron")
      .then(r => r.json())
      .then(d => { setEnabled(d.enabled); setLastTick(d.lastTick); setLastRun(d.lastRun); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Refresh tick time every 30 s while enabled
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      fetch("/api/admin/cron").then(r => r.json())
        .then(d => { setLastTick(d.lastTick); setLastRun(d.lastRun); }).catch(() => {});
    }, 30_000);
    return () => clearInterval(id);
  }, [enabled]);

  const toggle = async () => {
    setSaving(true);
    const res  = await fetch("/api/admin/cron", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !enabled }),
    });
    const data = await res.json();
    if (data.ok !== false) setEnabled(data.enabled);
    setSaving(false);
  };

  const ago = (iso: string | null) => {
    if (!iso) return "—";
    const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${enabled ? "rgba(52,211,153,0.25)" : "rgba(255,255,255,0.07)"}` }}>
      {/* Header row */}
      <div className="flex items-center justify-between px-5 py-4"
        style={{ background: enabled ? "rgba(52,211,153,0.06)" : "rgba(9,19,40,0.5)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: enabled ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.06)" }}>
            <svg viewBox="0 0 16 16" fill="none" stroke={enabled ? "#34d399" : "rgba(255,255,255,0.3)"} strokeWidth="1.5" className="w-4 h-4">
              <circle cx="8" cy="8" r="6.5" /><path strokeLinecap="round" d="M8 4.5V8l2.5 1.5" />
            </svg>
          </div>
          <div>
            <p className="font-headline text-sm font-semibold" style={{ color: enabled ? "#6ee7b7" : "rgba(255,255,255,0.7)" }}>
              Background Scheduler
            </p>
            <p className="font-body text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>
              Runs in-process every 60 s · VPS / self-hosted
            </p>
          </div>
        </div>

        {/* Toggle */}
        <button onClick={toggle} disabled={saving || loading}
          className="flex items-center gap-2.5 cursor-pointer disabled:opacity-50 transition-all"
          aria-label={enabled ? "Disable scheduler" : "Enable scheduler"}>
          <span className="font-body text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
            {saving ? "Saving…" : enabled ? "Enabled" : "Disabled"}
          </span>
          <div className="relative w-10 h-5.5 rounded-full transition-colors duration-200"
            style={{ background: enabled ? "rgba(52,211,153,0.5)" : "rgba(255,255,255,0.1)", width: 40, height: 22 }}>
            <div className="absolute top-0.5 rounded-full bg-white transition-transform duration-200"
              style={{ width: 18, height: 18, left: 2, transform: enabled ? "translateX(18px)" : "none" }} />
          </div>
        </button>
      </div>

      {/* Status row */}
      <div className="grid grid-cols-3 divide-x divide-white/[0.05]"
        style={{ background: "rgba(6,14,32,0.4)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        {[
          { label: "Status",       value: loading ? "…" : enabled ? "Active" : "Inactive",
            color: enabled ? "#34d399" : "rgba(255,255,255,0.3)" },
          { label: "Last check",   value: ago(lastTick) },
          { label: "Last created", value: ago(lastRun) },
        ].map(({ label, value, color }) => (
          <div key={label} className="px-5 py-3">
            <p className="font-body text-[10px] uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.22)" }}>{label}</p>
            <p className="font-body text-sm font-medium" style={{ color: color ?? "rgba(222,229,255,0.65)" }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="px-5 py-3 flex items-start gap-2.5"
        style={{ background: "rgba(6,14,32,0.3)", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 flex-none mt-0.5" style={{ color: "rgba(167,139,250,0.5)" }}>
          <path fillRule="evenodd" d="M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0Zm-7-3a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-1.5 0v-2.5A.75.75 0 0 1 8 5Zm0 6.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
        </svg>
        <p className="font-body text-[11px] leading-relaxed" style={{ color: "rgba(167,139,250,0.6)" }}>
          When enabled, this scheduler starts automatically with the Next.js server and runs each RSS
          feed according to its own schedule. No Vercel Cron or external service needed.
          Requires <code className="bg-violet-500/12 px-1 rounded font-mono">instrumentationHook: true</code> in <code className="bg-violet-500/12 px-1 rounded font-mono">next.config.ts</code> — already set.
        </p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function RssPage() {
  const [feeds, setFeeds]           = useState<Feed[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [editFeed, setEditFeed]     = useState<Feed | undefined>();
  const [running, setRunning]       = useState<string | null>(null);
  const [pipelineStage, setPipeline] = useState(0);
  const [runResults, setRunResults] = useState<Record<string, RunResult>>({});
  const [hasAi, setHasAi]           = useState(true);
  const stageRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings").then(r => r.json())
      .then(d => setHasAi(!!(d.openrouter || d.gemini || d.openai || d.claude)))
      .catch(() => setHasAi(true));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetch("/api/admin/rss-feeds").then(r => r.json());
      setFeeds(Array.isArray(data) ? data : []);
    } catch { setFeeds([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (data: Parameters<typeof FeedModal>[0]["onSave"] extends (d: infer D) => unknown ? D : never) => {
    const url  = editFeed ? `/api/admin/rss-feeds/${editFeed.id}` : "/api/admin/rss-feeds";
    const method = editFeed ? "PATCH" : "POST";
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    setShowModal(false); setEditFeed(undefined); load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this feed and all its import history?")) return;
    await fetch(`/api/admin/rss-feeds/${id}`, { method: "DELETE" });
    load();
  };

  const handleToggle = async (feed: Feed) => {
    await fetch(`/api/admin/rss-feeds/${feed.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !feed.isActive }) });
    load();
  };

  const handleRunNow = async (feed: Feed) => {
    setRunning(feed.id); setPipeline(0);

    // Advance pipeline stages while waiting
    stageRef.current = setInterval(() => {
      setPipeline(p => Math.min(p + 1, PIPELINE_STAGES.length - 1));
    }, 3500);

    try {
      const res  = await fetch(`/api/admin/rss-feeds/${feed.id}/run`, { method: "POST" });
      const text = await res.text();
      const data = JSON.parse(text);
      if (!res.ok) throw new Error(data.error || "Failed");
      if (data.results?.length) {
        setRunResults(r => ({ ...r, [feed.id]: data.results[0] }));
      }
      load();
    } catch (e) {
      alert("Run failed: " + String(e));
    }

    if (stageRef.current) { clearInterval(stageRef.current); stageRef.current = null; }
    setPipeline(0); setRunning(null);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-headline text-2xl font-bold text-white/90">RSS Auto-Import</h1>
          <p className="font-body text-sm text-white/40 mt-1">AI fetches, rewrites and publishes posts automatically</p>
        </div>
        <div className="flex items-center gap-3">
          {!hasAi && (
            <Link href="/admin/settings"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg font-body text-xs text-yellow-400 border border-yellow-500/30 bg-yellow-500/10">
              <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" clipRule="evenodd" /></svg>
              Set AI key first
            </Link>
          )}
          <button onClick={() => { setEditFeed(undefined); setShowModal(true); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-headline text-sm font-semibold text-white cursor-pointer"
            style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", boxShadow: "0 0 16px rgba(124,58,237,0.3)" }}>
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2Z" /></svg>
            Add Feed
          </button>
        </div>
      </div>

      {/* Scheduler card */}
      <SchedulerCard />

      {/* Feed list */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <span className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(124,58,237,0.3)", borderTopColor: "#a78bfa" }} />
        </div>
      ) : feeds.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 rounded-2xl"
          style={{ border: "1px dashed rgba(255,255,255,0.08)" }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "rgba(124,58,237,0.1)" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5" className="w-6 h-6">
              <circle cx="5" cy="19" r="2" /><path d="M5 14a7 7 0 0 1 7 7"/><path d="M5 9a12 12 0 0 1 12 12"/>
            </svg>
          </div>
          <p className="font-body text-sm text-white/30">No RSS feeds yet</p>
          <button onClick={() => setShowModal(true)} className="font-body text-xs text-violet-400 hover:underline cursor-pointer">
            Add your first feed →
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {feeds.map(feed => (
            <FeedCard key={feed.id}
              feed={feed}
              running={running === feed.id}
              pipelineStage={pipelineStage}
              runResult={runResults[feed.id] ?? null}
              onRunNow={() => handleRunNow(feed)}
              onToggle={() => handleToggle(feed)}
              onEdit={() => { setEditFeed(feed); setShowModal(true); }}
              onDelete={() => handleDelete(feed.id)}
              onDismissResult={() => setRunResults(r => { const n = { ...r }; delete n[feed.id]; return n; })}
            />
          ))}
        </div>
      )}

      {showModal && (
        <FeedModal initial={editFeed} onSave={handleSave}
          onClose={() => { setShowModal(false); setEditFeed(undefined); }} />
      )}
    </div>
  );
}
