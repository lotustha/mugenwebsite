"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";

// ─── Types ────────────────────────────────────────────────────────────────────
interface AppLink       { platform: string; url: string; }
interface AppScreenshot { url: string; caption: string; }
interface AppFaq        { question: string; answer: string; }
interface App {
  id: string; slug?: string; name: string; tagline?: string; description?: string;
  category?: string; iconUrl?: string; bannerUrl?: string; videoUrl?: string;
  privacyPolicy?: string; version: string; size?: string; packageName?: string;
  published: boolean; featured: boolean; links: AppLink[]; screenshots: AppScreenshot[]; faqs: AppFaq[];
  updatedAt: string;
}

// ─── Tokens ───────────────────────────────────────────────────────────────────
const surf    = "rgba(9,19,40,0.55)";
const surfD   = "rgba(6,14,32,0.75)";
const bdr     = "rgba(255,255,255,0.07)";
const textMut = "rgba(222,229,255,0.4)";
const textDim = "rgba(222,229,255,0.22)";
const inputCls = "w-full px-3.5 py-2.5 rounded-lg font-body text-sm text-text-main placeholder:text-text-main/25 focus:outline-none transition-all duration-200 focus:ring-1 focus:ring-primary/40";
const inputSt  = { background: surfD, border: `1px solid ${bdr}` };

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block font-body text-[0.625rem] uppercase tracking-widest font-semibold mb-1.5" style={{ color: textMut }}>{children}</label>;
}

// ─── Empty form ───────────────────────────────────────────────────────────────
const emptyForm = (): Partial<App> => ({
  name: "", slug: "", tagline: "", description: "", category: "", version: "",
  size: "", packageName: "", iconUrl: "", bannerUrl: "", videoUrl: "",
  privacyPolicy: "", published: true, featured: false,
  links: [{ platform: "PlayStore", url: "" }],
  screenshots: [],
  faqs: [],
});

// ─── Image upload field ───────────────────────────────────────────────────────
function ImageUploadField({ label, value, onChange, aspect = "square", folder = "misc" }: {
  label: string; value: string; onChange: (url: string) => void;
  aspect?: "square" | "wide" | "portrait"; folder?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr]             = useState("");
  const ref = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setUploading(true); setErr("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", folder);
      const res  = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      onChange(data.url);
    } catch (e: any) { setErr(e.message); }
    setUploading(false);
  };

  const aspectCls = aspect === "wide" ? "aspect-video" : aspect === "portrait" ? "aspect-[9/16]" : "aspect-square";

  return (
    <div>
      <Label>{label}</Label>

      {/* Upload zone */}
      <div
        className={`relative ${aspectCls} rounded-xl overflow-hidden cursor-pointer group`}
        style={{ background: surfD, border: `2px dashed ${value ? "transparent" : "rgba(139,92,246,0.25)"}` }}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) upload(f); }}
        onClick={() => !uploading && ref.current?.click()}
      >
        {value && <Image src={value} alt="" fill className="object-cover" sizes="400px" />}

        {/* Overlay: always visible when empty, hover-visible when has image, always visible when uploading */}
        <div className={`absolute inset-0 flex flex-col items-center justify-center gap-2 transition-opacity
          ${uploading
            ? "opacity-100 bg-black/70"
            : value
              ? "opacity-0 group-hover:opacity-100 bg-black/60"
              : "opacity-100"}`}>
          {uploading ? (
            <span className="w-6 h-6 rounded-full border-2 border-white/20 border-t-white animate-spin" />
          ) : (
            <>
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-7 h-7"
                style={{ color: value ? "white" : "rgba(139,92,246,0.6)" }}>
                <path d="M9.25 13.25a.75.75 0 001.5 0V4.636l2.955 3.129a.75.75 0 001.09-1.03l-4.25-4.5a.75.75 0 00-1.09 0l-4.25 4.5a.75.75 0 101.09 1.03L9.25 4.636v8.614z"/>
                <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z"/>
              </svg>
              <span className="font-body text-xs font-medium"
                style={{ color: value ? "white" : "rgba(222,229,255,0.5)" }}>
                {value ? "Change image" : "Upload or drag & drop"}
              </span>
              {!value && (
                <span className="font-body text-[0.5625rem]" style={{ color: textDim }}>
                  JPEG · PNG · WebP · max 10 MB
                </span>
              )}
            </>
          )}
        </div>
        <input ref={ref} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) { upload(f); e.target.value = ""; } }} />
      </div>

      {/* URL fallback */}
      <div className="mt-2 flex gap-2">
        <input value={value} onChange={e => onChange(e.target.value)} placeholder="Or paste image URL…"
          className={`${inputCls} flex-1`} style={inputSt} />
        {value && (
          <button type="button" onClick={() => onChange("")}
            className="px-3 rounded-lg font-body text-xs cursor-pointer transition-colors hover:bg-red-500/10 flex-none"
            style={{ color: "rgba(248,113,113,0.6)", border: `1px solid ${bdr}` }}>
            Clear
          </button>
        )}
      </div>
      {err && <p className="mt-1 font-body text-xs text-red-400">{err}</p>}
    </div>
  );
}

