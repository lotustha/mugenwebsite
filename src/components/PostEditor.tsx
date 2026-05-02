"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const RichEditor = dynamic(() => import("@/components/RichEditor"), { ssr: false });

interface Category { id: string; name: string; }
interface Tag { id: string; name: string; }

interface PostForm {
  title: string; slug: string; summary: string; content: string;
  published: boolean; featuredImage: string; featuredImageAlt: string;
  categoryIds: string[]; tagIds: string[];
  seo: { metaTitle: string; metaDescription: string; ogImageUrl: string; canonicalUrl: string; keywords: string; };
}

const EMPTY: PostForm = {
  title: "", slug: "", summary: "", content: "", published: false,
  featuredImage: "", featuredImageAlt: "",
  categoryIds: [], tagIds: [],
  seo: { metaTitle: "", metaDescription: "", ogImageUrl: "", canonicalUrl: "", keywords: "" },
};

function autoSlug(v: string) { return v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }

// ─── Panel wrapper ───────────────────────────────────────────────────────────
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(9,19,40,0.5)" }}>
      <div className="px-5 py-3.5 border-b flex items-center gap-2" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(6,14,32,0.5)" }}>
        <span className="font-headline text-sm font-semibold text-text-main">{title}</span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Field ───────────────────────────────────────────────────────────────────
const inputCls = "w-full px-3.5 py-2.5 rounded-lg font-body text-sm text-text-main placeholder:text-text-main/25 focus:outline-none transition-all duration-200 focus:ring-1 focus:ring-primary/40";
const inputStyle = { background: "rgba(6,14,32,0.7)", border: "1px solid rgba(255,255,255,0.07)" };
function Label({ children }: { children: React.ReactNode }) {
  return <label className="block font-body text-[11px] uppercase tracking-widest font-medium mb-1.5" style={{ color: "rgba(222,229,255,0.4)" }}>{children}</label>;
}

// ─── Quick-create inline ──────────────────────────────────────────────────────
function QuickCreate({ placeholder, onCreate }: { placeholder: string; onCreate: (name: string) => Promise<void> }) {
  const [val, setVal] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    if (!val.trim()) return;
    setLoading(true);
    await onCreate(val.trim());
    setVal("");
    setLoading(false);
  };
  return (
    <div className="flex gap-2 mt-2">
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), submit())}
        placeholder={placeholder}
        className={inputCls + " flex-1 text-xs py-2"}
        style={inputStyle}
      />
      <button type="button" onClick={submit} disabled={loading || !val.trim()}
        className="px-3 py-2 rounded-lg text-xs font-headline font-semibold cursor-pointer disabled:opacity-40 transition-colors"
        style={{ background: "rgba(186,158,255,0.15)", color: "#ba9eff", border: "1px solid rgba(186,158,255,0.2)" }}>
        {loading ? "…" : "+ Add"}
      </button>
    </div>
  );
}

