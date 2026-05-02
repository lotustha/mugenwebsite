"use client";

import { useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Category { id: string; name: string; slug: string; count: number; }

// ─── Design tokens ────────────────────────────────────────────────────────────

const surf     = "rgba(9,19,40,0.55)";
const surfDeep = "rgba(6,14,32,0.75)";
const bdr      = "rgba(255,255,255,0.07)";
const purple   = "#8B5CF6";
const textMuted = "rgba(222,229,255,0.4)";
const textDim   = "rgba(222,229,255,0.22)";

const inputCls = "w-full px-3.5 py-2.5 rounded-lg font-body text-sm text-text-main placeholder:text-text-main/25 focus:outline-none transition-all duration-200 focus:ring-1 focus:ring-primary/40";
const inputSt  = { background: surfDeep, border: `1px solid ${bdr}` };

// ─── Delete Reassign Modal ────────────────────────────────────────────────────

function DeleteModal({
  category, others, onConfirm, onCancel, deleting,
}: {
  category: Category;
  others: Category[];
  onConfirm: (reassignTo: string | null) => void;
  onCancel: () => void;
  deleting: boolean;
}) {
  const [reassignTo, setReassignTo] = useState<string>("__none__");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(6,14,32,0.85)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-md rounded-2xl p-6 space-y-5" style={{ background: "rgba(9,19,40,0.98)", border: `1px solid rgba(239,68,68,0.25)` }}>
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-none" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)" }}>
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" style={{ color: "#f87171" }}>
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h2 className="font-headline text-base font-bold text-text-main">Delete "{category.name}"</h2>
            <p className="font-body text-sm mt-0.5" style={{ color: textMuted }}>
              {category.count > 0
                ? `This category has ${category.count} wallpaper${category.count !== 1 ? "s" : ""}. Choose what to do with them.`
                : "This category has no wallpapers. It will be permanently deleted."}
            </p>
          </div>
        </div>

        {/* Reassign picker */}
        {category.count > 0 && (
          <div className="space-y-2">
            <label className="font-body text-xs uppercase tracking-widest font-semibold" style={{ color: textMuted }}>
              Move {category.count} wallpaper{category.count !== 1 ? "s" : ""} to
            </label>
            <select value={reassignTo} onChange={e => setReassignTo(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg font-body text-sm cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
              style={{ background: surfDeep, border: `1px solid ${bdr}`, color: reassignTo === "__none__" ? textMuted : "rgba(222,229,255,0.85)" }}>
              <option value="__none__">Leave uncategorized</option>
              {others.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.count} wallpapers)</option>
              ))}
            </select>
            {reassignTo !== "__none__" && (
              <p className="font-body text-xs" style={{ color: "rgba(74,222,128,0.7)" }}>
                {category.count} wallpaper{category.count !== 1 ? "s" : ""} will be moved to "{others.find(c => c.id === reassignTo)?.name}"
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button type="button" onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl font-body text-sm cursor-pointer transition-all hover:bg-white/5"
            style={{ color: textMuted, border: `1px solid ${bdr}` }}>
            Cancel
          </button>
          <button type="button"
            onClick={() => onConfirm(reassignTo === "__none__" ? null : reassignTo)}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-xl font-headline text-sm font-semibold cursor-pointer transition-all disabled:opacity-50 hover:brightness-110"
            style={{ background: "rgba(239,68,68,0.18)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }}>
            {deleting ? "Deleting…" : "Delete Category"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Category Row ─────────────────────────────────────────────────────────────

function CategoryRow({ cat, others, onUpdated, onDeleted }: {
  cat: Category;
  others: Category[];
  onUpdated: (updated: Category) => void;
  onDeleted: (id: string) => void;
}) {
  const [editing, setEditing]     = useState(false);
  const [editName, setEditName]   = useState(cat.name);
  const [saving, setSaving]       = useState(false);
  const [editError, setEditError] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = () => { setEditName(cat.name); setEditError(""); setEditing(true); setTimeout(() => inputRef.current?.focus(), 50); };
  const cancelEdit = () => { setEditing(false); setEditError(""); };

  const saveEdit = async () => {
    if (!editName.trim() || editName.trim() === cat.name) { cancelEdit(); return; }
    setSaving(true); setEditError("");
    const res = await fetch("/api/admin/wallpaper-categories", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: cat.id, name: editName.trim() }),
    });
    if (res.ok) { onUpdated(await res.json()); setEditing(false); }
    else { const d = await res.json().catch(() => ({})); setEditError(d.error ?? "Failed"); }
    setSaving(false);
  };

  const confirmDelete = async (reassignTo: string | null) => {
    setDeleting(true);
    const qs = `?id=${cat.id}${reassignTo ? `&reassignTo=${reassignTo}` : ""}`;
    const res = await fetch(`/api/admin/wallpaper-categories${qs}`, { method: "DELETE" });
    if (res.ok) { onDeleted(cat.id); setShowDelete(false); }
    setDeleting(false);
  };

  return (
    <>
      <div className="group flex items-center gap-4 px-5 py-4 border-b transition-colors hover:bg-white/[0.02]"
        style={{ borderColor: "rgba(255,255,255,0.05)" }}>

        {/* Name / edit field */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex items-center gap-2">
              <input ref={inputRef} value={editName} onChange={e => setEditName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                className={`${inputCls} py-1.5 text-sm`} style={inputSt} />
              {editError && <span className="font-body text-xs text-red-400 flex-none">{editError}</span>}
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <span className="font-body text-sm font-medium text-text-main truncate">{cat.name}</span>
              <span className="font-mono text-[0.625rem]" style={{ color: textDim }}>{cat.slug}</span>
            </div>
          )}
        </div>

        {/* Count badge */}
        <div className="flex-none px-2.5 py-1 rounded-full font-mono text-xs tabular-nums"
          style={{ background: cat.count > 0 ? "rgba(139,92,246,0.12)" : "rgba(255,255,255,0.04)", color: cat.count > 0 ? "#ba9eff" : textDim }}>
          {cat.count} wallpaper{cat.count !== 1 ? "s" : ""}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-none">
          {editing ? (
            <>
              <button type="button" onClick={saveEdit} disabled={saving}
                className="px-3 py-1.5 rounded-lg font-body text-xs font-medium cursor-pointer disabled:opacity-50 transition-all hover:brightness-110"
                style={{ background: "rgba(139,92,246,0.18)", color: "#ba9eff", border: "1px solid rgba(139,92,246,0.3)" }}>
                {saving ? "…" : "Save"}
              </button>
              <button type="button" onClick={cancelEdit}
                className="px-3 py-1.5 rounded-lg font-body text-xs cursor-pointer transition-all hover:bg-white/5"
                style={{ color: textMuted, border: `1px solid ${bdr}` }}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={startEdit} aria-label="Edit"
                className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-all hover:bg-primary/10"
                style={{ color: "rgba(186,158,255,0.7)" }}>
                <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                  <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.261-4.263a1.75 1.75 0 0 0 0-2.474ZM4.75 14.25h6.5a.75.75 0 0 0 0-1.5h-6.5a.75.75 0 0 0 0 1.5Z" />
                </svg>
              </button>
              <button type="button" onClick={() => setShowDelete(true)} aria-label="Delete"
                className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/10"
                style={{ color: "rgba(248,113,113,0.6)" }}>
                <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                  <path d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5Zm-1.56 8.05a.75.75 0 0 0 1.49-.2L6.89 7.5a.75.75 0 0 0-1.49.2l.29 3.6ZM10 7.25a.75.75 0 0 0-1.5 0v3.6a.75.75 0 0 0 1.5 0v-3.6Z" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      {showDelete && (
        <DeleteModal
          category={cat}
          others={others}
          onConfirm={confirmDelete}
          onCancel={() => setShowDelete(false)}
          deleting={deleting}
        />
      )}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WallpaperCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading]       = useState(true);
  const [newName, setNewName]       = useState("");
  const [creating, setCreating]     = useState(false);
  const [createError, setCreateError] = useState("");
  const [search, setSearch]         = useState("");

  useEffect(() => {
    fetch("/api/admin/wallpaper-categories")
      .then(r => r.json())
      .then(data => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const createCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || creating) return;
    setCreating(true); setCreateError("");
    const res = await fetch("/api/admin/wallpaper-categories", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (res.ok) {
      const cat = await res.json();
      setCategories(p => [...p, { ...cat, count: 0 }].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName("");
    } else {
      const d = await res.json().catch(() => ({}));
      setCreateError(d.error ?? "Failed");
    }
    setCreating(false);
  };

  const updateCategory = (updated: Category) =>
    setCategories(p => p.map(c => c.id === updated.id ? { ...c, ...updated } : c)
      .sort((a, b) => a.name.localeCompare(b.name)));

  const deleteCategory = (id: string) =>
    setCategories(p => p.filter(c => c.id !== id));

  const filtered = categories.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.slug.includes(search.toLowerCase())
  );

  const totalWallpapers = categories.reduce((s, c) => s + c.count, 0);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <h1 className="font-headline text-3xl font-bold text-text-main tracking-tight">Wallpaper Categories</h1>
          <p className="font-body text-sm mt-1" style={{ color: textMuted }}>
            {loading ? "Loading…" : `${categories.length} categories · ${totalWallpapers} wallpapers total`}
          </p>
        </div>
      </div>

      {/* Create new */}
      <div className="rounded-2xl p-5" style={{ background: surf, border: `1px solid ${bdr}` }}>
        <p className="font-body text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: textMuted }}>New Category</p>
        <form onSubmit={createCategory} className="flex gap-3">
          <div className="flex-1">
            <input
              value={newName} onChange={e => { setNewName(e.target.value); setCreateError(""); }}
              placeholder="Category name…"
              className={inputCls} style={inputSt}
            />
            {createError && <p className="font-body text-xs mt-1.5" style={{ color: "#f87171" }}>{createError}</p>}
          </div>
          <button type="submit" disabled={creating || !newName.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-headline text-sm font-semibold cursor-pointer disabled:opacity-40 transition-all hover:brightness-110"
            style={{ background: `linear-gradient(135deg,#8B5CF6,#D946EF)`, color: "white", flexShrink: 0 }}>
            {creating
              ? <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              : <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2Z" /></svg>
            }
            Create
          </button>
        </form>
      </div>

      {/* List */}
      <div className="rounded-2xl overflow-hidden" style={{ background: surf, border: `1px solid ${bdr}` }}>
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b" style={{ borderColor: "rgba(255,255,255,0.05)", background: "rgba(6,14,32,0.4)" }}>
          <div className="relative flex-1 max-w-xs">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: textDim }}>
              <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Filter categories…"
              className="w-full pl-8 pr-3 py-1.5 rounded-lg font-body text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
              style={{ background: surfDeep, border: `1px solid ${bdr}`, color: "rgba(222,229,255,0.8)" }} />
          </div>
          <span className="font-mono text-xs tabular-nums ml-auto" style={{ color: textDim }}>
            {filtered.length} / {categories.length}
          </span>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-2.5 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
          <span className="font-body text-[0.625rem] uppercase tracking-widest font-semibold" style={{ color: textDim }}>Name / Slug</span>
          <span className="font-body text-[0.625rem] uppercase tracking-widest font-semibold" style={{ color: textDim }}>Count</span>
          <span className="font-body text-[0.625rem] uppercase tracking-widest font-semibold" style={{ color: textDim }}>Actions</span>
        </div>

        {loading ? (
          <div className="space-y-0">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 border-b animate-pulse" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                <div className="flex-1 h-4 bg-surface rounded" />
                <div className="w-20 h-5 bg-surface rounded-full" />
                <div className="w-16 h-6 bg-surface rounded-lg" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" className="w-10 h-10" style={{ color: textDim }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
            </svg>
            <p className="font-body text-sm" style={{ color: textMuted }}>
              {categories.length === 0 ? "No categories yet — create one above" : "No categories match your search"}
            </p>
          </div>
        ) : (
          filtered.map(cat => (
            <CategoryRow
              key={cat.id}
              cat={cat}
              others={categories.filter(c => c.id !== cat.id)}
              onUpdated={updateCategory}
              onDeleted={deleteCategory}
            />
          ))
        )}
      </div>
    </div>
  );
}
