"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Pagination from "@/components/Pagination";
import Image from "next/image";
import Link from "next/link";
import { setPreview } from "@/lib/preview-store";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Category { id: string; name: string; slug: string; count?: number; }
interface Wallpaper {
  id: string; title: string; fileUrl: string; type: "IMAGE" | "VIDEO";
  createdAt: string;
  category?: Category | null;      // pre-migration single FK
  categories?: Category[] | null;  // post-migration many-to-many
}
type TypeFilter = "ALL" | "IMAGE" | "VIDEO";
type SortOption = "newest" | "oldest" | "az";

// ─── Design tokens ────────────────────────────────────────────────────────────

const surf     = "rgba(9,19,40,0.55)";
const surfDeep = "rgba(6,14,32,0.72)";
const bdr      = "rgba(255,255,255,0.07)";
const purple   = "#8B5CF6";
const textMuted = "rgba(222,229,255,0.4)";
const textDim   = "rgba(222,229,255,0.22)";

// ─── Wallpaper Card ───────────────────────────────────────────────────────────

function WallpaperCard({ w }: { w: Wallpaper }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Track in-flight play() promise to avoid AbortError on pause()
  const playRef  = useRef<Promise<void> | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || w.type !== "VIDEO") return;

    const safePlay = () => {
      playRef.current = el.play().catch(() => {});
    };
    const safePause = () => {
      (playRef.current ?? Promise.resolve())
        .catch(() => {})
        .finally(() => { el.pause(); });
      playRef.current = null;
    };

    // Play when ≥25% of the card is in the viewport, pause when it leaves
    const observer = new IntersectionObserver(
      ([entry]) => { entry.isIntersecting ? safePlay() : safePause(); },
      { threshold: 0.25 }
    );
    observer.observe(el);
    return () => { observer.disconnect(); safePause(); };
  }, [w.type]);

  return (
    <Link
      href={`/wallpapers/${w.id}?t=${encodeURIComponent(w.title)}`}
      className="group relative aspect-[9/16] rounded-xl overflow-hidden bg-surface border border-outline-variant/10 hover:border-primary/30 transition-all duration-200 cursor-pointer block"
      onClick={() => setPreview(`wallpaper:${w.id}`, w)}
    >
      {w.type === "IMAGE" ? (
        <Image src={w.fileUrl} alt={w.title} fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500" />
      ) : (
        // preload="metadata" loads the first frame immediately as a visible thumbnail
        <video ref={videoRef} src={w.fileUrl} className="w-full h-full object-cover"
          muted loop playsInline preload="metadata" />
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{ background: "linear-gradient(to top, rgba(6,14,32,0.92) 0%, rgba(6,14,32,0.3) 45%, transparent 100%)" }} />

      {/* Category badge */}
      {(w.categories?.[0] ?? w.category) && (
        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md font-body text-[0.5625rem] font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{ background: "rgba(139,92,246,0.85)", color: "white", backdropFilter: "blur(4px)" }}>
          {(w.categories?.[0] ?? w.category)?.name}
        </div>
      )}

      {/* Type pill */}
      <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md font-body text-[0.5625rem] uppercase font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{ background: "rgba(6,14,32,0.75)", color: w.type === "VIDEO" ? "#ba9eff" : "rgba(222,229,255,0.65)", backdropFilter: "blur(4px)" }}>
        {w.type === "VIDEO" ? "Live" : "IMG"}
      </div>

      {/* Title */}
      <div className="absolute bottom-0 left-0 right-0 p-2.5 translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-200">
        <p className="font-body text-white text-xs font-medium truncate leading-snug">{w.title}</p>
      </div>
    </Link>
  );
}

// ─── Sidebar primitives ───────────────────────────────────────────────────────

function SideSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="font-body text-[0.625rem] uppercase tracking-widest font-semibold mb-2.5" style={{ color: textMuted }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function FilterBtn({ active, onClick, count, children }: {
  active: boolean; onClick: () => void; count?: number; children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-body text-sm cursor-pointer transition-all duration-150"
      style={{
        background: active ? "rgba(139,92,246,0.16)" : "transparent",
        color: active ? "#e2d5ff" : "rgba(222,229,255,0.48)",
        border: `1px solid ${active ? "rgba(139,92,246,0.32)" : "transparent"}`,
      }}>
      <span className="w-2 h-2 rounded-full flex-none transition-all duration-150"
        style={{ background: active ? purple : "rgba(255,255,255,0.14)" }} />
      <span className="flex-1 text-left truncate">{children}</span>
      {count !== undefined && (
        <span className="font-mono text-[0.5625rem] tabular-nums" style={{ color: textDim }}>{count}</span>
      )}
    </button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const PER_PAGE = 24;

export default function WallpapersContent() {
  const [wallpapers, setWallpapers]   = useState<Wallpaper[]>([]);
  const [categories, setCategories]   = useState<Category[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [debSearch, setDebSearch]     = useState("");
  const [typeFilter, setTypeFilter]   = useState<TypeFilter>("ALL");
  const [catFilter, setCatFilter]     = useState<string>("ALL"); // stores slug
  const [drawerOpen, setDrawerOpen]   = useState(false);
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [total, setTotal]             = useState(0);
  const topRef = useRef<HTMLDivElement>(null);

  // Debounce search 350 ms
  useEffect(() => {
    const t = setTimeout(() => setDebSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Server-side fetch with pagination + filters
  const fetchWallpapers = useCallback(async (p: number) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: String(PER_PAGE) });
    if (typeFilter !== "ALL") params.set("type", typeFilter);
    if (catFilter !== "ALL") params.set("category", catFilter);
    if (debSearch) params.set("search", debSearch);

    try {
      const data = await fetch(`/api/wallpapers?${params}`).then(r => r.json());
      setWallpapers(Array.isArray(data) ? data : (data.wallpapers ?? []));
      setTotal(data.total ?? 0);
      setTotalPages(data.pages ?? 1);
    } catch {
      setWallpapers([]);
    }
    setLoading(false);
  }, [typeFilter, catFilter, debSearch]);

  // Fetch categories once
  useEffect(() => {
    fetch("/api/wallpaper-categories").then(r => r.json())
      .then(d => setCategories(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  // Re-fetch when filters change — reset to page 1
  useEffect(() => {
    setPage(1);
    fetchWallpapers(1);
  }, [typeFilter, catFilter, debSearch]); // eslint-disable-line

  // Re-fetch when page changes (not filter change)
  const goToPage = (p: number) => {
    setPage(p);
    fetchWallpapers(p);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const filtered   = wallpapers; // already filtered server-side
  const hasFilters = typeFilter !== "ALL" || catFilter !== "ALL" || debSearch !== "";

  const resetFilters = () => { setSearch(""); setTypeFilter("ALL"); setCatFilter("ALL"); setPage(1); };

  // Sidebar JSX — reused in desktop aside + mobile drawer
  const sidebar = (
    <div className="space-y-7">
      <SideSection title="Media Type">
        <FilterBtn active={typeFilter === "ALL"} onClick={() => setTypeFilter("ALL")}>All Media</FilterBtn>
        <FilterBtn active={typeFilter === "IMAGE"} onClick={() => setTypeFilter("IMAGE")}>Images only</FilterBtn>
        <FilterBtn active={typeFilter === "VIDEO"} onClick={() => setTypeFilter("VIDEO")}>Live Wallpapers</FilterBtn>
      </SideSection>

      {categories.length > 0 && (
        <SideSection title="Category">
          <FilterBtn active={catFilter === "ALL"} onClick={() => setCatFilter("ALL")}>All Categories</FilterBtn>
          {categories.map(c => (
            <FilterBtn key={c.id} active={catFilter === c.slug} onClick={() => setCatFilter(c.slug)} count={c.count}>
              {c.name}
            </FilterBtn>
          ))}
        </SideSection>
      )}

      {hasFilters && (
        <button type="button" onClick={resetFilters}
          className="w-full py-2 rounded-lg font-body text-xs cursor-pointer transition-all hover:bg-white/5"
          style={{ color: "rgba(248,113,113,0.75)", border: "1px solid rgba(248,113,113,0.18)" }}>
          Reset all filters
        </button>
      )}
    </div>
  );

  return (
    <div className="flex gap-7 items-start" ref={topRef}>

      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:block w-48 xl:w-52 flex-none sticky top-24">
        <div className="rounded-2xl p-5" style={{ background: surf, border: `1px solid ${bdr}` }}>
          <div className="flex items-center justify-between mb-5">
            <span className="font-headline text-sm font-bold text-text-main">Filters</span>
            {hasFilters && (
              <span className="w-2 h-2 rounded-full" style={{ background: purple }} />
            )}
          </div>
          {sidebar}
        </div>
      </aside>

      {/* ── Main column ── */}
      <div className="flex-1 min-w-0 space-y-5">

        {/* Toolbar */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <svg viewBox="0 0 20 20" fill="currentColor"
              className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: textDim }}>
              <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
            </svg>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search wallpapers…"
              className="w-full pl-10 pr-10 py-2.5 rounded-xl font-body text-sm text-text-main placeholder:text-text-main/25 focus:outline-none transition-all duration-200 focus:ring-1 focus:ring-primary/40"
              style={{ background: surfDeep, border: `1px solid ${bdr}` }}
            />
            {search && (
              <button type="button" onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer transition-colors hover:text-text-main/70"
                style={{ color: textMuted }}>
                <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                  <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                </svg>
              </button>
            )}
          </div>

          {/* Mobile filter button */}
          <button type="button" onClick={() => setDrawerOpen(true)}
            className="lg:hidden flex items-center gap-2 px-4 py-2.5 rounded-xl font-body text-sm cursor-pointer transition-all hover:brightness-110 flex-none"
            style={{
              background: surfDeep,
              border: `1px solid ${hasFilters ? "rgba(139,92,246,0.5)" : bdr}`,
              color: hasFilters ? "#ba9eff" : "rgba(222,229,255,0.5)",
            }}>
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M2.628 1.601C5.028 1.206 7.49 1 10 1s4.973.206 7.372.601a.75.75 0 0 1 .628.74v2.288a2.25 2.25 0 0 1-.659 1.59l-4.682 4.683a2.25 2.25 0 0 0-.659 1.59v3.032c0 .684-.31 1.33-.844 1.757l-1.937 1.55A.75.75 0 0 1 8 18.25v-5.757a2.25 2.25 0 0 0-.659-1.591L2.659 6.22A2.25 2.25 0 0 1 2 4.629V2.34a.75.75 0 0 1 .628-.74Z" clipRule="evenodd" />
            </svg>
            <span>Filter</span>
            {hasFilters && <span className="w-1.5 h-1.5 rounded-full" style={{ background: purple }} />}
          </button>

          {/* Result count */}
          {!loading && total > 0 && (
            <span className="hidden sm:block font-mono text-xs tabular-nums flex-none" style={{ color: textDim }}>
              {total.toLocaleString()} wallpapers
            </span>
          )}
        </div>

        {/* Active filter chips */}
        {hasFilters && !loading && (
          <div className="flex flex-wrap gap-2 items-center">
            {typeFilter !== "ALL" && (
              <Chip onRemove={() => setTypeFilter("ALL")}>{typeFilter === "IMAGE" ? "Images" : "Live Wallpapers"}</Chip>
            )}
            {catFilter !== "ALL" && (
              <Chip onRemove={() => setCatFilter("ALL")}>
                {categories.find(c => c.slug === catFilter)?.name ?? catFilter}
              </Chip>
            )}
            {debSearch && <Chip onRemove={() => setSearch("")}>"{debSearch}"</Chip>}
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} className="aspect-[9/16] rounded-xl animate-pulse" style={{ background: surf }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-24 rounded-2xl" style={{ background: surf, border: `1px solid ${bdr}` }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: surfDeep }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" className="w-8 h-8" style={{ color: textDim }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="font-headline text-base font-semibold" style={{ color: "rgba(222,229,255,0.65)" }}>
                {wallpapers.length === 0 ? "No wallpapers yet" : "No results found"}
              </p>
              <p className="font-body text-sm mt-1.5" style={{ color: textDim }}>
                {wallpapers.length === 0
                  ? "Check back soon — new wallpapers are added regularly"
                  : "Try a different search term or adjust your filters"}
              </p>
            </div>
            {hasFilters && (
              <button type="button" onClick={resetFilters}
                className="px-4 py-2 rounded-xl font-body text-sm font-medium cursor-pointer transition-all hover:brightness-110"
                style={{ background: "rgba(139,92,246,0.14)", color: "#ba9eff", border: "1px solid rgba(139,92,246,0.28)" }}>
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
            {filtered.map(w => <WallpaperCard key={w.id} w={w} />)}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <Pagination page={page} pages={totalPages} total={total} onChange={goToPage} />
        )}
      </div>

      {/* ── Mobile filter drawer ── */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40 lg:hidden"
            style={{ background: "rgba(6,14,32,0.75)", backdropFilter: "blur(4px)" }}
            onClick={() => setDrawerOpen(false)} />

          {/* Drawer */}
          <div className="fixed inset-y-0 left-0 z-50 w-72 flex flex-col lg:hidden"
            style={{ background: "rgba(8,13,30,0.98)", borderRight: `1px solid ${bdr}` }}>
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: bdr }}>
              <span className="font-headline text-sm font-bold text-text-main">Filters</span>
              <button type="button" onClick={() => setDrawerOpen(false)}
                className="cursor-pointer transition-colors hover:text-text-main" style={{ color: textMuted }}>
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">{sidebar}</div>

            <div className="p-4 border-t" style={{ borderColor: bdr }}>
              <button type="button" onClick={() => setDrawerOpen(false)}
                className="w-full py-2.5 rounded-xl font-headline text-sm font-semibold cursor-pointer transition-all hover:brightness-110"
                style={{ background: "linear-gradient(135deg,#8B5CF6,#D946EF)", color: "white" }}>
                Show {filtered.length} result{filtered.length !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Active filter chip ───────────────────────────────────────────────────────

function Chip({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full font-body text-xs"
      style={{ background: "rgba(139,92,246,0.14)", color: "#ba9eff", border: "1px solid rgba(139,92,246,0.28)" }}>
      {children}
      <button type="button" onClick={onRemove} className="cursor-pointer hover:text-white transition-colors w-4 h-4 flex items-center justify-center rounded-full hover:bg-primary/20">
        <svg viewBox="0 0 12 12" fill="currentColor" className="w-2.5 h-2.5">
          <path d="M3.47 3.47a.75.75 0 0 1 1.06 0L6 4.94l1.47-1.47a.75.75 0 1 1 1.06 1.06L7.06 6l1.47 1.47a.75.75 0 1 1-1.06 1.06L6 7.06 4.53 8.53a.75.75 0 0 1-1.06-1.06L4.94 6 3.47 4.53a.75.75 0 0 1 0-1.06Z" />
        </svg>
      </button>
    </span>
  );
}
