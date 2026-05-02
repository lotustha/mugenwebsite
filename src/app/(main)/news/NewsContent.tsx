"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { setPreview } from "@/lib/preview-store";

const LIMIT = 9;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden animate-pulse" style={{ background: "rgba(9,19,40,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="aspect-video bg-surface" />
      <div className="p-5 space-y-2.5">
        <div className="h-3 bg-surface rounded w-1/4" />
        <div className="h-4 bg-surface rounded w-3/4" />
        <div className="h-3 bg-surface rounded w-full" />
        <div className="h-3 bg-surface rounded w-2/3" />
      </div>
    </div>
  );
}

function FeaturedSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden animate-pulse mb-10"
      style={{ background: "rgba(9,19,40,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="grid md:grid-cols-2">
        <div className="aspect-video md:aspect-auto md:min-h-[320px] bg-surface" />
        <div className="p-8 space-y-4">
          <div className="h-3 bg-surface rounded w-1/4" />
          <div className="h-7 bg-surface rounded w-5/6" />
          <div className="h-7 bg-surface rounded w-3/4" />
          <div className="space-y-2 mt-2">
            <div className="h-3 bg-surface rounded w-full" />
            <div className="h-3 bg-surface rounded w-5/6" />
            <div className="h-3 bg-surface rounded w-2/3" />
          </div>
          <div className="h-9 bg-surface rounded-lg w-32 mt-4" />
        </div>
      </div>
    </div>
  );
}

// ─── Featured Post Card ───────────────────────────────────────────────────────