// ─── Featured Image picker ───────────────────────────────────────────────────
function FeaturedImagePanel({ url, alt, onUrl, onAlt }: { url: string; alt: string; onUrl: (u: string) => void; onAlt: (a: string) => void; }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");

  const upload = async (file: File) => {
    setUploading(true);
    setUploadErr("");
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) {
        onUrl(data.url);
      } else {
        setUploadErr(data.error ?? "Upload failed");
      }
    } catch (e: any) {
      setUploadErr(e?.message ?? "Upload failed");
    }
    setUploading(false);
  };

  return (
    <Panel title="Featured Image">
      {url ? (
        <div className="space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={alt || "featured"} className="w-full h-44 object-cover rounded-lg" style={{ border: "1px solid rgba(255,255,255,0.07)" }} />
          <div>
            <Label>Alt text</Label>
            <input value={alt} onChange={(e) => onAlt(e.target.value)} placeholder="Describe the image…" className={inputCls} style={inputStyle} />
          </div>
          <button type="button" onClick={() => { onUrl(""); onAlt(""); }}
            className="text-xs font-body transition-colors cursor-pointer" style={{ color: "rgba(239,68,68,0.7)" }}>
            Remove image
          </button>
        </div>
      ) : (
        <div>
          <button type="button" onClick={() => fileRef.current?.click()}
            className="w-full h-36 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed cursor-pointer transition-colors hover:border-primary/40"
            style={{ borderColor: "rgba(255,255,255,0.08)", color: "rgba(222,229,255,0.35)" }}>
            {uploading ? (
              <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(186,158,255,0.2)", borderTopColor: "#ba9eff" }} />
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="font-body text-xs">Click to upload featured image</span>
              </>
            )}
          </button>
          <div className="mt-2">
            <Label>Or paste URL</Label>
            <input value={url} onChange={(e) => onUrl(e.target.value)} placeholder="https://…" className={inputCls} style={inputStyle} />
          </div>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
      {uploadErr && <p className="mt-2 font-body text-xs text-red-400">{uploadErr}</p>}
    </Panel>
  );
}

// ─── Main editor ─────────────────────────────────────────────────────────────
export default function PostEditor({ postId }: { postId?: string }) {
  const router = useRouter();
  const [form, setForm] = useState<PostForm>(EMPTY);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saved">("idle");
  const [activeTab, setActiveTab] = useState<"content" | "seo">("content");
  const [aiTopic, setAiTopic] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const isEdit = !!postId;

  const set = useCallback(<K extends keyof PostForm>(k: K, v: PostForm[K]) =>
    setForm((p) => ({ ...p, [k]: v })), []);
  const setSeo = useCallback(<K extends keyof PostForm["seo"]>(k: K, v: string) =>
    setForm((p) => ({ ...p, seo: { ...p.seo, [k]: v } })), []);

  // Load data
  useEffect(() => {
    Promise.all([
      fetch("/api/admin/categories").then((r) => r.json()),
      fetch("/api/admin/tags").then((r) => r.json()),
      ...(postId ? [fetch(`/api/admin/posts/${postId}`).then((r) => r.json())] : []),
    ]).then(([cats, tgs, post]) => {
      setCategories(Array.isArray(cats) ? cats : []);
      setTags(Array.isArray(tgs) ? tgs : []);
      if (post && !post.error) {
        setForm({
          title: post.title ?? "", slug: post.slug ?? "", summary: post.summary ?? "",
          content: post.content ?? "", published: post.published ?? false,
          featuredImage: post.featuredImage ?? "", featuredImageAlt: post.featuredImageAlt ?? "",
          categoryIds: (post.categories ?? []).map((c: Category) => c.id),
          tagIds: (post.tags ?? []).map((t: Tag) => t.id),
          seo: {
            metaTitle: post.seoMeta?.metaTitle ?? "",
            metaDescription: post.seoMeta?.metaDescription ?? "",
            ogImageUrl: post.seoMeta?.ogImageUrl ?? "",
            canonicalUrl: post.seoMeta?.canonicalUrl ?? "",
            keywords: post.seoMeta?.keywords ?? "",
          },
        });
      }
      setLoading(false);
    }).catch(() => setLoading(false));
    setLoading(true);
  }, [postId]);

  const handleSave = async (published?: boolean) => {
    setError(""); setSaving(true);
    const body = { ...form, ...(published !== undefined ? { published } : {}) };
    const res = await fetch(
      isEdit ? `/api/admin/posts/${postId}` : "/api/admin/posts",
      { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    );
    if (res.ok) {
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2500);
      if (!isEdit) {
        const data = await res.json();
        router.replace(`/admin/posts/${data.id}/edit`);
      } else {
        setForm((p) => ({ ...p, ...(published !== undefined ? { published } : {}) }));
      }
    } else {
      const data = await res.json();
      setError(data.error ?? "Save failed");
    }
    setSaving(false);
  };

  const quickCreateCategory = async (name: string) => {
    const res = await fetch("/api/admin/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    const cat = await res.json();
    if (cat.id) {
      setCategories((p) => [...p, cat].sort((a, b) => a.name.localeCompare(b.name)));
      set("categoryIds", [...form.categoryIds, cat.id]);
    }
  };

  const quickCreateTag = async (name: string) => {
    const res = await fetch("/api/admin/tags", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    const tag = await res.json();
    if (tag.id) {
      setTags((p) => [...p, tag].sort((a, b) => a.name.localeCompare(b.name)));
      set("tagIds", [...form.tagIds, tag.id]);
    }
  };

  const toggleId = (arr: string[], id: string) =>
    arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];

  const handleAiGenerate = async () => {
    if (!aiTopic.trim()) return;
    setAiLoading(true);
    setAiError("");
    try {
      const res = await fetch("/api/admin/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: aiTopic.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.rawText ? `${data.error}\nRaw AI output: ${data.rawText}` : (data.error ?? "AI generation failed"));
      }
      setForm((p) => ({
        ...p,
        title: data.title ?? p.title,
        slug: data.slug ?? p.slug,
        summary: data.summary ?? p.summary,
        content: data.content ?? p.content,
        seo: {
          ...p.seo,
          metaTitle: data.title ?? p.seo.metaTitle,
          metaDescription: data.summary ?? p.seo.metaDescription,
          keywords: (data.tags ?? []).join(", ") || p.seo.keywords,
        },
      }));
      // Auto-add matching tags
      if (data.tags?.length && tags.length) {
        const matched = tags.filter((t) =>
          data.tags.some((dt: string) => t.name.toLowerCase() === dt.toLowerCase())
        ).map((t) => t.id);
        if (matched.length) setForm((p) => ({ ...p, tagIds: [...new Set([...p.tagIds, ...matched])] }));
      }
      setAiTopic("");
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "AI generation failed");
    }
    setAiLoading(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(186,158,255,0.2)", borderTopColor: "#ba9eff" }} />
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="flex-1">
          <h1 className="font-headline text-2xl font-bold text-text-main">
            {isEdit ? "Edit Post" : "New Post"}
          </h1>
        </div>
        <div className="flex items-center gap-2.5">
          {saveState === "saved" && (
            <span className="font-body text-xs" style={{ color: "rgba(134,239,172,0.8)" }}>✓ Saved</span>
          )}
          {error && <span className="font-body text-xs text-red-400">{error}</span>}
          <button type="button" onClick={() => router.push("/admin/posts")}
            className="px-4 py-2 rounded-lg font-body text-sm cursor-pointer transition-colors"
            style={{ background: "rgba(255,255,255,0.04)", color: "rgba(222,229,255,0.5)", border: "1px solid rgba(255,255,255,0.07)" }}>
            ← Back
          </button>
          <button type="button" onClick={() => handleSave()} disabled={saving}
            className="px-4 py-2 rounded-lg font-headline text-sm font-semibold cursor-pointer disabled:opacity-50 transition-colors"
            style={{ background: "rgba(186,158,255,0.12)", color: "#ba9eff", border: "1px solid rgba(186,158,255,0.2)" }}>
            {saving ? "Saving…" : "Save Draft"}
          </button>
          <button type="button" onClick={() => handleSave(!form.published)} disabled={saving}
            className="px-4 py-2 rounded-lg font-headline text-sm font-semibold cursor-pointer disabled:opacity-50 transition-colors"
            style={{ background: form.published ? "rgba(239,68,68,0.15)" : "linear-gradient(135deg,#ba9eff,#8455ef)", color: form.published ? "#fca5a5" : "#0f0820" }}>
            {form.published ? "Unpublish" : "Publish"}
          </button>
        </div>
      </div>

      {/* Layout: main + sidebar */}
      <div className="flex gap-6 flex-1 min-h-0">
        {/* ── Main column ── */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Title */}
          <div>
            <input
              value={form.title}
              onChange={(e) => { set("title", e.target.value); if (!isEdit || !form.slug) set("slug", autoSlug(e.target.value)); }}
              placeholder="Post title…"
              className="w-full px-0 py-2 bg-transparent font-headline text-3xl font-bold text-text-main placeholder:text-text-main/20 focus:outline-none border-b"
              style={{ borderColor: "rgba(255,255,255,0.07)" }}
            />
          </div>

          {/* Slug */}
          <div className="flex items-center gap-2">
            <span className="font-body text-xs shrink-0" style={{ color: "rgba(222,229,255,0.3)" }}>Slug:</span>
            <input
              value={form.slug}
              onChange={(e) => set("slug", autoSlug(e.target.value))}
              className="flex-1 px-2 py-1 rounded font-body text-xs text-text-main/60 focus:outline-none focus:text-text-main transition-colors"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
            />
          </div>

          {/* Tabs: Content / SEO */}
          <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: "rgba(6,14,32,0.6)" }}>
            {(["content", "seo"] as const).map((tab) => (
              <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                className="px-4 py-1.5 rounded-md font-body text-sm capitalize cursor-pointer transition-all"
                style={{
                  background: activeTab === tab ? "rgba(186,158,255,0.15)" : "transparent",
                  color: activeTab === tab ? "#ba9eff" : "rgba(222,229,255,0.4)",
                }}>
                {tab === "seo" ? "SEO" : "Content"}
              </button>
            ))}
          </div>

          {activeTab === "content" ? (
            <div className="space-y-4">
              {/* Excerpt / Summary */}
              <Panel title="Excerpt">
                <textarea
                  value={form.summary}
                  onChange={(e) => set("summary", e.target.value)}
                  placeholder="Short description shown in post listings…"
                  rows={3}
                  className={inputCls + " resize-none"}
                  style={inputStyle}
                />
              </Panel>

              {/* WYSIWYG */}
              <Panel title="Content">
                <RichEditor content={form.content} onChange={(html) => set("content", html)} />
              </Panel>
            </div>
          ) : (
            /* SEO Panel */
            <Panel title="Search Engine Optimization">
              <div className="space-y-4">
                {/* Preview */}
                <div className="rounded-lg p-4" style={{ background: "rgba(6,14,32,0.7)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <p className="font-body text-xs mb-2" style={{ color: "rgba(222,229,255,0.3)" }}>Google Preview</p>
                  <p className="text-blue-400 text-base font-medium truncate">{form.seo.metaTitle || form.title || "Post Title"}</p>
                  <p className="font-body text-xs text-green-600 truncate">https://yourdomain.com/blog/{form.slug || "post-slug"}</p>
                  <p className="font-body text-sm mt-1 line-clamp-2" style={{ color: "rgba(222,229,255,0.5)" }}>
                    {form.seo.metaDescription || form.summary || "Post description will appear here…"}
                  </p>
                </div>

                <div>
                  <Label>Meta Title <span style={{ color: "rgba(186,158,255,0.6)" }}>({(form.seo.metaTitle || form.title).length}/60)</span></Label>
                  <input value={form.seo.metaTitle} onChange={(e) => setSeo("metaTitle", e.target.value)}
                    placeholder={form.title || "SEO title…"} className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <Label>Meta Description <span style={{ color: "rgba(186,158,255,0.6)" }}>({(form.seo.metaDescription || form.summary).length}/160)</span></Label>
                  <textarea value={form.seo.metaDescription} onChange={(e) => setSeo("metaDescription", e.target.value)}
                    placeholder={form.summary || "SEO description…"} rows={3}
                    className={inputCls + " resize-none"} style={inputStyle} />
                </div>
                <div>
                  <Label>Focus Keywords (comma-separated)</Label>
                  <input value={form.seo.keywords} onChange={(e) => setSeo("keywords", e.target.value)}
                    placeholder="anime, shonen, action" className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <Label>OG Image URL (overrides featured image)</Label>
                  <input value={form.seo.ogImageUrl} onChange={(e) => setSeo("ogImageUrl", e.target.value)}
                    placeholder={form.featuredImage || "https://…"} className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <Label>Canonical URL</Label>
                  <input value={form.seo.canonicalUrl} onChange={(e) => setSeo("canonicalUrl", e.target.value)}
                    placeholder="Leave blank to use default URL" className={inputCls} style={inputStyle} />
                </div>
              </div>
            </Panel>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className="w-72 shrink-0 space-y-4">
          {/* AI Generate */}
          <Panel title="✨ AI Generate">
            <div className="space-y-3">
              <div>
                <Label>Topic or Anime Title</Label>
                <input
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAiGenerate()}
                  placeholder="e.g. Attack on Titan season 4…"
                  className={inputCls}
                  style={inputStyle}
                />
              </div>
              {aiError && <p className="font-body text-xs text-red-400">{aiError}</p>}
              <button
                type="button"
                onClick={handleAiGenerate}
                disabled={aiLoading || !aiTopic.trim()}
                className="w-full py-2.5 rounded-lg font-headline text-sm font-semibold cursor-pointer disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                style={{
                  background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                  boxShadow: "0 0 16px rgba(124,58,237,0.3)",
                  color: "white",
                }}
              >
                {aiLoading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" />
                    </svg>
                    Generating…
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Generate Post
                  </>
                )}
              </button>
              <p className="font-body text-[10px] text-white/25 text-center">
                Uses API key from{" "}
                <a href="/admin/settings" className="text-violet-400 hover:underline">AI Settings</a>
              </p>
            </div>
          </Panel>
          {/* Publish status */}
          <Panel title="Status">
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => set("published", !form.published)}
                className="relative w-10 h-5 rounded-full cursor-pointer transition-colors duration-200 shrink-0"
                style={{ background: form.published ? "rgba(186,158,255,0.5)" : "rgba(255,255,255,0.1)" }}
              >
                <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform duration-200 bg-white"
                  style={{ transform: form.published ? "translateX(20px)" : "translateX(0)" }} />
              </div>
              <span className="font-body text-sm" style={{ color: form.published ? "#ba9eff" : "rgba(222,229,255,0.5)" }}>
                {form.published ? "Published" : "Draft"}
              </span>
            </label>
          </Panel>

          {/* Featured image */}
          <FeaturedImagePanel
            url={form.featuredImage}
            alt={form.featuredImageAlt}
            onUrl={(u) => set("featuredImage", u)}
            onAlt={(a) => set("featuredImageAlt", a)}
          />

          {/* Categories */}
          <Panel title="Categories">
            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
              {categories.length === 0 && (
                <p className="font-body text-xs" style={{ color: "rgba(222,229,255,0.3)" }}>No categories yet</p>
              )}
              {categories.map((c) => (
                <label key={c.id} className="flex items-center gap-2.5 cursor-pointer group">
                  <div
                    onClick={() => set("categoryIds", toggleId(form.categoryIds, c.id))}
                    className="w-4 h-4 rounded flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                    style={{
                      background: form.categoryIds.includes(c.id) ? "rgba(186,158,255,0.3)" : "rgba(255,255,255,0.06)",
                      border: `1px solid ${form.categoryIds.includes(c.id) ? "rgba(186,158,255,0.5)" : "rgba(255,255,255,0.1)"}`,
                    }}
                  >
                    {form.categoryIds.includes(c.id) && (
                      <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
                        <path d="M2 6l3 3 5-5" stroke="#ba9eff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className="font-body text-sm text-text-main/70 group-hover:text-text-main transition-colors">{c.name}</span>
                </label>
              ))}
            </div>
            <QuickCreate placeholder="New category name…" onCreate={quickCreateCategory} />
          </Panel>

          {/* Tags */}
          <Panel title="Tags">
            <div className="flex flex-wrap gap-1.5 min-h-8">
              {tags.map((t) => {
                const sel = form.tagIds.includes(t.id);
                return (
                  <button key={t.id} type="button"
                    onClick={() => set("tagIds", toggleId(form.tagIds, t.id))}
                    className="px-2.5 py-1 rounded-full font-body text-xs cursor-pointer transition-all"
                    style={{
                      background: sel ? "rgba(186,158,255,0.2)" : "rgba(255,255,255,0.05)",
                      color: sel ? "#ba9eff" : "rgba(222,229,255,0.45)",
                      border: `1px solid ${sel ? "rgba(186,158,255,0.3)" : "rgba(255,255,255,0.07)"}`,
                    }}>
                    {sel ? "✓ " : ""}{t.name}
                  </button>
                );
              })}
              {tags.length === 0 && <p className="font-body text-xs" style={{ color: "rgba(222,229,255,0.3)" }}>No tags yet</p>}
            </div>
            <QuickCreate placeholder="New tag name…" onCreate={quickCreateTag} />
          </Panel>
        </div>
      </div>
    </div>
  );
}
