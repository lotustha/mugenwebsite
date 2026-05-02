"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Post {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  createdAt: string;
  categories: { id: string; name: string }[];
  tags: { id: string; name: string }[];
}

export default function AdminPostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");

  useEffect(() => {
    fetch("/api/admin/posts")
      .then((r) => r.json())
      .then((data) => setPosts(Array.isArray(data) ? data : []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  const togglePublish = async (post: Post) => {
    const res = await fetch(`/api/admin/posts/${post.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !post.published }),
    });
    if (res.ok) setPosts((p) => p.map((x) => x.id === post.id ? { ...x, published: !x.published } : x));
  };

  const deletePost = async (id: string) => {
    if (!confirm("Delete this post? This cannot be undone.")) return;
    const res = await fetch(`/api/admin/posts/${id}`, { method: "DELETE" });
    if (res.ok) setPosts((p) => p.filter((x) => x.id !== id));
  };

  const filtered = posts.filter((p) => {
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) || p.slug.includes(search.toLowerCase());
    const matchFilter = filter === "all" || (filter === "published" ? p.published : !p.published);
    return matchSearch && matchFilter;
  });

  const pill = "px-3 py-1.5 rounded-lg font-body text-xs cursor-pointer transition-all";

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-headline text-2xl font-bold text-text-main">Posts</h1>
          <p className="font-body text-sm mt-0.5" style={{ color: "rgba(222,229,255,0.4)" }}>
            {posts.length} total · {posts.filter((p) => p.published).length} published
          </p>
        </div>
        <Link
          href="/admin/posts/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-headline text-sm font-semibold cursor-pointer transition-all"
          style={{ background: "linear-gradient(135deg,#ba9eff,#8455ef)", color: "#0f0820" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Post
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: "rgba(6,14,32,0.6)" }}>
          {(["all", "published", "draft"] as const).map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)}
              className={pill}
              style={{
                background: filter === f ? "rgba(186,158,255,0.15)" : "transparent",
                color: filter === f ? "#ba9eff" : "rgba(222,229,255,0.4)",
              }}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "rgba(222,229,255,0.3)" }}>
            <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
          </svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search posts…"
            className="w-full pl-9 pr-4 py-2 rounded-lg font-body text-sm text-text-main placeholder:text-text-main/25 focus:outline-none transition-all"
            style={{ background: "rgba(9,19,40,0.6)", border: "1px solid rgba(255,255,255,0.07)" }} />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(186,158,255,0.2)", borderTopColor: "#ba9eff" }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="font-body text-text-main/40">
            {search ? "No posts match your search." : "No posts yet. Create your first post!"}
          </p>
          {!search && (
            <Link href="/admin/posts/new" className="inline-block mt-4 px-5 py-2 rounded-lg font-headline text-sm font-semibold cursor-pointer transition-all"
              style={{ background: "rgba(186,158,255,0.12)", color: "#ba9eff", border: "1px solid rgba(186,158,255,0.2)" }}>
              Create Post
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((post) => (
            <div key={post.id}
              className="flex items-center gap-4 px-5 py-4 rounded-xl transition-all"
              style={{ background: "rgba(9,19,40,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}>
              {/* Status dot */}
              <div className="w-2 h-2 rounded-full shrink-0"
                style={{ background: post.published ? "rgba(134,239,172,0.8)" : "rgba(255,255,255,0.15)" }} />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="font-body text-text-main font-medium truncate">{post.title}</p>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  <span className="font-body text-text-main/35 text-xs truncate">/{post.slug}</span>
                  {post.categories.length > 0 && (
                    <div className="flex gap-1">
                      {post.categories.slice(0, 2).map((c) => (
                        <span key={c.id} className="px-1.5 py-0.5 rounded text-[10px] font-body"
                          style={{ background: "rgba(97,194,255,0.1)", color: "rgba(97,194,255,0.7)" }}>
                          {c.name}
                        </span>
                      ))}
                    </div>
                  )}
                  <span className="font-body text-text-main/25 text-xs">
                    {new Date(post.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
              </div>

              {/* Badge */}
              <span className="px-2.5 py-1 rounded-full font-body text-xs shrink-0"
                style={{
                  background: post.published ? "rgba(134,239,172,0.1)" : "rgba(255,255,255,0.05)",
                  color: post.published ? "rgba(134,239,172,0.9)" : "rgba(222,229,255,0.3)",
                  border: `1px solid ${post.published ? "rgba(134,239,172,0.2)" : "rgba(255,255,255,0.07)"}`,
                }}>
                {post.published ? "Published" : "Draft"}
              </span>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <Link href={`/admin/posts/${post.id}/edit`}
                  className="p-2 rounded-lg cursor-pointer transition-colors"
                  style={{ color: "rgba(222,229,255,0.4)" }}
                  title="Edit">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </Link>
                <button type="button" onClick={() => togglePublish(post)}
                  className="p-2 rounded-lg cursor-pointer transition-colors"
                  style={{ color: "rgba(222,229,255,0.4)" }}
                  title={post.published ? "Unpublish" : "Publish"}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
                    {post.published
                      ? <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      : <><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
                    }
                  </svg>
                </button>
                <button type="button" onClick={() => deletePost(post.id)}
                  className="p-2 rounded-lg cursor-pointer transition-colors hover:bg-red-500/10"
                  style={{ color: "rgba(222,229,255,0.4)" }}
                  title="Delete">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
