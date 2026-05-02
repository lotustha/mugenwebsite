"use client";

import { useState, useEffect } from "react";

interface Tag { id: string; name: string; slug: string; _count?: { posts: number }; }

export default function TagsPage() {
  const [items, setItems] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/tags").then((r) => r.json()).then((d) => setItems(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
  }, []);

  const create = async () => {
    if (!newName.trim()) return;
    setError(""); setCreating(true);
    const res = await fetch("/api/admin/tags", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newName.trim() }) });
    const data = await res.json();
    if (res.ok) { setItems((p) => [...p, data].sort((a, b) => a.name.localeCompare(b.name))); setNewName(""); }
    else setError(data.error ?? "Failed");
    setCreating(false);
  };

  const save = async (id: string) => {
    if (!editName.trim()) return;
    const res = await fetch(`/api/admin/tags/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: editName.trim() }) });
    const data = await res.json();
    if (res.ok) { setItems((p) => p.map((x) => x.id === id ? data : x)); setEditId(null); }
    else setError(data.error ?? "Failed");
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this tag?")) return;
    const res = await fetch(`/api/admin/tags/${id}`, { method: "DELETE" });
    if (res.ok) setItems((p) => p.filter((x) => x.id !== id));
  };

  const inputCls = "w-full px-3.5 py-2.5 rounded-lg font-body text-sm text-text-main placeholder:text-text-main/25 focus:outline-none transition-all focus:ring-1 focus:ring-primary/40";
  const inputStyle = { background: "rgba(6,14,32,0.7)", border: "1px solid rgba(255,255,255,0.07)" };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="font-headline text-2xl font-bold text-text-main">Tags</h1>
        <p className="font-body text-sm mt-0.5" style={{ color: "rgba(222,229,255,0.4)" }}>{items.length} tags</p>
      </div>

      {/* Create */}
      <div className="rounded-xl p-5 mb-6" style={{ background: "rgba(9,19,40,0.5)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <p className="font-headline text-sm font-semibold text-text-main mb-3">Add New Tag</p>
        {error && <p className="font-body text-red-400 text-xs mb-2">{error}</p>}
        <div className="flex gap-2">
          <input value={newName} onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
            placeholder="Tag name…" className={inputCls} style={inputStyle} />
          <button type="button" onClick={create} disabled={creating || !newName.trim()}
            className="px-5 py-2.5 rounded-lg font-headline text-sm font-semibold cursor-pointer disabled:opacity-50 shrink-0 transition-all"
            style={{ background: "linear-gradient(135deg,#ba9eff,#8455ef)", color: "#0f0820" }}>
            {creating ? "Adding…" : "Add"}
          </button>
        </div>
      </div>

      {/* Tags as pill grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(186,158,255,0.2)", borderTopColor: "#ba9eff" }} />
        </div>
      ) : items.length === 0 ? (
        <p className="font-body text-text-main/40 text-center py-12">No tags yet.</p>
      ) : (
        <div className="space-y-2">
          {items.map((tag) => (
            <div key={tag.id} className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: "rgba(9,19,40,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}>
              {editId === tag.id ? (
                <>
                  <input value={editName} onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") save(tag.id); if (e.key === "Escape") setEditId(null); }}
                    autoFocus className={inputCls + " flex-1"} style={inputStyle} />
                  <button type="button" onClick={() => save(tag.id)}
                    className="px-3 py-1.5 rounded-lg font-headline text-xs font-semibold cursor-pointer shrink-0"
                    style={{ background: "rgba(186,158,255,0.15)", color: "#ba9eff" }}>Save</button>
                  <button type="button" onClick={() => setEditId(null)}
                    className="px-3 py-1.5 rounded-lg font-body text-xs cursor-pointer shrink-0"
                    style={{ color: "rgba(222,229,255,0.4)" }}>Cancel</button>
                </>
              ) : (
                <>
                  <span className="px-2.5 py-1 rounded-full font-body text-xs shrink-0"
                    style={{ background: "rgba(186,158,255,0.1)", color: "rgba(186,158,255,0.8)", border: "1px solid rgba(186,158,255,0.15)" }}>
                    #{tag.name}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-xs" style={{ color: "rgba(222,229,255,0.3)" }}>
                      /{tag.slug} · {tag._count?.posts ?? 0} posts
                    </p>
                  </div>
                  <button type="button" onClick={() => { setEditId(tag.id); setEditName(tag.name); }}
                    className="p-2 rounded-lg cursor-pointer transition-colors"
                    style={{ color: "rgba(222,229,255,0.4)" }} title="Edit">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button type="button" onClick={() => remove(tag.id)}
                    className="p-2 rounded-lg cursor-pointer transition-colors hover:bg-red-500/10"
                    style={{ color: "rgba(222,229,255,0.4)" }} title="Delete">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
