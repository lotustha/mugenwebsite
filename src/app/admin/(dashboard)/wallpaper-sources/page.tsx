"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// ─── Constants ────────────────────────────────────────────────────────────────
const SCHEDULES = [
  { label: "Every 6 hrs",  value: 360 },
  { label: "Every 12 hrs", value: 720 },
  { label: "Every day",    value: 1440 },
  { label: "Every 2 days", value: 2880 },
];

const MEDIA_TYPES = [
  { v: "image", label: "Images",     hint: "Photo wallpapers only" },
  { v: "video", label: "Live (video)", hint: "Animated/video pins" },
  { v: "both",  label: "Both",        hint: "Images + video pins" },
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────
interface WCategory { id: string; name: string; count?: number }
interface Source {
  id: string; name: string; query: string;
  mediaType: string; maxItems: number; scheduleMinutes: number;
  isActive: boolean; notify: boolean;
  categoryId: string | null; category?: { id: string; name: string } | null;
  tags: string | null;
  lastRunAt: string | null; totalImported: number;
}
interface RunDetail { pinId: string; status: string; error?: string; wallpaperId?: string }
interface RunResult {
  sourceId: string; sourceName: string;
  processed: number; created: number; skipped: number; errors: number;
  details: RunDetail[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(iso: string | null) {
  if (!iso) return "never";
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Scheduler status card (shares the master cron switch with RSS) ───────────
function SchedulerCard() {
  const [enabled, setEnabled] = useState(false);
  const [lastTick, setLastTick] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/cron").then(r => r.json())
      .then(d => { setEnabled(d.enabled); setLastTick(d.lastTick); })
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  const toggle = async () => {
    setSaving(true);
    const res = await fetch("/api/admin/cron", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !enabled }),
    });
    const data = await res.json();
    if (data.ok !== false) setEnabled(data.enabled);
    setSaving(false);
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${enabled ? "rgba(52,211,153,0.25)" : "rgba(255,255,255,0.07)"}` }}>
      <div className="flex items-center justify-between px-5 py-4" style={{ background: enabled ? "rgba(52,211,153,0.06)" : "rgba(9,19,40,0.5)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: enabled ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.06)" }}>
            <svg viewBox="0 0 16 16" fill="none" stroke={enabled ? "#34d399" : "rgba(255,255,255,0.3)"} strokeWidth="1.5" className="w-4 h-4">
              <circle cx="8" cy="8" r="6.5" /><path strokeLinecap="round" d="M8 4.5V8l2.5 1.5" />
            </svg>
          </div>
          <div>
            <p className="font-headline text-sm font-semibold" style={{ color: enabled ? "#6ee7b7" : "rgba(255,255,255,0.7)" }}>Background Scheduler</p>
            <p className="font-body text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>
              Shared with RSS · last check {loading ? "…" : timeAgo(lastTick)}
            </p>
          </div>
        </div>
        <button onClick={toggle} disabled={saving || loading} className="flex items-center gap-2.5 cursor-pointer disabled:opacity-50">
          <span className="font-body text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{saving ? "Saving…" : enabled ? "Enabled" : "Disabled"}</span>
          <div className="relative rounded-full transition-colors duration-200" style={{ background: enabled ? "rgba(52,211,153,0.5)" : "rgba(255,255,255,0.1)", width: 40, height: 22 }}>
            <div className="absolute top-0.5 rounded-full bg-white transition-transform duration-200" style={{ width: 18, height: 18, left: 2, transform: enabled ? "translateX(18px)" : "none" }} />
          </div>
        </button>
      </div>
    </div>
  );
}

// ─── Add/Edit modal ───────────────────────────────────────────────────────────
function SourceModal({ initial, categories, onSave, onClose }: {
  initial?: Source; categories: WCategory[];
  onSave: (d: Partial<Source>) => Promise<void>; onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [query, setQuery] = useState(initial?.query ?? "anime 4k phone wallpaper");
  const [mediaType, setMediaType] = useState(initial?.mediaType ?? "image");
  const [maxItems, setMaxItems] = useState(initial?.maxItems ?? 8);
  const [schedule, setSchedule] = useState(initial?.scheduleMinutes ?? 720);
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [tags, setTags] = useState(initial?.tags ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [notify, setNotify] = useState(initial?.notify ?? true);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    await onSave({ name, query, mediaType, maxItems, scheduleMinutes: schedule, categoryId: categoryId || null, tags, isActive, notify });
    setSaving(false);
  };

  const Toggle = ({ value, onChange, label }: { value: boolean; onChange: () => void; label: string }) => (
    <label className="flex items-center gap-2.5 cursor-pointer" onClick={onChange}>
      <div className="relative w-9 h-5 rounded-full transition-colors" style={{ background: value ? "rgba(124,58,237,0.6)" : "rgba(255,255,255,0.1)" }}>
        <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform" style={{ transform: value ? "translateX(16px)" : "none" }} />
      </div>
      <span className="font-body text-sm text-white/70">{label}</span>
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-lg rounded-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto" style={{ background: "rgba(9,19,40,0.98)", border: "1px solid rgba(124,58,237,0.25)" }}>
        <div className="flex items-center justify-between">
          <h2 className="font-headline text-lg font-bold text-white/90">{initial ? "Edit Source" : "Add Wallpaper Source"}</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 cursor-pointer">
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" /></svg>
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          {[
            { label: "Source Name", value: name, set: setName, ph: "Anime Phone Wallpapers" },
            { label: "Pinterest Search Query", value: query, set: setQuery, ph: "anime 4k phone wallpaper", mono: true },
          ].map(f => (
            <div key={f.label}>
              <label className="block font-body text-[11px] uppercase tracking-widest text-white/40 mb-1.5">{f.label}</label>
              <input value={f.value} onChange={e => f.set(e.target.value)} required placeholder={f.ph}
                className={`w-full px-3.5 py-2.5 rounded-lg text-sm text-white/80 outline-none ${f.mono ? "font-mono" : "font-body"}`}
                style={{ background: "rgba(6,14,32,0.7)", border: "1px solid rgba(255,255,255,0.08)" }} />
            </div>
          ))}

          <div>
            <label className="block font-body text-[11px] uppercase tracking-widest text-white/40 mb-1.5">Media Type</label>
            <div className="grid grid-cols-3 gap-2">
              {MEDIA_TYPES.map(opt => (
                <button key={opt.v} type="button" onClick={() => setMediaType(opt.v)} className="text-left px-3 py-2 rounded-lg cursor-pointer transition-all"
                  style={{ background: mediaType === opt.v ? "rgba(124,58,237,0.18)" : "rgba(6,14,32,0.5)", border: mediaType === opt.v ? "1px solid rgba(167,139,250,0.45)" : "1px solid rgba(255,255,255,0.08)" }}>
                  <p className="font-headline text-sm font-semibold" style={{ color: mediaType === opt.v ? "#c4b5fd" : "rgba(255,255,255,0.7)" }}>{opt.label}</p>
                  <p className="font-body text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{opt.hint}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-body text-[11px] uppercase tracking-widest text-white/40 mb-1.5">Per run (1-30)</label>
              <input type="number" min={1} max={30} value={maxItems}
                onChange={e => setMaxItems(Math.min(30, Math.max(1, Number(e.target.value) || 1)))}
                className="w-full px-3.5 py-2.5 rounded-lg font-body text-sm text-white/80 outline-none"
                style={{ background: "rgba(6,14,32,0.7)", border: "1px solid rgba(255,255,255,0.08)" }} />
            </div>
            <div>
              <label className="block font-body text-[11px] uppercase tracking-widest text-white/40 mb-1.5">Schedule</label>
              <select value={schedule} onChange={e => setSchedule(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-lg font-body text-sm text-white/80 outline-none cursor-pointer"
                style={{ background: "rgba(6,14,32,0.7)", border: "1px solid rgba(255,255,255,0.08)" }}>
                {SCHEDULES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-body text-[11px] uppercase tracking-widest text-white/40 mb-1.5">Category</label>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg font-body text-sm text-white/80 outline-none cursor-pointer"
              style={{ background: "rgba(6,14,32,0.7)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <option value="">— None —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block font-body text-[11px] uppercase tracking-widest text-white/40 mb-1.5">Tags (comma-separated)</label>
            <input value={tags} onChange={e => setTags(e.target.value)} placeholder="anime, wallpaper, 4k"
              className="w-full px-3.5 py-2.5 rounded-lg font-body text-sm text-white/80 outline-none"
              style={{ background: "rgba(6,14,32,0.7)", border: "1px solid rgba(255,255,255,0.08)" }} />
          </div>

          <div className="flex gap-6">
            <Toggle value={isActive} onChange={() => setIsActive(p => !p)} label="Active" />
            <Toggle value={notify} onChange={() => setNotify(p => !p)} label="Push on import" />
          </div>

          <button type="submit" disabled={saving}
            className="w-full py-2.5 rounded-xl font-headline text-sm font-semibold text-white disabled:opacity-50 cursor-pointer"
            style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", boxShadow: "0 0 20px rgba(124,58,237,0.3)" }}>
            {saving ? "Saving…" : initial ? "Update Source" : "Add Source"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Source card ──────────────────────────────────────────────────────────────
function SourceCard({ source, running, result, onRun, onToggle, onEdit, onDelete }: {
  source: Source; running: boolean; result: RunResult | null;
  onRun: () => void; onToggle: () => void; onEdit: () => void; onDelete: () => void;
}) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(9,19,40,0.6)", border: `1px solid ${source.isActive ? "rgba(124,58,237,0.22)" : "rgba(255,255,255,0.07)"}` }}>
      <div className="p-5 space-y-4">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="w-10 h-10 rounded-xl flex-none flex items-center justify-center" style={{ background: source.isActive ? "rgba(124,58,237,0.18)" : "rgba(255,255,255,0.04)" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke={source.isActive ? "#a78bfa" : "rgba(255,255,255,0.2)"} strokeWidth="2" className="w-5 h-5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-headline text-base font-semibold text-white/90">{source.name}</p>
              <span className={`px-2 py-0.5 rounded-full font-body text-[10px] font-semibold border ${source.isActive ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" : "bg-white/5 text-white/30 border-white/10"}`}>
                {source.isActive ? "Active" : "Paused"}
              </span>
              <span className="px-2 py-0.5 rounded-full font-body text-[10px] font-semibold bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/25">
                {source.mediaType} · {source.maxItems}/run
              </span>
              {source.notify && <span className="px-2 py-0.5 rounded-full font-body text-[10px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/25">Push</span>}
              {running && <span className="px-2 py-0.5 rounded-full font-body text-[10px] font-semibold animate-pulse bg-violet-500/20 text-violet-300 border border-violet-500/30">Running…</span>}
            </div>
            <p className="font-mono text-xs mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.4)" }}>🔍 {source.query}</p>
            <div className="flex items-center gap-4 mt-1.5 font-body text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>
              <span>{SCHEDULES.find(s => s.value === source.scheduleMinutes)?.label ?? `${source.scheduleMinutes}m`}</span>
              <span>{source.totalImported} imported total</span>
              <span>Last: {timeAgo(source.lastRunAt)}</span>
              {source.category && <span className="text-violet-300/60">{source.category.name}</span>}
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-none">
            <button onClick={onRun} disabled={running}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-body text-xs font-semibold disabled:opacity-50 cursor-pointer"
              style={{ background: "rgba(124,58,237,0.2)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.3)" }}>
              {running ? (
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" /></svg>
              ) : (
                <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1ZM6.5 5.5l4 2.5-4 2.5V5.5Z" /></svg>
              )}
              {running ? "Running" : "Run Now"}
            </button>
            <button onClick={onToggle} className="px-3 py-1.5 rounded-lg font-body text-xs cursor-pointer hover:bg-white/5" style={{ color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {source.isActive ? "Pause" : "Resume"}
            </button>
            <button onClick={onEdit} title="Edit" className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer hover:bg-white/5" style={{ color: "rgba(255,255,255,0.35)" }}>
              <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.261-4.263a1.75 1.75 0 0 0 0-2.474Z" /></svg>
            </button>
            <button onClick={onDelete} title="Delete" className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer hover:bg-red-500/10" style={{ color: "rgba(248,113,113,0.45)" }}>
              <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Z" /></svg>
            </button>
          </div>
        </div>

        {result && (
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Processed", value: result.processed, color: "#a78bfa" },
              { label: "Created",   value: result.created,   color: "#34d399" },
              { label: "Skipped",   value: result.skipped,   color: "#94a3b8" },
              { label: "Errors",    value: result.errors,    color: "#f87171" },
            ].map(s => (
              <div key={s.label} className="flex flex-col items-center py-3 rounded-xl" style={{ background: "rgba(6,14,32,0.5)" }}>
                <span className="font-headline text-xl font-bold" style={{ color: s.color }}>{s.value}</span>
                <span className="font-body text-[9px] uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>{s.label}</span>
              </div>
            ))}
            {result.errors > 0 && result.details.find(d => d.error) && (
              <p className="col-span-4 font-mono text-[10px] rounded px-2 py-1.5" style={{ background: "rgba(248,113,113,0.07)", color: "#fca5a5", border: "1px solid rgba(248,113,113,0.12)" }}>
                {result.details.find(d => d.error)?.error}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function WallpaperSourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [categories, setCategories] = useState<WCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editSource, setEditSource] = useState<Source | undefined>();
  const [running, setRunning] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, RunResult>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetch("/api/admin/wallpaper-sources").then(r => r.json());
      setSources(Array.isArray(data) ? data : []);
    } catch { setSources([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch("/api/admin/wallpaper-categories").then(r => r.json())
      .then(d => setCategories(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const handleSave = async (data: Partial<Source>) => {
    const url = editSource ? `/api/admin/wallpaper-sources/${editSource.id}` : "/api/admin/wallpaper-sources";
    const method = editSource ? "PATCH" : "POST";
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    setShowModal(false); setEditSource(undefined); load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this wallpaper source? (Imported wallpapers are kept.)")) return;
    await fetch(`/api/admin/wallpaper-sources/${id}`, { method: "DELETE" });
    load();
  };

  const handleToggle = async (s: Source) => {
    await fetch(`/api/admin/wallpaper-sources/${s.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !s.isActive }) });
    load();
  };

  const handleRun = async (s: Source) => {
    setRunning(s.id);
    try {
      const res = await fetch(`/api/admin/wallpaper-sources/${s.id}/run`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      if (data.results?.length) setResults(r => ({ ...r, [s.id]: data.results[0] }));
      load();
    } catch (e) {
      alert("Run failed: " + String(e));
    }
    setRunning(null);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-headline text-2xl font-bold text-white/90">Wallpaper Auto-Import</h1>
          <p className="font-body text-sm text-white/40 mt-1">Pinterest searches that auto-download anime wallpapers on a schedule</p>
        </div>
        <button onClick={() => { setEditSource(undefined); setShowModal(true); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-headline text-sm font-semibold text-white cursor-pointer"
          style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", boxShadow: "0 0 16px rgba(124,58,237,0.3)" }}>
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2Z" /></svg>
          Add Source
        </button>
      </div>

      <SchedulerCard />

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <span className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(124,58,237,0.3)", borderTopColor: "#a78bfa" }} />
        </div>
      ) : sources.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 rounded-2xl" style={{ border: "1px dashed rgba(255,255,255,0.08)" }}>
          <p className="font-body text-sm text-white/30">No wallpaper sources yet</p>
          <button onClick={() => setShowModal(true)} className="font-body text-xs text-violet-400 hover:underline cursor-pointer">Add your first source →</button>
        </div>
      ) : (
        <div className="space-y-4">
          {sources.map(s => (
            <SourceCard key={s.id} source={s} running={running === s.id} result={results[s.id] ?? null}
              onRun={() => handleRun(s)} onToggle={() => handleToggle(s)}
              onEdit={() => { setEditSource(s); setShowModal(true); }} onDelete={() => handleDelete(s.id)} />
          ))}
        </div>
      )}

      <p className="font-body text-xs text-white/25 flex items-center gap-2">
        <span>Tip: keep queries SFW-specific (e.g. &ldquo;anime scenery 4k wallpaper&rdquo;). Wallpapers go live immediately.</span>
        <Link href="/admin/wallpapers" className="text-violet-400 hover:underline">Manage wallpapers →</Link>
      </p>

      {showModal && (
        <SourceModal initial={editSource} categories={categories} onSave={handleSave}
          onClose={() => { setShowModal(false); setEditSource(undefined); }} />
      )}
    </div>
  );
}