// ─── Screenshot upload tile ───────────────────────────────────────────────────
function ScreenshotTile({ url, caption, onUrlChange, onCaptionChange, onRemove, index }: {
  url: string; caption: string;
  onUrlChange: (v: string) => void; onCaptionChange: (v: string) => void;
  onRemove: () => void; index: number;
}) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr]             = useState("");
  const ref = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setUploading(true); setErr("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "apps/screenshots");
      const res  = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      onUrlChange(data.url);
    } catch (e: any) { setErr(e.message); }
    setUploading(false);
  };

  return (
    <div className="flex flex-col gap-1.5 flex-none" style={{ width: "96px" }}>
      {/* Portrait tile */}
      <div
        className="relative aspect-[9/16] rounded-xl overflow-hidden cursor-pointer group"
        style={{ background: surfD, border: `2px dashed ${url ? "transparent" : "rgba(139,92,246,0.2)"}` }}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) upload(f); }}
        onClick={() => !uploading && ref.current?.click()}
      >
        {url && <Image src={url} alt={`Screenshot ${index + 1}`} fill className="object-cover" sizes="96px" />}

        <div className={`absolute inset-0 flex flex-col items-center justify-center gap-1 px-1 transition-opacity
          ${uploading
            ? "opacity-100 bg-black/70"
            : url
              ? "opacity-0 group-hover:opacity-100 bg-black/60"
              : "opacity-100"}`}>
          {uploading ? (
            <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
          ) : (
            <>
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"
                style={{ color: url ? "white" : "rgba(139,92,246,0.5)" }}>
                <path d="M9.25 13.25a.75.75 0 001.5 0V4.636l2.955 3.129a.75.75 0 001.09-1.03l-4.25-4.5a.75.75 0 00-1.09 0l-4.25 4.5a.75.75 0 101.09 1.03L9.25 4.636v8.614z"/>
                <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z"/>
              </svg>
              <span className="font-body text-[0.5rem] text-center leading-tight"
                style={{ color: url ? "white" : "rgba(222,229,255,0.4)" }}>
                {url ? "Change" : "Upload"}
              </span>
            </>
          )}
        </div>

        {/* Remove */}
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onRemove(); }}
          className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full items-center justify-center hidden group-hover:flex transition-all"
          style={{ background: "rgba(239,68,68,0.85)", color: "white" }}>
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-2.5 h-2.5">
            <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
          </svg>
        </button>

        <input ref={ref} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) { upload(f); e.target.value = ""; } }} />
      </div>

      {/* Caption */}
      <input value={caption} onChange={e => onCaptionChange(e.target.value)} placeholder="Caption…"
        className="w-full px-2 py-1.5 rounded-lg font-body text-[0.5625rem] text-text-main placeholder:text-text-main/20 focus:outline-none focus:ring-1 focus:ring-primary/30"
        style={{ background: surfD, border: `1px solid ${bdr}` }} />
      {err && <p className="font-body text-[0.5rem] text-red-400 leading-tight">{err}</p>}
    </div>
  );
}