function FeaturedPost({ post }: { post: any }) {
  const href = `/news/${post.slug}?t=${encodeURIComponent(post.title)}`;
  return (
    <Link href={href} onClick={() => setPreview(`post:${post.slug}`, post)}
      className="block rounded-2xl overflow-hidden group cursor-pointer mb-10 transition-all duration-300 hover:shadow-[0_0_40px_rgba(139,92,246,0.12)]"
      style={{ background: "rgba(9,19,40,0.6)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="grid md:grid-cols-2">
        <div className="relative aspect-video md:aspect-auto md:min-h-[320px] overflow-hidden">
          {post.featuredImage ? (
            <Image src={post.featuredImage} alt={post.title} fill sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="absolute inset-0" style={{ background: "linear-gradient(135deg,#1a0533,#060e20)" }}>
              <div className="absolute inset-0 flex items-center justify-center opacity-10">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-24 h-24 text-primary">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
                </svg>
              </div>
            </div>
          )}
          <div className="absolute top-4 left-4">
            <span className="px-3 py-1 rounded-full font-body text-[0.6875rem] font-bold uppercase tracking-widest"
              style={{ background: "linear-gradient(135deg,#8B5CF6,#D946EF)", color: "white" }}>
              Featured
            </span>
          </div>
        </div>
        <div className="p-7 md:p-9 flex flex-col justify-center">
          <time className="font-body text-xs mb-3 block" style={{ color: "rgba(222,229,255,0.4)" }}>
            {formatDate(post.createdAt)}
          </time>
          <h2 className="font-headline text-2xl md:text-3xl font-bold text-text-main leading-tight mb-4
            group-hover:text-primary transition-colors duration-200">
            {post.title}
          </h2>
          {post.summary && (
            <p className="font-body text-sm leading-relaxed mb-6 line-clamp-3"
              style={{ color: "rgba(222,229,255,0.6)" }}>
              {post.summary}
            </p>
          )}
          <span className="inline-flex items-center gap-2 font-body text-sm font-semibold transition-colors duration-200"
            style={{ color: "rgba(186,158,255,0.9)" }}>
            Read article
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200">
              <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── Post Card ────────────────────────────────────────────────────────────────

function PostCard({ post }: { post: any }) {
  const href = `/news/${post.slug}?t=${encodeURIComponent(post.title)}`;
  return (
    <Link href={href} onClick={() => setPreview(`post:${post.slug}`, post)}
      className="group flex flex-col rounded-xl overflow-hidden cursor-pointer transition-all duration-200
        hover:shadow-[0_0_24px_rgba(139,92,246,0.1)] hover:-translate-y-0.5"
      style={{ background: "rgba(9,19,40,0.5)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="relative aspect-video overflow-hidden flex-none"
        style={{ background: "linear-gradient(135deg,#1a0533,#060e20)" }}>
        {post.featuredImage && (
          <Image src={post.featuredImage} alt={post.title} fill sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300" />
        )}
      </div>
      <div className="p-5 flex flex-col flex-1">
        <time className="font-body text-[0.6875rem] mb-2 block" style={{ color: "rgba(222,229,255,0.35)" }}>
          {formatDate(post.createdAt)}
        </time>
        <h3 className="font-headline text-[0.9375rem] font-semibold text-text-main leading-snug mb-2 line-clamp-2
          group-hover:text-primary transition-colors duration-200">
          {post.title}
        </h3>
        {post.summary && (
          <p className="font-body text-xs leading-relaxed line-clamp-2 mt-auto pt-2"
            style={{ color: "rgba(222,229,255,0.45)" }}>
            {post.summary}
          </p>
        )}
      </div>
    </Link>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  if (pages <= 1) return null;

  const getPages = () => {
    const arr: (number | "…")[] = [];
    if (pages <= 7) {
      for (let i = 1; i <= pages; i++) arr.push(i);
    } else {
      arr.push(1);
      if (page > 3) arr.push("…");
      for (let i = Math.max(2, page - 1); i <= Math.min(pages - 1, page + 1); i++) arr.push(i);
      if (page < pages - 2) arr.push("…");
      arr.push(pages);
    }
    return arr;
  };

  const btnBase = "min-w-[36px] h-9 px-2 rounded-lg font-body text-sm transition-all duration-200 cursor-pointer flex items-center justify-center";
  const active = "font-semibold" ;
  const inactive = "hover:bg-white/5";
  const activeStyle = { background: "rgba(139,92,246,0.2)", color: "#ba9eff", border: "1px solid rgba(139,92,246,0.35)" };
  const inactiveStyle = { color: "rgba(222,229,255,0.5)", border: "1px solid transparent" };

  return (
    <div className="flex items-center justify-center gap-1.5 mt-10 pt-8 border-t"
      style={{ borderColor: "rgba(255,255,255,0.06)" }}>
      <button onClick={() => onChange(page - 1)} disabled={page === 1}
        className={`${btnBase} disabled:opacity-30 disabled:cursor-not-allowed`}
        style={inactiveStyle}>
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
        </svg>
      </button>

      {getPages().map((p, i) =>
        p === "…" ? (
          <span key={`ellipsis-${i}`} className="px-1 font-body text-sm" style={{ color: "rgba(222,229,255,0.25)" }}>…</span>
        ) : (
          <button key={p} onClick={() => onChange(p as number)}
            className={`${btnBase} ${p === page ? active : inactive}`}
            style={p === page ? activeStyle : inactiveStyle}>
            {p}
          </button>
        )
      )}

      <button onClick={() => onChange(page + 1)} disabled={page === pages}
        className={`${btnBase} disabled:opacity-30 disabled:cursor-not-allowed`}
        style={inactiveStyle}>
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
}

// ─── Sidebar Widgets ──────────────────────────────────────────────────────────

function SidebarWidget({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "rgba(9,19,40,0.6)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="px-5 py-3.5 border-b flex items-center gap-2.5" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="w-1 h-4 rounded-full flex-none" style={{ background: "linear-gradient(180deg,#ba9eff,#8455ef)" }} />
        <h3 className="font-headline text-sm font-semibold uppercase tracking-widest" style={{ color: "rgba(186,158,255,0.85)" }}>
          {title}
        </h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function CategoriesWidget({ categories, active, onSelect }: { categories: any[]; active: string | null; onSelect: (s: string | null) => void }) {
  const cats = [{ id: "all", name: "All Posts", slug: null }, ...categories];
  return (
    <SidebarWidget title="Categories">
      <div className="space-y-0.5">
        {cats.length === 1
          ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-8 bg-surface rounded animate-pulse mb-1" />)
          : cats.map((c) => {
              const isActive = c.slug === active;
              return (
                <button key={c.id} onClick={() => onSelect(c.slug)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 text-left"
                  style={{
                    background: isActive ? "rgba(139,92,246,0.15)" : "transparent",
                    border: `1px solid ${isActive ? "rgba(139,92,246,0.3)" : "transparent"}`,
                  }}>
                  <span className="font-body text-sm transition-colors duration-200"
                    style={{ color: isActive ? "#ba9eff" : "rgba(222,229,255,0.6)" }}>
                    {c.name}
                  </span>
                  {isActive && (
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 flex-none" style={{ color: "#ba9eff" }}>
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              );
            })}
      </div>
    </SidebarWidget>
  );
}

function PopularWidget({ posts }: { posts: any[] }) {
  return (
    <SidebarWidget title="Popular Posts">
      <div className="space-y-1">
        {posts.length === 0
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-3 p-2 animate-pulse">
                <div className="w-7 h-4 bg-surface rounded flex-none mt-1" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-surface rounded" />
                  <div className="h-3 bg-surface rounded w-2/3" />
                </div>
              </div>
            ))
          : posts.slice(0, 5).map((p, i) => (
              <Link key={p.id} href={`/news/${p.slug}?t=${encodeURIComponent(p.title)}`}
                onClick={() => setPreview(`post:${p.slug}`, p)}
                className="flex gap-3 p-2 rounded-lg group cursor-pointer transition-all duration-200 hover:bg-white/4">
                <span className="font-headline text-lg font-bold flex-none w-7 text-right leading-tight mt-0.5"
                  style={{ color: "rgba(139,92,246,0.3)" }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-body text-[0.8125rem] leading-snug line-clamp-2 group-hover:text-primary transition-colors duration-200"
                    style={{ color: "rgba(222,229,255,0.7)" }}>
                    {p.title}
                  </p>
                  <p className="font-body text-[0.6875rem] mt-0.5" style={{ color: "rgba(222,229,255,0.3)" }}>
                    {formatDate(p.createdAt)}
                  </p>
                </div>
              </Link>
            ))}
      </div>
    </SidebarWidget>
  );
}

function TagsWidget({ tags, activeTag, onSelect }: { tags: any[]; activeTag: string | null; onSelect: (t: string | null) => void }) {
  return (
    <SidebarWidget title="Tags">
      {tags.length === 0
        ? <div className="flex flex-wrap gap-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-7 w-16 bg-surface rounded-full animate-pulse" />)}</div>
        : (
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => {
              const isActive = t.slug === activeTag;
              return (
                <button key={t.id} onClick={() => onSelect(isActive ? null : t.slug)}
                  className="px-3 py-1.5 rounded-full font-body text-xs cursor-pointer transition-all duration-200"
                  style={{
                    background: isActive ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.04)",
                    color: isActive ? "#ba9eff" : "rgba(222,229,255,0.5)",
                    border: `1px solid ${isActive ? "rgba(139,92,246,0.35)" : "rgba(255,255,255,0.07)"}`,
                  }}>
                  #{t.name}
                </button>
              );
            })}
          </div>
        )}
    </SidebarWidget>
  );
}

function AdWidget() {
  return (
    <div className="h-[250px] rounded-xl flex flex-col items-center justify-center"
      style={{ background: "rgba(255,255,255,0.015)", border: "1px dashed rgba(255,255,255,0.07)" }}>
      <span className="font-body text-[0.625rem] uppercase tracking-[0.2em]" style={{ color: "rgba(255,255,255,0.12)" }}>
        Advertisement · 300×250
      </span>
    </div>
  );
}

function NewsletterWidget() {
  return (
    <div className="rounded-xl p-5 text-center"
      style={{ background: "linear-gradient(135deg,rgba(139,92,246,0.1),rgba(217,70,239,0.07))", border: "1px solid rgba(139,92,246,0.2)" }}>
      <div className="w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center"
        style={{ background: "linear-gradient(135deg,#8B5CF6,#D946EF)" }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
        </svg>
      </div>
      <h4 className="font-headline text-sm font-bold text-text-main mb-1">Stay Updated</h4>
      <p className="font-body text-xs mb-4" style={{ color: "rgba(222,229,255,0.45)" }}>
        Latest anime news straight to your inbox.
      </p>
      <Link href="/support"
        className="block w-full py-2 rounded-lg font-headline text-xs font-semibold transition-opacity duration-200 hover:opacity-90"
        style={{ background: "linear-gradient(135deg,#8B5CF6,#D946EF)", color: "white" }}>
        Subscribe Free
      </Link>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NewsContent() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [posts, setPosts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [popularPosts, setPopularPosts] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search query
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQuery(query); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [query]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [activeCategory, activeTag]);

  // Fetch posts
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (debouncedQuery) params.set("search", debouncedQuery);
    fetch(`/api/posts?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setPosts(Array.isArray(d) ? d : (d.posts ?? []));
        setTotal(d.total ?? (Array.isArray(d) ? d.length : 0));
        setPages(d.pages ?? 1);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [debouncedQuery, page]);

  // Fetch sidebar data once
  useEffect(() => {
    Promise.all([
      fetch("/api/categories").then((r) => r.json()).catch(() => []),
      fetch("/api/posts/popular").then((r) => r.json()).catch(() => []),
      fetch("/api/tags").then((r) => r.json()).catch(() => []),
    ]).then(([cats, popular, tagList]) => {
      setCategories(Array.isArray(cats) ? cats : []);
      setPopularPosts(Array.isArray(popular) ? popular : []);
      setTags(Array.isArray(tagList) ? tagList.slice(0, 24) : []);
    });
  }, []);

  const isFiltered = debouncedQuery.trim().length > 0 || activeCategory || activeTag;
  const featuredPost = (!isFiltered && page === 1 && posts.length > 0) ? posts[0] : null;
  const gridPosts = featuredPost ? posts.slice(1) : posts;

  const handlePageChange = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* ── Page header ── */}
        <div className="mb-10">
          <span className="inline-block font-body text-secondary text-sm font-medium uppercase tracking-wider mb-2">
            Updates
          </span>
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-6">
            <h1 className="font-headline text-4xl font-bold text-text-main tracking-tight">
              Anime News
            </h1>
            {total > 0 && !loading && (
              <span className="font-body text-sm pb-1" style={{ color: "rgba(222,229,255,0.35)" }}>
                {total} article{total !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Search bar */}
          <div className="relative max-w-xl">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" style={{ color: "rgba(222,229,255,0.3)" }}>
                <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search articles…"
              className="w-full pl-11 pr-4 py-3 rounded-xl font-body text-sm text-text-main placeholder:text-text-main/25 focus:outline-none transition-all duration-200"
              style={{
                background: "rgba(9,19,40,0.7)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: query ? "0 0 0 2px rgba(139,92,246,0.25)" : "none",
              }}
            />
            {query && (
              <button onClick={() => setQuery("")}
                className="absolute inset-y-0 right-3 flex items-center cursor-pointer"
                style={{ color: "rgba(222,229,255,0.35)" }}>
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            )}
          </div>

          {/* Active filter chips */}
          {isFiltered && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className="font-body text-xs" style={{ color: "rgba(222,229,255,0.35)" }}>Filtering by:</span>
              {debouncedQuery && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-body text-xs"
                  style={{ background: "rgba(139,92,246,0.15)", color: "#ba9eff", border: "1px solid rgba(139,92,246,0.25)" }}>
                  "{debouncedQuery}"
                  <button onClick={() => setQuery("")} className="cursor-pointer hover:text-white transition-colors">×</button>
                </span>
              )}
              {activeCategory && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-body text-xs"
                  style={{ background: "rgba(139,92,246,0.15)", color: "#ba9eff", border: "1px solid rgba(139,92,246,0.25)" }}>
                  {categories.find(c => c.slug === activeCategory)?.name ?? activeCategory}
                  <button onClick={() => setActiveCategory(null)} className="cursor-pointer hover:text-white transition-colors">×</button>
                </span>
              )}
              {activeTag && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-body text-xs"
                  style={{ background: "rgba(139,92,246,0.15)", color: "#ba9eff", border: "1px solid rgba(139,92,246,0.25)" }}>
                  #{activeTag}
                  <button onClick={() => setActiveTag(null)} className="cursor-pointer hover:text-white transition-colors">×</button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Two-column layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] xl:grid-cols-[1fr_300px] gap-10">

          {/* ── Main content ── */}
          <div className="min-w-0">
            {/* Featured post */}
            {loading && page === 1 && !isFiltered ? (
              <FeaturedSkeleton />
            ) : featuredPost ? (
              <FeaturedPost post={featuredPost} />
            ) : null}

            {/* Section divider when searching */}
            {isFiltered && !loading && (
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg,#8B5CF6,#D946EF)" }} />
                <p className="font-body text-sm" style={{ color: "rgba(222,229,255,0.5)" }}>
                  {total === 0 ? "No results" : `${total} result${total !== 1 ? "s" : ""}`}
                  {debouncedQuery ? ` for "${debouncedQuery}"` : ""}
                </p>
              </div>
            )}

            {/* Grid */}
            {loading ? (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {Array.from({ length: featuredPost ? 8 : LIMIT }).map((_, i) => <CardSkeleton key={i} />)}
              </div>
            ) : gridPosts.length > 0 ? (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {gridPosts.map((p) => <PostCard key={p.id} post={p} />)}
              </div>
            ) : !featuredPost ? (
              <div className="py-20 text-center rounded-xl" style={{ background: "rgba(9,19,40,0.4)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 mx-auto mb-4" style={{ color: "rgba(222,229,255,0.2)" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                <p className="font-headline text-lg font-semibold text-text-main mb-2">No articles found</p>
                <p className="font-body text-sm" style={{ color: "rgba(222,229,255,0.4)" }}>
                  {debouncedQuery ? `Try a different search term` : "Check back soon for new posts"}
                </p>
                {debouncedQuery && (
                  <button onClick={() => setQuery("")} className="mt-4 px-4 py-2 rounded-lg font-body text-sm cursor-pointer transition-colors duration-200"
                    style={{ background: "rgba(139,92,246,0.15)", color: "#ba9eff", border: "1px solid rgba(139,92,246,0.25)" }}>
                    Clear search
                  </button>
                )}
              </div>
            ) : null}

            {/* Pagination */}
            {!loading && (
              <Pagination page={page} pages={pages} onChange={handlePageChange} />
            )}
          </div>

          {/* ── Sidebar ── */}
          <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
            <CategoriesWidget categories={categories} active={activeCategory} onSelect={setActiveCategory} />
            <PopularWidget posts={popularPosts} />
            <AdWidget />
            <TagsWidget tags={tags} activeTag={activeTag} onSelect={setActiveTag} />
            <NewsletterWidget />
          </aside>
        </div>

      </div>
    </div>
  );
}
