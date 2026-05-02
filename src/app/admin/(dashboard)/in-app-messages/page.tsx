"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Msg {
  id: string; title: string; body: string;
  imageUrl?: string | null; buttonText?: string | null; buttonUrl?: string | null;
  style: string; targetApp?: string | null;
  persistent: boolean; cancelable: boolean; active: boolean; priority: number;
  startsAt?: string | null; endsAt?: string | null;
  impressionCount: number; clickCount: number; ctr: number;
  createdAt: string; updatedAt: string;
}

// ─── Tokens ──────────────────────────────────────────────────────────────────
const surf  = "rgba(9,19,40,0.6)";
const surfD = "rgba(6,14,32,0.75)";
const bdr   = "rgba(255,255,255,0.07)";
const muted = "rgba(222,229,255,0.4)";
const dim   = "rgba(222,229,255,0.22)";
const inputCls = "w-full px-3.5 py-2.5 rounded-xl font-body text-sm text-text-main placeholder:text-text-main/25 outline-none transition-all focus:ring-1 focus:ring-primary/40";
const inputSt  = { background: surfD, border: `1px solid ${bdr}` };

const STYLES = [
  { value: "info",    label: "Info",    color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  { value: "promo",   label: "Promo",   color: "#a78bfa", bg: "rgba(139,92,246,0.15)" },
  { value: "warning", label: "Warning", color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
  { value: "alert",   label: "Alert",   color: "#f87171", bg: "rgba(248,113,113,0.12)" },
];

const styleOf = (s: string) => STYLES.find(x => x.value === s) ?? STYLES[0];

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block font-body text-[0.625rem] uppercase tracking-widest font-semibold mb-1.5" style={{ color: muted }}>{children}</label>;
}

// ─── Image paste / drag-drop / upload field ────────────────────────────────
function ImagePasteField({ value, onChange }: { value: string; onChange: (url: string | null) => void }) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr]             = useState("");
  const [dragOver, setDragOver]   = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);

  const upload = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) { setErr("Only image files are supported"); return; }
    setUploading(true); setErr("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "in-app-messages");
      const res  = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      onChange(data.url);
    } catch (e: any) { setErr(e.message); }
    setUploading(false);
  }, [onChange]);

  // Global paste listener — fires when user presses Ctrl+V anywhere inside the modal
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (uploading) return;
      const items = Array.from(e.clipboardData?.items ?? []);
      const imgItem = items.find(i => i.type.startsWith("image/"));
      if (!imgItem) return;
      e.preventDefault();
      const file = imgItem.getAsFile();
      if (file) upload(file);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [upload, uploading]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  };

  return (
    <div className="space-y-2">
      <Label>Image (optional)</Label>

      {/* Drop / paste zone */}
      <div ref={zoneRef}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !uploading && !value && fileRef.current?.click()}
        className="relative rounded-xl overflow-hidden transition-all duration-200"
        style={{
          border: `2px dashed ${dragOver ? "rgba(139,92,246,0.6)" : value ? "transparent" : "rgba(139,92,246,0.25)"}`,
          background: value ? "transparent" : dragOver ? "rgba(139,92,246,0.08)" : surfD,
          cursor: value ? "default" : "pointer",
          minHeight: value ? "auto" : 100,
        }}>

        {value ? (
          /* Preview */
          <div className="relative group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="Preview" className="w-full rounded-xl object-cover" style={{ maxHeight: 160 }} />
            {/* Overlay actions */}
            <div className="absolute inset-0 rounded-xl flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: "rgba(6,3,18,0.65)" }}>
              <button type="button" onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-body text-xs cursor-pointer transition-all hover:bg-white/10"
                style={{ color: "rgba(222,229,255,0.8)", border: "1px solid rgba(255,255,255,0.15)" }}>
                <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                  <path d="M9.25 13.25a.75.75 0 0 0 1.5 0V4.636l2.955 3.129a.75.75 0 0 0 1.09-1.03l-4.25-4.5a.75.75 0 0 0-1.09 0l-4.25 4.5a.75.75 0 1 0 1.09 1.03L9.25 4.636v8.614Z" />
                </svg>
                Change
              </button>
              <button type="button" onClick={() => { onChange(null); setErr(""); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-body text-xs cursor-pointer transition-all hover:bg-red-500/20"
                style={{ color: "#fca5a5", border: "1px solid rgba(248,113,113,0.25)" }}>
                <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                  <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
                </svg>
                Remove
              </button>
            </div>
          </div>
        ) : uploading ? (
          /* Uploading spinner */
          <div className="flex flex-col items-center justify-center gap-2 py-7">
            <span className="w-6 h-6 rounded-full border-2 animate-spin"
              style={{ borderColor: "rgba(139,92,246,0.2)", borderTopColor: "#8B5CF6" }} />
            <p className="font-body text-xs" style={{ color: muted }}>Uploading…</p>
          </div>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center gap-2 py-7 select-none">
            <svg viewBox="0 0 24 24" fill="none" stroke="rgba(139,92,246,0.5)" strokeWidth="1.5" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
            <div className="text-center">
              <p className="font-body text-sm" style={{ color: muted }}>
                <kbd className="px-1.5 py-0.5 rounded text-[0.625rem] font-mono" style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${bdr}` }}>Ctrl+V</kbd>
                {" "}to paste · drag & drop · or{" "}
                <span className="underline" style={{ color: "#a78bfa" }}>click to upload</span>
              </p>
              <p className="font-body text-[0.625rem] mt-1" style={{ color: dim }}>PNG · JPG · WebP · max 10 MB</p>
            </div>
          </div>
        )}
      </div>

      {/* URL text input fallback */}
      <div className="flex gap-2">
        <input
          value={value}
          onChange={e => { onChange(e.target.value || null); setErr(""); }}
          placeholder="Or paste image URL…"
          className={`${inputCls} flex-1 font-mono text-xs`}
          style={inputSt}
        />
        {value && (
          <button type="button" onClick={() => { onChange(null); setErr(""); }}
            className="px-3 rounded-xl font-body text-xs cursor-pointer transition-colors hover:bg-red-500/10 flex-none"
            style={{ color: "rgba(248,113,113,0.6)", border: `1px solid ${bdr}` }}>
            Clear
          </button>
        )}
      </div>

      {err && <p className="font-body text-xs text-red-400">{err}</p>}

      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) { upload(f); e.target.value = ""; } }} />
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer" onClick={onChange}>
      <div className="relative rounded-full transition-colors" style={{ width: 36, height: 20, background: checked ? "rgba(139,92,246,0.6)" : "rgba(255,255,255,0.1)" }}>
        <div className="absolute top-0.5 rounded-full bg-white transition-transform" style={{ width: 16, height: 16, left: 2, transform: checked ? "translateX(16px)" : "none" }} />
      </div>
      <span className="font-body text-sm" style={{ color: muted }}>{label}</span>
    </label>
  );
}

// ─── Preview card ────────────────────────────────────────────────────────────
function MessagePreview({ form }: { form: Partial<Msg> }) {
  const st = styleOf(form.style ?? "info");
  return (
    <div className="rounded-2xl overflow-hidden max-w-sm mx-auto shadow-2xl"
      style={{ background: "rgba(11,4,22,0.95)", border: `1px solid ${st.color}40`, boxShadow: `0 0 40px ${st.color}20` }}>
      {form.imageUrl && (
        <div className="relative h-36 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={form.imageUrl} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom,transparent 50%,rgba(11,4,22,0.8))" }} />
        </div>
      )}
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full font-body text-[0.625rem] font-semibold uppercase tracking-widest"
            style={{ background: st.bg, color: st.color }}>
            {st.label}
          </span>
          {form.persistent && (
            <span className="px-2 py-1 rounded-full font-body text-[0.5625rem] font-semibold"
              style={{ background: "rgba(251,191,36,0.12)", color: "#fbbf24" }}>
              Persistent
            </span>
          )}
          {!form.cancelable && (
            <span className="px-2 py-1 rounded-full font-body text-[0.5625rem] font-semibold"
              style={{ background: "rgba(248,113,113,0.12)", color: "#f87171" }}>
              Required
            </span>
          )}
        </div>
        <p className="font-headline text-base font-bold text-white">{form.title || "Message title"}</p>
        <p className="font-body text-sm leading-relaxed" style={{ color: "rgba(222,229,255,0.65)" }}>
          {form.body || "Message body text will appear here."}
        </p>
        <div className="flex gap-2 pt-1">
          {form.buttonText && (
            <div className="flex-1 py-2.5 rounded-xl font-headline text-sm font-bold text-center"
              style={{ background: `linear-gradient(135deg,${st.color}cc,${st.color}88)`, color: "white" }}>
              {form.buttonText}
            </div>
          )}
          {form.cancelable && (
            <div className="px-4 py-2.5 rounded-xl font-body text-sm text-center"
              style={{ color: dim, border: `1px solid ${bdr}` }}>
              Dismiss
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Create / Edit form ───────────────────────────────────────────────────────
function MessageForm({ initial, apps, onSave, onCancel }: {
  initial: Partial<Msg>;
  apps: { id: string; slug?: string | null; name: string }[];
  onSave: (data: Partial<Msg>) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm]   = useState<Partial<Msg>>(initial);
  const [saving, setSaving] = useState(false);
  const [tab, setTab]     = useState<"form" | "preview">("form");
  const set = (k: string, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-2xl rounded-2xl overflow-hidden max-h-[90vh] flex flex-col"
        style={{ background: "rgba(9,19,40,0.98)", border: "1px solid rgba(139,92,246,0.25)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: bdr }}>
          <h2 className="font-headline text-lg font-bold text-white/90">
            {initial.id ? "Edit Message" : "New In-App Message"}
          </h2>
          <div className="flex items-center gap-3">
            {["form","preview"].map(t => (
              <button key={t} type="button" onClick={() => setTab(t as "form"|"preview")}
                className="px-3 py-1.5 rounded-lg font-body text-xs cursor-pointer transition-all"
                style={{
                  background: tab === t ? "rgba(139,92,246,0.2)" : "transparent",
                  color:      tab === t ? "#a78bfa" : muted,
                  border:     tab === t ? "1px solid rgba(139,92,246,0.3)" : "1px solid transparent",
                }}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
            <button type="button" onClick={onCancel} className="text-white/30 hover:text-white/70 cursor-pointer">
              <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1">
          {tab === "preview" ? (
            <div className="p-8 flex items-center justify-center" style={{ background: "rgba(6,3,18,0.8)" }}>
              <MessagePreview form={form} />
            </div>
          ) : (
            <form id="msg-form" onSubmit={submit} className="p-6 space-y-5">
              {/* Style selector */}
              <div>
                <Label>Style</Label>
                <div className="flex gap-2">
                  {STYLES.map(s => (
                    <button key={s.value} type="button" onClick={() => set("style", s.value)}
                      className="flex-1 py-2 rounded-xl font-body text-xs font-semibold cursor-pointer transition-all"
                      style={{
                        background: form.style === s.value ? s.bg : "rgba(255,255,255,0.04)",
                        color:      form.style === s.value ? s.color : dim,
                        border:     `1px solid ${form.style === s.value ? s.color + "50" : bdr}`,
                      }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title + Body */}
              <div><Label>Title *</Label><input value={form.title ?? ""} onChange={e => set("title", e.target.value)} required placeholder="e.g. New Update Available!" className={inputCls} style={inputSt} /></div>
              <div><Label>Body *</Label><textarea value={form.body ?? ""} onChange={e => set("body", e.target.value)} required rows={3} placeholder="Message body text…" className={`${inputCls} resize-none`} style={inputSt} /></div>

              {/* Image */}
              <ImagePasteField value={form.imageUrl ?? ""} onChange={v => set("imageUrl", v)} />

              {/* Button */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div><Label>Button Text</Label><input value={form.buttonText ?? ""} onChange={e => set("buttonText", e.target.value || null)} placeholder="Open Now" className={inputCls} style={inputSt} /></div>
                <div>
                  <Label>Button URL / Deep Link</Label>
                  <input value={form.buttonUrl ?? ""} onChange={e => set("buttonUrl", e.target.value || null)} placeholder="https://… or mugenanime://post/slug" className={inputCls} style={inputSt} />
                  <p className="mt-1 font-body text-[0.5625rem]" style={{ color: dim }}>Use mugenanime://post/slug, mugenanime://wallpaper/id, etc.</p>
                </div>
              </div>

              {/* Targeting */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Target App</Label>
                  <select value={form.targetApp ?? ""} onChange={e => set("targetApp", e.target.value || null)}
                    className={`${inputCls} cursor-pointer`} style={inputSt}>
                    <option value="">All Apps</option>
                    {apps.map(a => <option key={a.id} value={a.slug ?? a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Priority (higher = first)</Label>
                  <input type="number" value={form.priority ?? 0} onChange={e => set("priority", parseInt(e.target.value) || 0)} className={inputCls} style={inputSt} />
                </div>
              </div>

              {/* Schedule */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div><Label>Start Date (optional)</Label><input type="datetime-local" value={form.startsAt?.slice(0,16) ?? ""} onChange={e => set("startsAt", e.target.value || null)} className={inputCls} style={inputSt} /></div>
                <div><Label>End Date (optional)</Label><input type="datetime-local" value={form.endsAt?.slice(0,16) ?? ""} onChange={e => set("endsAt", e.target.value || null)} className={inputCls} style={inputSt} /></div>
              </div>

              {/* Behaviour toggles */}
              <div className="rounded-xl p-4 space-y-3" style={{ background: surf, border: `1px solid ${bdr}` }}>
                <p className="font-headline text-xs font-semibold text-text-main mb-1">Behaviour</p>
                <Toggle checked={form.active ?? true}     onChange={() => set("active", !form.active)}         label="Active (visible to users)" />
                <Toggle checked={form.persistent ?? false} onChange={() => set("persistent", !form.persistent)} label="Persistent — re-show on every launch until button clicked" />
                <Toggle checked={form.cancelable ?? true}  onChange={() => set("cancelable", !form.cancelable)} label="Cancelable — user can dismiss without clicking button" />
                {!form.cancelable && (
                  <p className="font-body text-xs pl-11" style={{ color: "#f87171" }}>
                    User MUST click the button to close this message.
                  </p>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t" style={{ borderColor: bdr }}>
          <button type="button" onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl font-body text-sm cursor-pointer transition-all hover:bg-white/5"
            style={{ color: muted, border: `1px solid ${bdr}` }}>
            Cancel
          </button>
          <button form="msg-form" type="submit" disabled={saving}
            className="flex-1 py-2.5 rounded-xl font-headline text-sm font-semibold cursor-pointer transition-all hover:brightness-110 disabled:opacity-40"
            style={{ background: "linear-gradient(135deg,#8B5CF6,#D946EF)", color: "white" }}>
            {saving ? "Saving…" : initial.id ? "Save Changes" : "Create Message"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Message row ─────────────────────────────────────────────────────────────
function MsgRow({ msg, onEdit, onToggle, onRedeploy, onDelete }: {
  msg: Msg; onEdit: () => void; onToggle: () => void;
  onRedeploy: () => void; onDelete: () => void;
}) {
  const st = styleOf(msg.style);
  return (
    <div className="rounded-2xl p-5 transition-colors group"
      style={{ background: msg.active ? surf : "rgba(6,14,32,0.4)", border: `1px solid ${msg.active ? bdr : "rgba(255,255,255,0.04)"}` }}>
      <div className="flex items-start gap-4 flex-wrap">

        {/* Style dot */}
        <div className="w-2 h-2 rounded-full mt-2 flex-none" style={{ background: st.color, boxShadow: `0 0 8px ${st.color}80` }} />

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-headline text-base font-semibold text-text-main">{msg.title}</p>
            <span className="px-2 py-0.5 rounded-full font-body text-[0.5625rem] font-semibold"
              style={{ background: st.bg, color: st.color }}>{st.label}</span>
            {!msg.active && <span className="px-2 py-0.5 rounded-full font-body text-[0.5625rem]" style={{ background: "rgba(255,255,255,0.06)", color: dim }}>Inactive</span>}
            {msg.persistent && <span className="px-2 py-0.5 rounded-full font-body text-[0.5625rem]" style={{ background: "rgba(251,191,36,0.12)", color: "#fbbf24" }}>Persistent</span>}
            {!msg.cancelable && <span className="px-2 py-0.5 rounded-full font-body text-[0.5625rem]" style={{ background: "rgba(248,113,113,0.12)", color: "#f87171" }}>Required</span>}
            {msg.targetApp ? (
              <span className="px-2 py-0.5 rounded-full font-body text-[0.5625rem]" style={{ background: "rgba(139,92,246,0.15)", color: "#a78bfa" }}>/{msg.targetApp}</span>
            ) : (
              <span className="px-2 py-0.5 rounded-full font-body text-[0.5625rem]" style={{ background: "rgba(255,255,255,0.06)", color: dim }}>All Apps</span>
            )}
          </div>
          <p className="font-body text-sm line-clamp-1" style={{ color: muted }}>{msg.body}</p>
          {msg.buttonText && (
            <p className="font-body text-xs" style={{ color: "rgba(139,92,246,0.7)" }}>
              Button: "{msg.buttonText}" → {msg.buttonUrl ?? "—"}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-5 flex-none">
          {[
            { label: "Shown",   value: msg.impressionCount.toLocaleString(), color: "rgba(222,229,255,0.65)" },
            { label: "Clicked", value: msg.clickCount.toLocaleString(),      color: "#a78bfa" },
            { label: "CTR",     value: `${msg.ctr}%`,                        color: msg.ctr > 20 ? "#34d399" : msg.ctr > 5 ? "#fbbf24" : "rgba(222,229,255,0.3)" },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="font-headline text-base font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="font-body text-[0.5625rem] uppercase tracking-widest" style={{ color: dim }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-none">
          <button type="button" onClick={onEdit} title="Edit"
            className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer hover:bg-primary/10 transition-colors"
            style={{ color: "#ba9eff" }}>
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.261-4.263a1.75 1.75 0 0 0 0-2.474Z" /></svg>
          </button>
          <button type="button" onClick={onRedeploy} title="Redeploy"
            className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer hover:bg-emerald-500/10 transition-colors"
            style={{ color: "rgba(52,211,153,0.7)" }}>
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path d="M1.705 8.005a.75.75 0 0 1 .834.656 5.5 5.5 0 0 0 9.592 2.97l-1.204-1.204a.25.25 0 0 1 .177-.427h3.646a.25.25 0 0 1 .25.25v3.646a.25.25 0 0 1-.427.177l-1.38-1.38A7.002 7.002 0 0 1 1.05 8.84a.75.75 0 0 1 .656-.834ZM8 2.5a5.487 5.487 0 0 0-4.131 1.869l1.204 1.204A.25.25 0 0 1 4.896 6H1.25A.25.25 0 0 1 1 5.75V2.104a.25.25 0 0 1 .427-.177l1.38 1.38A7.002 7.002 0 0 1 14.95 7.16a.75.75 0 0 1-1.49.178A5.5 5.5 0 0 0 8 2.5Z" /></svg>
          </button>
          <button type="button" onClick={onToggle} title={msg.active ? "Deactivate" : "Activate"}
            className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors"
            style={{ color: msg.active ? "rgba(251,191,36,0.7)" : "rgba(52,211,153,0.7)" }}>
            {msg.active
              ? <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path d="M4.177 7.823a1.5 1.5 0 0 0 0 2.122l3 3a1.5 1.5 0 0 0 2.12 0l7.5-7.5a1.5 1.5 0 0 0-2.12-2.122L8.25 9.793 5.298 6.84a1.5 1.5 0 0 0-1.122-.517Z" /></svg>
              : <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z" /></svg>
            }
          </button>
          <button type="button" onClick={onDelete} title="Delete"
            className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer hover:bg-red-500/10 transition-colors"
            style={{ color: "rgba(248,113,113,0.5)" }}>
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Z" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function InAppMessagesPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [apps, setApps]         = useState<{ id: string; slug?: string | null; name: string }[]>([]);
  const [loading, setLoading]   = useState(true);
  const [editing, setEditing]   = useState<Partial<Msg> | null>(null);

  const load = async () => {
    setLoading(true);
    const [msgs, appsData] = await Promise.all([
      fetch("/api/admin/in-app-messages").then(r => r.json()).catch(() => []),
      fetch("/api/admin/apps").then(r => r.json()).catch(() => []),
    ]);
    setMessages(Array.isArray(msgs) ? msgs : []);
    setApps(Array.isArray(appsData) ? appsData : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const empty = (): Partial<Msg> => ({
    title: "", body: "", style: "info",
    active: true, persistent: false, cancelable: true, priority: 0,
  });

  const save = async (data: Partial<Msg>) => {
    const url    = data.id ? `/api/admin/in-app-messages/${data.id}` : "/api/admin/in-app-messages";
    const method = data.id ? "PUT" : "POST";
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    setEditing(null);
    load();
  };

  const toggle = async (msg: Msg) => {
    await fetch(`/api/admin/in-app-messages/${msg.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !msg.active }),
    });
    setMessages(p => p.map(m => m.id === msg.id ? { ...m, active: !m.active } : m));
  };

  const redeploy = async (msg: Msg) => {
    const resetStats = confirm("Reset impression & click stats when redeploying?\n\nOK = reset stats (all devices will see it again)\nCancel = keep existing stats");
    await fetch(`/api/admin/in-app-messages/${msg.id}/redeploy`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resetStats }),
    });
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this message and all its tracking data?")) return;
    await fetch(`/api/admin/in-app-messages/${id}`, { method: "DELETE" });
    setMessages(p => p.filter(m => m.id !== id));
  };

  const active   = messages.filter(m => m.active);
  const inactive = messages.filter(m => !m.active);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-headline text-2xl font-bold text-text-main">In-App Messages</h1>
          <p className="font-body text-sm mt-1" style={{ color: muted }}>
            {active.length} active · {messages.length} total
          </p>
        </div>
        <button type="button" onClick={() => setEditing(empty())}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-headline text-sm font-semibold cursor-pointer text-white transition-all hover:brightness-110"
          style={{ background: "linear-gradient(135deg,#8B5CF6,#D946EF)", boxShadow: "0 0 16px rgba(139,92,246,0.3)" }}>
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2Z" /></svg>
          New Message
        </button>
      </div>

      {/* Stats bar */}
      {messages.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Shown",   value: messages.reduce((n, m) => n + m.impressionCount, 0).toLocaleString(), color: "rgba(222,229,255,0.8)" },
            { label: "Total Clicked", value: messages.reduce((n, m) => n + m.clickCount, 0).toLocaleString(),      color: "#a78bfa" },
            { label: "Avg CTR",
              value: (() => {
                const tot = messages.reduce((n, m) => n + m.impressionCount, 0);
                const clk = messages.reduce((n, m) => n + m.clickCount, 0);
                return tot > 0 ? `${Math.round((clk / tot) * 100)}%` : "—";
              })(),
              color: "#34d399" },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-5 text-center" style={{ background: surf, border: `1px solid ${bdr}` }}>
              <p className="font-headline text-2xl font-bold mb-1" style={{ color: s.color }}>{s.value}</p>
              <p className="font-body text-xs uppercase tracking-widest" style={{ color: dim }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Lists */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <span className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(139,92,246,0.3)", borderTopColor: "#a78bfa" }} />
        </div>
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-24 rounded-2xl text-center"
          style={{ background: surf, border: `1px solid ${bdr}` }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(139,92,246,0.15)" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5" className="w-7 h-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
            </svg>
          </div>
          <p className="font-headline text-lg font-bold text-text-main">No messages yet</p>
          <p className="font-body text-sm" style={{ color: muted }}>Create your first in-app message to engage your users.</p>
          <button type="button" onClick={() => setEditing(empty())}
            className="px-5 py-2.5 rounded-xl font-headline text-sm font-semibold cursor-pointer text-white hover:brightness-110 transition-all"
            style={{ background: "linear-gradient(135deg,#8B5CF6,#D946EF)" }}>
            Create Message
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <div className="space-y-3">
              <p className="font-body text-xs uppercase tracking-widest font-semibold" style={{ color: dim }}>
                Active ({active.length})
              </p>
              {active.map(m => (
                <MsgRow key={m.id} msg={m}
                  onEdit={() => setEditing({ ...m })}
                  onToggle={() => toggle(m)}
                  onRedeploy={() => redeploy(m)}
                  onDelete={() => del(m.id)} />
              ))}
            </div>
          )}
          {inactive.length > 0 && (
            <div className="space-y-3">
              <p className="font-body text-xs uppercase tracking-widest font-semibold" style={{ color: dim }}>
                Inactive ({inactive.length})
              </p>
              {inactive.map(m => (
                <MsgRow key={m.id} msg={m}
                  onEdit={() => setEditing({ ...m })}
                  onToggle={() => toggle(m)}
                  onRedeploy={() => redeploy(m)}
                  onDelete={() => del(m.id)} />
              ))}
            </div>
          )}
        </div>
      )}

      {editing !== null && (
        <MessageForm initial={editing} apps={apps} onSave={save} onCancel={() => setEditing(null)} />
      )}
    </div>
  );
}