// ─── App row in list ─────────────────────────────────────────────────────────
function AppRow({ app, onEdit, onDelete, onToggleFeatured }: {
  app: App; onEdit: () => void; onDelete: () => void;
  onToggleFeatured: (featured: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl transition-colors hover:bg-white/[0.02] group"
      style={{
        border: `1px solid ${app.featured ? "rgba(251,191,36,0.25)" : bdr}`,
        background: app.featured ? "rgba(251,191,36,0.03)" : "rgba(6,14,32,0.35)",
      }}>
      <div className="w-12 h-12 rounded-xl overflow-hidden flex-none flex items-center justify-center"
        style={{ background: "linear-gradient(135deg,#8B5CF6,#D946EF)" }}>
        {app.iconUrl
          ? <Image src={app.iconUrl} alt={app.name} width={48} height={48} className="w-full h-full object-cover" />
          : <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white"><path d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18h3" /></svg>
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-headline font-semibold text-text-main">{app.name}</p>
          {app.featured && (
            <span className="px-2 py-0.5 rounded-full font-body text-[0.5625rem] font-semibold flex items-center gap-1"
              style={{ background: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)" }}>
              <svg viewBox="0 0 16 16" fill="currentColor" className="w-2.5 h-2.5"><path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" /></svg>
              Featured
            </span>
          )}
          {app.category && <span className="px-2 py-0.5 rounded-full font-body text-[0.5625rem]" style={{ background: "rgba(139,92,246,0.15)", color: "#ba9eff" }}>{app.category}</span>}
          {!app.published && <span className="px-2 py-0.5 rounded-full font-body text-[0.5625rem]" style={{ background: "rgba(239,68,68,0.1)", color: "#f87171" }}>Draft</span>}
        </div>
        <p className="font-body text-xs mt-0.5" style={{ color: textMut }}>
          v{app.version}{app.size ? ` · ${app.size}` : ""} · {app.links?.length ?? 0} links · {app.screenshots?.length ?? 0} screenshots · {app.faqs?.length ?? 0} FAQs
        </p>
      </div>
      <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Star: set/unset featured */}
        <button type="button" onClick={() => onToggleFeatured(!app.featured)}
          title={app.featured ? "Unset featured" : "Set as featured"}
          className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
          style={{
            color: app.featured ? "#fbbf24" : "rgba(251,191,36,0.35)",
            background: app.featured ? "rgba(251,191,36,0.1)" : "transparent",
          }}>
          <svg viewBox="0 0 16 16" fill={app.featured ? "currentColor" : "none"} stroke="currentColor" strokeWidth={app.featured ? 0 : 1.5} className="w-3.5 h-3.5">
            <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
          </svg>
        </button>
        <button type="button" onClick={onEdit}
          className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer hover:bg-primary/10 transition-colors"
          style={{ color: "#ba9eff" }}>
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
            <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.261-4.263a1.75 1.75 0 0 0 0-2.474Z" />
          </svg>
        </button>
        <button type="button" onClick={onDelete}
          className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer hover:bg-red-500/10 transition-colors"
          style={{ color: "rgba(248,113,113,0.6)" }}>
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
            <path d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── App form (create / edit) ─────────────────────────────────────────────────
function AppForm({ initial, onSave, onCancel }: {
  initial: Partial<App>;
  onSave: (data: Partial<App>) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Partial<App>>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const set = (k: string, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const setLink    = (i: number, k: string, v: string) =>
    set("links", (form.links ?? []).map((l, idx) => idx === i ? { ...l, [k]: v } : l));
  const addLink    = () => set("links", [...(form.links ?? []), { platform: "APK", url: "" }]);
  const removeLink = (i: number) => set("links", (form.links ?? []).filter((_, idx) => idx !== i));

  const setShot    = (i: number, k: string, v: string) =>
    set("screenshots", (form.screenshots ?? []).map((s, idx) => idx === i ? { ...s, [k]: v } : s));
  const addShot    = () => set("screenshots", [...(form.screenshots ?? []), { url: "", caption: "" }]);
  const removeShot = (i: number) => set("screenshots", (form.screenshots ?? []).filter((_, idx) => idx !== i));

  const setFaq     = (i: number, k: string, v: string) =>
    set("faqs", (form.faqs ?? []).map((f, idx) => idx === i ? { ...f, [k]: v } : f));
  const addFaq     = () => set("faqs", [...(form.faqs ?? []), { question: "", answer: "" }]);
  const removeFaq  = (i: number) => set("faqs", (form.faqs ?? []).filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSaving(true);
    try { await onSave(form); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed to save"); }
    setSaving(false);
  };

  const sectionCls = "rounded-xl p-5 space-y-4";
  const sectionSt  = { background: surf, border: `1px solid ${bdr}` };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="px-4 py-3 rounded-xl font-body text-sm" style={{ background: "rgba(239,68,68,0.08)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
          {error}
        </div>
      )}

      {/* Basic info */}
      <div className={sectionCls} style={sectionSt}>
        <p className="font-headline text-sm font-bold text-text-main">Basic Info</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label>App Name *</Label><input value={form.name ?? ""} onChange={e => set("name", e.target.value)} required placeholder="My App" className={inputCls} style={inputSt} /></div>
          <div>
            <Label>Slug (URL)</Label>
            <input value={form.slug ?? ""} onChange={e => set("slug", e.target.value)} placeholder="my-app" className={inputCls} style={inputSt} />
            <p className="mt-1 font-body text-[0.625rem]" style={{ color: textDim }}>Auto-generated from name if blank</p>
          </div>
        </div>
        <div><Label>Tagline</Label><input value={form.tagline ?? ""} onChange={e => set("tagline", e.target.value)} placeholder="One line that sells your app" className={inputCls} style={inputSt} /></div>
        <div><Label>Description</Label><textarea value={form.description ?? ""} onChange={e => set("description", e.target.value)} rows={4} placeholder="Full app description…" className={`${inputCls} resize-none`} style={inputSt} /></div>
        <div className="grid sm:grid-cols-3 gap-4">
          <div><Label>Category</Label><input value={form.category ?? ""} onChange={e => set("category", e.target.value)} placeholder="Entertainment" className={inputCls} style={inputSt} /></div>
          <div><Label>Version *</Label><input value={form.version ?? ""} onChange={e => set("version", e.target.value)} required placeholder="1.0.0" className={inputCls} style={inputSt} /></div>
          <div><Label>Size</Label><input value={form.size ?? ""} onChange={e => set("size", e.target.value)} placeholder="45 MB" className={inputCls} style={inputSt} /></div>
        </div>
        <div><Label>Package Name</Label><input value={form.packageName ?? ""} onChange={e => set("packageName", e.target.value)} placeholder="com.example.app" className={inputCls} style={inputSt} /></div>
        <div className="flex flex-wrap gap-5">
          <div className="flex items-center gap-3">
            <input type="checkbox" id="published" checked={form.published ?? true} onChange={e => set("published", e.target.checked)}
              className="w-4 h-4 cursor-pointer accent-violet-500" />
            <label htmlFor="published" className="font-body text-sm cursor-pointer" style={{ color: textMut }}>Published (visible on site)</label>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="featured" checked={form.featured ?? false} onChange={e => set("featured", e.target.checked)}
              className="w-4 h-4 cursor-pointer accent-yellow-400" />
            <label htmlFor="featured" className="font-body text-sm cursor-pointer" style={{ color: textMut }}>
              Featured <span className="font-body text-[0.625rem]" style={{ color: textDim }}>(shown first on homepage)</span>
            </label>
          </div>
        </div>
      </div>

      {/* Media */}
      <div className={sectionCls} style={sectionSt}>
        <p className="font-headline text-sm font-bold text-text-main">Media</p>

        <div className="grid sm:grid-cols-2 gap-5">
          {/* Icon — square, constrained width */}
          <div className="max-w-[180px]">
            <ImageUploadField
              label="App Icon"
              value={form.iconUrl ?? ""}
              onChange={v => set("iconUrl", v)}
              aspect="square"
              folder="apps/icons"
            />
          </div>

          {/* Banner — wide */}
          <ImageUploadField
            label="Banner Image"
            value={form.bannerUrl ?? ""}
            onChange={v => set("bannerUrl", v)}
            aspect="wide"
            folder="apps/banners"
          />
        </div>

        <div>
          <Label>Demo Video URL</Label>
          <input value={form.videoUrl ?? ""} onChange={e => set("videoUrl", e.target.value)}
            placeholder="https://youtube.com/… or direct .mp4 URL" className={inputCls} style={inputSt} />
          <p className="mt-1 font-body text-[0.625rem]" style={{ color: textDim }}>YouTube, Vimeo, or direct .mp4 URL</p>
        </div>
      </div>

      {/* Download links */}
      <div className={sectionCls} style={sectionSt}>
        <div className="flex items-center justify-between">
          <p className="font-headline text-sm font-bold text-text-main">Download Links</p>
          <button type="button" onClick={addLink} className="font-body text-xs cursor-pointer hover:text-primary transition-colors" style={{ color: "rgba(139,92,246,0.7)" }}>+ Add Link</button>
        </div>
        {(form.links ?? []).map((link, i) => (
          <div key={i} className="flex gap-2">
            <select value={link.platform} onChange={e => setLink(i, "platform", e.target.value)}
              className="px-3 py-2.5 rounded-lg font-body text-sm cursor-pointer focus:outline-none flex-none"
              style={{ ...inputSt, width: "120px" }}>
              {["PlayStore", "APK", "iOS", "Amazon", "Huawei"].map(p => <option key={p}>{p}</option>)}
            </select>
            <input type="url" value={link.url} onChange={e => setLink(i, "url", e.target.value)} placeholder="https://…" className={`${inputCls} flex-1`} style={inputSt} />
            {(form.links ?? []).length > 1 && (
              <button type="button" onClick={() => removeLink(i)} className="px-2 cursor-pointer transition-colors hover:text-red-400" style={{ color: "rgba(248,113,113,0.5)" }}>✕</button>
            )}
          </div>
        ))}
      </div>

      {/* Screenshots */}
      <div className={sectionCls} style={sectionSt}>
        <div className="flex items-center justify-between">
          <p className="font-headline text-sm font-bold text-text-main">Screenshots</p>
          <button type="button" onClick={addShot} className="font-body text-xs cursor-pointer hover:text-primary transition-colors" style={{ color: "rgba(139,92,246,0.7)" }}>+ Add Screenshot</button>
        </div>
        <p className="font-body text-[0.625rem]" style={{ color: textDim }}>Portrait (9:16) recommended · drag & drop or click to upload</p>

        {(form.screenshots ?? []).length === 0 ? (
          <button type="button" onClick={addShot}
            className="w-full flex flex-col items-center justify-center gap-2 py-8 rounded-xl cursor-pointer transition-colors hover:bg-white/[0.02]"
            style={{ border: `2px dashed rgba(139,92,246,0.2)` }}>
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-7 h-7" style={{ color: "rgba(139,92,246,0.4)" }}>
              <path d="M9.25 13.25a.75.75 0 001.5 0V4.636l2.955 3.129a.75.75 0 001.09-1.03l-4.25-4.5a.75.75 0 00-1.09 0l-4.25 4.5a.75.75 0 101.09 1.03L9.25 4.636v8.614z"/>
              <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z"/>
            </svg>
            <span className="font-body text-sm" style={{ color: textDim }}>Add your first screenshot</span>
          </button>
        ) : (
          <div className="flex flex-wrap gap-3">
            {(form.screenshots ?? []).map((s, i) => (
              <ScreenshotTile
                key={i} index={i}
                url={s.url} caption={s.caption}
                onUrlChange={v => setShot(i, "url", v)}
                onCaptionChange={v => setShot(i, "caption", v)}
                onRemove={() => removeShot(i)}
              />
            ))}
            {/* Add tile */}
            <button type="button" onClick={addShot}
              className="flex-none aspect-[9/16] rounded-xl cursor-pointer transition-colors hover:bg-white/[0.03] flex flex-col items-center justify-center gap-1"
              style={{ width: "96px", border: `2px dashed rgba(139,92,246,0.2)` }}>
              <svg viewBox="0 0 16 16" fill="currentColor" className="w-5 h-5" style={{ color: "rgba(139,92,246,0.4)" }}>
                <path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2Z" />
              </svg>
              <span className="font-body text-[0.5rem]" style={{ color: textDim }}>Add</span>
            </button>
          </div>
        )}
      </div>

      {/* FAQs */}
      <div className={sectionCls} style={sectionSt}>
        <div className="flex items-center justify-between">
          <p className="font-headline text-sm font-bold text-text-main">FAQ</p>
          <button type="button" onClick={addFaq} className="font-body text-xs cursor-pointer hover:text-primary transition-colors" style={{ color: "rgba(139,92,246,0.7)" }}>+ Add Question</button>
        </div>
        {(form.faqs ?? []).length === 0 && (
          <p className="font-body text-sm" style={{ color: textDim }}>No FAQs yet</p>
        )}
        {(form.faqs ?? []).map((f, i) => (
          <div key={i} className="space-y-2 pb-4 border-b last:border-0 last:pb-0" style={{ borderColor: bdr }}>
            <div className="flex gap-2">
              <input value={f.question} onChange={e => setFaq(i, "question", e.target.value)} placeholder="Question…" className={`${inputCls} flex-1`} style={inputSt} />
              <button type="button" onClick={() => removeFaq(i)} className="px-2 cursor-pointer transition-colors hover:text-red-400 flex-none" style={{ color: "rgba(248,113,113,0.5)" }}>✕</button>
            </div>
            <textarea value={f.answer} onChange={e => setFaq(i, "answer", e.target.value)} rows={2} placeholder="Answer…" className={`${inputCls} resize-none`} style={inputSt} />
          </div>
        ))}
      </div>

      {/* Privacy Policy */}
      <div className={sectionCls} style={sectionSt}>
        <p className="font-headline text-sm font-bold text-text-main">Privacy Policy</p>
        <p className="font-body text-[0.625rem]" style={{ color: textDim }}>Plain text or Markdown. Displayed at /apps/[id]/privacy-policy</p>
        <textarea value={form.privacyPolicy ?? ""} onChange={e => set("privacyPolicy", e.target.value)} rows={8}
          placeholder="Enter your app's privacy policy…" className={`${inputCls} resize-y`} style={inputSt} />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button type="button" onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl font-body text-sm cursor-pointer transition-all hover:bg-white/5"
          style={{ color: textMut, border: `1px solid ${bdr}` }}>
          Cancel
        </button>
        <button type="submit" disabled={saving}
          className="flex-1 py-2.5 rounded-xl font-headline text-sm font-semibold cursor-pointer transition-all hover:brightness-110 disabled:opacity-40"
          style={{ background: "linear-gradient(135deg,#8B5CF6,#D946EF)", color: "white" }}>
          {saving
            ? <span className="flex items-center justify-center gap-2"><span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block" />Saving…</span>
            : initial.id ? "Save Changes" : "Create App"}
        </button>
      </div>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdminAppsPage() {
  const [apps, setApps]       = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<App> | null>(null);

  useEffect(() => {
    fetch("/api/admin/apps").then(r => r.json()).then(d => setApps(Array.isArray(d) ? d : []))
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  const saveApp = async (data: Partial<App>) => {
    if (data.id) {
      const res = await fetch(`/api/admin/apps/${data.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      const updated = await res.json();
      setApps(p => p.map(a => a.id === updated.id ? updated : a));
    } else {
      const res = await fetch("/api/admin/apps", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      const created = await res.json();
      setApps(p => [created, ...p]);
    }
    setEditing(null);
  };

  const deleteApp = async (id: string) => {
    if (!confirm("Delete this app?")) return;
    const res = await fetch(`/api/admin/apps/${id}`, { method: "DELETE" });
    if (res.ok) setApps(p => p.filter(a => a.id !== id));
  };

  const toggleFeatured = async (id: string, featured: boolean) => {
    const res = await fetch(`/api/admin/apps/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ featured }),
    });
    if (res.ok) {
      // When featuring one app, the API unsets all others — reflect that locally
      setApps(p => p.map(a => ({ ...a, featured: a.id === id ? featured : featured ? false : a.featured })));
    }
  };

  if (editing !== null) {
    return (
      <div className="p-6 md:p-8 max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <button type="button" onClick={() => setEditing(null)} className="cursor-pointer transition-colors hover:text-text-main" style={{ color: textMut }}>
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" /></svg>
          </button>
          <h1 className="font-headline text-2xl font-bold text-text-main">
            {editing.id ? `Edit: ${editing.name}` : "Add New App"}
          </h1>
        </div>
        <AppForm initial={editing} onSave={saveApp} onCancel={() => setEditing(null)} />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold text-text-main tracking-tight">App Showcase</h1>
          <p className="font-body text-sm mt-1" style={{ color: textMut }}>
            {loading ? "Loading…" : `${apps.length} app${apps.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button type="button" onClick={() => setEditing(emptyForm())}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-headline text-sm font-semibold cursor-pointer transition-all hover:brightness-110"
          style={{ background: "linear-gradient(135deg,#8B5CF6,#D946EF)", color: "white" }}>
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2Z" /></svg>
          Add App
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map(i => (
            <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: "rgba(6,14,32,0.35)", border: `1px solid ${bdr}` }} />
          ))}
        </div>
      ) : apps.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20 rounded-2xl" style={{ background: surf, border: `1px solid ${bdr}` }}>
          <p className="font-body text-sm" style={{ color: textMut }}>No apps yet. Create your first app.</p>
          <button type="button" onClick={() => setEditing(emptyForm())}
            className="px-5 py-2.5 rounded-xl font-headline text-sm font-semibold cursor-pointer transition-all hover:brightness-110"
            style={{ background: "linear-gradient(135deg,#8B5CF6,#D946EF)", color: "white" }}>
            Add App
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {apps.map(app => (
            <AppRow key={app.id} app={app}
              onEdit={() => setEditing({ ...app })}
              onDelete={() => deleteApp(app.id)}
              onToggleFeatured={f => toggleFeatured(app.id, f)} />
          ))}
        </div>
      )}
    </div>
  );
}
