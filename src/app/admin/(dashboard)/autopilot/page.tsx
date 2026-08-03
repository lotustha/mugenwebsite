"use client";

/**
 * AI Autopilot control room.
 *
 * The topic table is the important part: it shows not just which topics exist
 * but WHY the generator favours them — the measured average views, how many
 * posts that average is based on, and the resulting selection weight.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Topic {
  id: string;
  name: string;
  promptHint: string;
  category: string;
  isActive: boolean;
  boost: number;
  weight: number;
  avgViews: number;
  postsScored: number;
  postsTotal: number;
  totalViews: number;
  lastUsedAt: string | null;
}

interface RunRow {
  id: string;
  status: string;
  title: string | null;
  topic: string | null;
  videoId: string | null;
  errorMsg: string | null;
  trigger: string;
  createdAt: string;
  slug: string | null;
  views: number | null;
}

interface Payload {
  settings: { enabled: boolean; hour: number; perDay: number; timezone: string; lastRunDate: string | null };
  scoring: { windowDays: number; minSamples: number; explorationRate: number };
  topics: Topic[];
  history: RunRow[];
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

const PANEL = {
  background: "rgba(9,19,40,0.5)",
  border: "1px solid rgba(255,255,255,0.07)",
  backdropFilter: "blur(12px)",
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AutopilotPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [runMsg, setRunMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({ name: "", promptHint: "", category: "Anime News" });

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/autopilot");
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveSettings(patch: Record<string, unknown>) {
    if (!data) return;
    setSaving(true);
    // Optimistic — the toggle should feel instant.
    setData({ ...data, settings: { ...data.settings, ...patch } as Payload["settings"] });
    await fetch("/api/admin/autopilot", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).catch(() => {});
    setSaving(false);
    load();
  }

  async function runNow(topicId?: string) {
    setRunning(true);
    setRunMsg(null);
    try {
      const res = await fetch("/api/admin/autopilot/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId }),
      });
      const j = await res.json();
      setRunMsg(
        j.status === "ok"
          ? { ok: true, text: `Published "${j.title}"${j.videoId ? " with video" : " (no video found)"}` }
          : { ok: false, text: j.error || "Generation failed" },
      );
    } catch {
      setRunMsg({ ok: false, text: "Request failed" });
    } finally {
      setRunning(false);
      load();
    }
  }

  async function patchTopic(id: string, fields: Record<string, unknown>) {
    await fetch("/api/admin/autopilot/topics", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...fields }),
    });
    load();
  }

  async function addTopic() {
    if (!draft.name.trim() || !draft.promptHint.trim()) return;
    await fetch("/api/admin/autopilot/topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    setDraft({ name: "", promptHint: "", category: "Anime News" });
    setShowAdd(false);
    load();
  }

  async function deleteTopic(id: string, name: string) {
    if (!confirm(`Delete topic "${name}"? Posts it already produced are kept.`)) return;
    await fetch(`/api/admin/autopilot/topics?id=${id}`, { method: "DELETE" });
    load();
  }

  if (loading) {
    return <div className="p-8 font-body text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Loading autopilot…</div>;
  }
  if (!data) {
    return <div className="p-8 font-body text-sm text-red-400">Failed to load autopilot.</div>;
  }

  const { settings, scoring, topics, history } = data;
  const totalWeight = topics.filter((t) => t.isActive).reduce((s, t) => s + t.weight, 0) || 1;

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-headline text-2xl sm:text-3xl font-bold text-white">AI Autopilot</h1>
          <p className="font-body text-sm mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
            Writes an original post daily — image, YouTube video, auto category, tags and SEO — and
            shifts toward the topics readers actually engage with.
          </p>
        </div>
        <button
          onClick={() => runNow()}
          disabled={running}
          className="px-4 py-2.5 rounded-xl font-body text-sm font-semibold text-white transition-all disabled:opacity-50 cursor-pointer"
          style={{ background: "linear-gradient(135deg,#8B5CF6,#D946EF)" }}
        >
          {running ? "Generating… (~1 min)" : "Generate Now"}
        </button>
      </div>

      {runMsg && (
        <div
          className="rounded-xl px-4 py-3 font-body text-sm"
          style={{
            background: runMsg.ok ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
            border: `1px solid ${runMsg.ok ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
            color: runMsg.ok ? "#4ade80" : "#f87171",
          }}
        >
          {runMsg.text}
        </div>
      )}

      {/* Schedule */}
      <div className="rounded-2xl p-5" style={PANEL}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => saveSettings({ enabled: !settings.enabled })}
              disabled={saving}
              className="relative w-12 h-6 rounded-full transition-all cursor-pointer shrink-0"
              style={{ background: settings.enabled ? "#8B5CF6" : "rgba(255,255,255,0.12)" }}
              aria-label="Toggle daily autopilot"
            >
              <span
                className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                style={{ left: settings.enabled ? "26px" : "4px" }}
              />
            </button>
            <div>
              <div className="font-body text-sm font-semibold text-white">
                {settings.enabled ? "Publishing daily" : "Paused"}
              </div>
              <div className="font-body text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                {settings.lastRunDate ? `Last batch: ${settings.lastRunDate}` : "No batch yet"}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="font-body text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
              Posts/day
              <select
                value={settings.perDay}
                onChange={(e) => saveSettings({ perDay: Number(e.target.value) })}
                className="ml-2 px-2 py-1.5 rounded-lg font-body text-sm text-white cursor-pointer"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n} style={{ background: "#0b0416" }}>{n}</option>)}
              </select>
            </label>

            <label className="font-body text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
              At
              <select
                value={settings.hour}
                onChange={(e) => saveSettings({ hour: Number(e.target.value) })}
                className="ml-2 px-2 py-1.5 rounded-lg font-body text-sm text-white cursor-pointer"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h} style={{ background: "#0b0416" }}>{String(h).padStart(2, "0")}:00</option>
                ))}
              </select>
            </label>

            <input
              value={settings.timezone}
              onChange={(e) => setData({ ...data, settings: { ...settings, timezone: e.target.value } })}
              onBlur={(e) => saveSettings({ timezone: e.target.value })}
              className="w-32 px-2 py-1.5 rounded-lg font-body text-sm text-white"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
              placeholder="UTC"
              aria-label="Timezone"
            />
          </div>
        </div>
      </div>

      {/* Topics */}
      <div className="rounded-2xl p-5" style={PANEL}>
        <div className="flex items-center justify-between gap-4 mb-1">
          <h2 className="font-headline text-lg font-bold text-white">Topics</h2>
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="px-3 py-1.5 rounded-lg font-body text-xs font-semibold text-white cursor-pointer"
            style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}
          >
            {showAdd ? "Cancel" : "+ Add topic"}
          </button>
        </div>
        <p className="font-body text-xs mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>
          Share is how often each topic gets picked. It comes from average views in the first{" "}
          {scoring.windowDays} days after publishing, and only counts once a topic has{" "}
          {scoring.minSamples}+ finished posts — until then it&apos;s treated as average.{" "}
          {Math.round(scoring.explorationRate * 100)}% of picks stay random so nothing gets stuck.
        </p>

        {showAdd && (
          <div className="rounded-xl p-4 mb-4 space-y-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Topic name, e.g. Anime Movie Reviews"
              className="w-full px-3 py-2 rounded-lg font-body text-sm text-white"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
            />
            <textarea
              value={draft.promptHint}
              onChange={(e) => setDraft({ ...draft, promptHint: e.target.value })}
              placeholder="What should the AI write about in this section? Be specific about angle and tone."
              rows={3}
              className="w-full px-3 py-2 rounded-lg font-body text-sm text-white resize-y"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
            />
            <div className="flex gap-3">
              <input
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                placeholder="Category"
                className="flex-1 px-3 py-2 rounded-lg font-body text-sm text-white"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
              />
              <button
                onClick={addTopic}
                className="px-4 py-2 rounded-lg font-body text-sm font-semibold text-white cursor-pointer"
                style={{ background: "linear-gradient(135deg,#8B5CF6,#D946EF)" }}
              >
                Add
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {topics.map((t) => {
            const share = t.isActive ? (t.weight / totalWeight) * 100 : 0;
            return (
              <div
                key={t.id}
                className="rounded-xl p-4"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  opacity: t.isActive ? 1 : 0.5,
                }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-body text-sm font-semibold text-white">{t.name}</span>
                      <span
                        className="px-2 py-0.5 rounded-md font-body text-[10px]"
                        style={{ background: "rgba(139,92,246,0.15)", color: "#c4b5fd" }}
                      >
                        {t.category}
                      </span>
                      {t.postsScored < scoring.minSamples && t.isActive && (
                        <span className="font-body text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                          learning ({t.postsScored}/{scoring.minSamples})
                        </span>
                      )}
                    </div>
                    <p className="font-body text-xs mt-1 line-clamp-2" style={{ color: "rgba(255,255,255,0.4)" }}>
                      {t.promptHint}
                    </p>

                    {/* Share bar */}
                    <div className="mt-2.5 flex items-center gap-3">
                      <div className="h-1.5 rounded-full flex-1 max-w-[180px] overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${Math.min(100, share)}%`, background: "linear-gradient(90deg,#8B5CF6,#D946EF)" }}
                        />
                      </div>
                      <span className="font-body text-[11px] tabular-nums" style={{ color: "rgba(255,255,255,0.5)" }}>
                        {share.toFixed(0)}% share · {t.avgViews.toFixed(1)} avg views · {t.postsTotal} posts · {t.totalViews} total
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={t.boost}
                      onChange={(e) => patchTopic(t.id, { boost: Number(e.target.value) })}
                      title="Manual multiplier applied on top of measured engagement"
                      className="px-2 py-1 rounded-lg font-body text-xs text-white cursor-pointer"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                    >
                      {[0.25, 0.5, 1, 1.5, 2, 3].map((b) => (
                        <option key={b} value={b} style={{ background: "#0b0416" }}>{b}×</option>
                      ))}
                    </select>
                    <button
                      onClick={() => runNow(t.id)}
                      disabled={running}
                      className="px-2.5 py-1 rounded-lg font-body text-xs text-white cursor-pointer disabled:opacity-40"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                    >
                      Write
                    </button>
                    <button
                      onClick={() => patchTopic(t.id, { isActive: !t.isActive })}
                      className="px-2.5 py-1 rounded-lg font-body text-xs text-white cursor-pointer"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                    >
                      {t.isActive ? "Pause" : "Enable"}
                    </button>
                    <button
                      onClick={() => deleteTopic(t.id, t.name)}
                      className="px-2.5 py-1 rounded-lg font-body text-xs cursor-pointer"
                      style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* History */}
      <div className="rounded-2xl p-5" style={PANEL}>
        <h2 className="font-headline text-lg font-bold text-white mb-4">Recent runs</h2>
        {history.length === 0 ? (
          <p className="font-body text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
            Nothing generated yet. Hit “Generate Now” to try it.
          </p>
        ) : (
          <div className="space-y-1.5">
            {history.map((h) => (
              <div
                key={h.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-3 py-2"
                style={{ background: "rgba(255,255,255,0.02)" }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: h.status === "ok" ? "#4ade80" : "#f87171" }}
                />
                <span className="font-body text-xs min-w-0 flex-1 truncate" style={{ color: "rgba(255,255,255,0.75)" }}>
                  {h.status === "ok" && h.slug ? (
                    <Link href={`/news/${h.slug}`} target="_blank" className="hover:underline">
                      {h.title}
                    </Link>
                  ) : (
                    h.title || h.errorMsg || "—"
                  )}
                </span>
                {h.topic && (
                  <span className="font-body text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>{h.topic}</span>
                )}
                {h.videoId && (
                  <span className="font-body text-[10px]" style={{ color: "#c4b5fd" }}>video</span>
                )}
                {h.views !== null && (
                  <span className="font-body text-[10px] tabular-nums" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {h.views} views
                  </span>
                )}
                <span className="font-body text-[10px] shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}>
                  {h.trigger} · {timeAgo(h.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
