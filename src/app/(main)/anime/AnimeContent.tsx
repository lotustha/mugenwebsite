"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import AnimeGrid from "@/components/AnimeGrid";
import Pagination from "@/components/Pagination";

const ANIME_PER_PAGE = 24;

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab    = "recent" | "new" | "all";
type Status = "all" | "ongoing" | "completed";

// ─── Tokens ───────────────────────────────────────────────────────────────────
const glass  = "rgba(9,19,40,0.65)";
const bdr    = "rgba(255,255,255,0.07)";
const mutd   = "rgba(222,229,255,0.35)";
const dimmed = "rgba(222,229,255,0.22)";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function dedup(arr: any[]): any[] {
  const seen = new Set<string>();
  return arr.filter(a => {
    const id = a.id || a.animeId;
    if (!id || seen.has(id)) return false;
    seen.add(id); return true;
  });
}

function applyStatus(anime: any[], status: Status): any[] {
  if (status === "all") return anime;
  return anime.filter(a => {
    const s = (a.status ?? "").toLowerCase();
    if (status === "ongoing")   return s.includes("ongoing") || s.includes("releasing") || s.includes("airing");
    if (status === "completed") return s.includes("completed") || s.includes("finished");
    return true;
  });
}

const DAYS = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
const DAY_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
      {Array.from({ length: 15 }).map((_, i) => (
        <div key={i}>
          <div className="aspect-[2/3] bg-surface rounded-xl animate-pulse" />
          <div className="mt-2 h-3 bg-surface rounded animate-pulse w-3/4" />
          <div className="mt-1 h-3 bg-surface rounded animate-pulse w-1/2" />
        </div>
      ))}
    </div>
  );
}

// ─── Sidebar section title ────────────────────────────────────────────────────
function SideLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-body text-[0.625rem] uppercase tracking-widest font-semibold px-1"
      style={{ color: dimmed }}>
      {children}
    </p>
  );
}

// ─── Filter radio button ──────────────────────────────────────────────────────
function FilterBtn({
  label, count, active, onClick,
}: { label: string; count?: number; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} type="button"
      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left cursor-pointer transition-all duration-150"
      style={{
        background: active ? "rgba(139,92,246,0.14)" : "transparent",
        color:      active ? "#c4b5fd"                : mutd,
        border:     active ? "1px solid rgba(139,92,246,0.28)" : "1px solid transparent",
      }}>
      <span className="w-3.5 h-3.5 rounded-full border-2 flex-none flex items-center justify-center flex-shrink-0"
        style={{ borderColor: active ? "#8B5CF6" : "rgba(255,255,255,0.2)" }}>
        {active && <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#8B5CF6" }} />}
      </span>
      <span className="font-body text-sm flex-1">{label}</span>
      {count !== undefined && (
        <span className="font-mono text-[0.625rem] flex-none" style={{ color: dimmed }}>{count}</span>
      )}
    </button>
  );
}

// ─── Schedule widget ──────────────────────────────────────────────────────────
function ScheduleWidget() {
  const [schedule, setSchedule] = useState<Record<string, any[]>>({});
  const [loading, setLoading]   = useState(true);
  const today = DAYS[new Date().getDay()];

  useEffect(() => {
    fetch("/api/anime/schedule")
      .then(r => r.json())
      .then(d => {
        // Normalise: could be {monday:[...]} or {scheduledAnimes:[...]} or [{day,...}]
        if (d && typeof d === "object" && !Array.isArray(d)) {
          const normalised: Record<string, any[]> = {};
          for (const day of DAYS) {
            if (Array.isArray(d[day])) normalised[day] = d[day];
          }
          if (Object.keys(normalised).length > 0) { setSchedule(normalised); }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-2 px-1">
        {[80,65,75,55,70].map((w, i) => (
          <div key={i} className="h-3 rounded animate-pulse" style={{ width: `${w}%`, background: "rgba(255,255,255,0.06)" }} />
        ))}
      </div>
    );
  }

  const hasDays = Object.values(schedule).some(arr => arr.length > 0);
  if (!hasDays) {
    return <p className="font-body text-xs px-1" style={{ color: dimmed }}>Schedule unavailable</p>;
  }

  return (
    <div className="space-y-1">
      {DAYS.map((day, i) => {
        const items = schedule[day] ?? [];
        const isToday = day === today;
        if (!isToday && items.length === 0) return null;
        return (
          <div key={day}
            className="rounded-xl px-3 py-2"
            style={{ background: isToday ? "rgba(139,92,246,0.12)" : "transparent", border: isToday ? "1px solid rgba(139,92,246,0.2)" : "1px solid transparent" }}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-body text-[0.6875rem] font-semibold"
                style={{ color: isToday ? "#a78bfa" : mutd }}>
                {isToday ? `Today (${DAY_SHORT[i]})` : DAY_SHORT[i]}
              </span>
              {items.length > 0 && (
                <span className="font-mono text-[0.5625rem] px-1.5 py-0.5 rounded-md"
                  style={{ background: "rgba(139,92,246,0.15)", color: "#a78bfa" }}>
                  {items.length}
                </span>
              )}
            </div>
            {isToday && items.slice(0, 3).map((a, j) => (
              <p key={j} className="font-body text-[0.625rem] truncate leading-relaxed" style={{ color: dimmed }}>
                {a.name || a.title || a.jname}
              </p>
            ))}
            {isToday && items.length > 3 && (
              <p className="font-body text-[0.5625rem]" style={{ color: "rgba(139,92,246,0.5)" }}>
                +{items.length - 3} more
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Sidebar content ──────────────────────────────────────────────────────────
function SidebarContent({
  tab, setTab, status, setStatus, searchQuery, setSearchQuery,
  counts, onSearch,
}: {
  tab: Tab; setTab: (t: Tab) => void;
  status: Status; setStatus: (s: Status) => void;
  searchQuery: string; setSearchQuery: (q: string) => void;
  counts: { recent: number; new: number; all: number };
  onSearch: (q: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    onSearch(q);
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div>
        <SideLabel>Search</SideLabel>
        <div className="mt-2 relative">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: "rgba(255,255,255,0.25)" }}>
            <circle cx="8.5" cy="8.5" r="5.75" /><path strokeLinecap="round" d="M13 13l4 4" />
          </svg>
          <input
            ref={inputRef}
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search anime…"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl font-body text-sm text-white/80 outline-none placeholder:text-white/20 transition-all duration-150"
            style={{
              background: "rgba(6,14,32,0.7)",
              border: `1px solid ${bdr}`,
            }}
          />
          {searchQuery && (
            <button onClick={() => handleSearch("")} type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center cursor-pointer"
              style={{ color: "rgba(255,255,255,0.3)" }}>
              <svg viewBox="0 0 12 12" fill="currentColor" className="w-3 h-3">
                <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Browse */}
      {!searchQuery && (
        <div className="space-y-1.5">
          <SideLabel>Browse</SideLabel>
          <FilterBtn label="Recently Added" count={counts.recent} active={tab === "recent"} onClick={() => setTab("recent")} />
          <FilterBtn label="New Releases"   count={counts.new}    active={tab === "new"}    onClick={() => setTab("new")} />
          <FilterBtn label="All"            count={counts.all}    active={tab === "all"}    onClick={() => setTab("all")} />
        </div>
      )}

      {/* Status */}
      {!searchQuery && (
        <div className="space-y-1.5">
          <SideLabel>Status</SideLabel>
          <FilterBtn label="All"       active={status === "all"}       onClick={() => setStatus("all")} />
          <FilterBtn label="Ongoing"   active={status === "ongoing"}   onClick={() => setStatus("ongoing")} />
          <FilterBtn label="Completed" active={status === "completed"} onClick={() => setStatus("completed")} />
        </div>
      )}

      {/* Schedule */}
      {!searchQuery && (
        <div className="space-y-2">
          <SideLabel>This Week</SideLabel>
          <ScheduleWidget />
        </div>
      )}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function AnimeContent() {
  const [tab, setTab]           = useState<Tab>("recent");
  const [status, setStatus]     = useState<Status>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [recent, setRecent]     = useState<any[]>([]);
  const [newR, setNewR]         = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [searching, setSearching] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [page, setPage]         = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const topRef      = useRef<HTMLDivElement>(null);

  // Initial data fetch
  useEffect(() => {
    Promise.all([
      fetch("/api/anime/recent").then(r => r.json()).catch(() => []),
      fetch("/api/anime/new").then(r => r.json()).catch(() => []),
    ]).then(([r, n]) => {
      setRecent(dedup(Array.isArray(r) ? r : r?.results ?? []));
      setNewR(dedup(Array.isArray(n) ? n : n?.results ?? []));
      setLoading(false);
    });
  }, []);

  // Search handler with debounce
  const handleSearch = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) { setSearchResults([]); setSearching(false); return; }
    setSearching(true);
    debounceRef.current = setTimeout(() => {
      fetch(`/api/anime/search?query=${encodeURIComponent(q)}`)
        .then(r => r.json())
        .then(d => {
          const arr = Array.isArray(d) ? d : d?.results ?? d?.suggestions ?? [];
          setSearchResults(dedup(arr));
        })
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 380);
  }, []);

  // Reset page when tab / status / search changes
  useEffect(() => { setPage(1); }, [tab, status, searchQuery]);

  // Compute displayed anime
  const all = dedup([...recent, ...newR]);
  const base =
    searchQuery.trim() ? searchResults :
    tab === "recent"   ? recent :
    tab === "new"      ? newR :
    all;
  const displayed   = searchQuery.trim() ? base : applyStatus(base, status);
  const totalPages  = Math.max(1, Math.ceil(displayed.length / ANIME_PER_PAGE));
  const pageItems   = displayed.slice((page - 1) * ANIME_PER_PAGE, page * ANIME_PER_PAGE);

  const goToPage = (p: number) => {
    setPage(p);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Active filter tags for display
  const filterTags: string[] = [];
  if (!searchQuery) {
    if (tab !== "all") filterTags.push(tab === "recent" ? "Recently Added" : "New Releases");
    if (status !== "all") filterTags.push(status.charAt(0).toUpperCase() + status.slice(1));
  } else {
    filterTags.push(`"${searchQuery}"`);
  }

  const sidebarProps = {
    tab, setTab, status, setStatus, searchQuery, setSearchQuery,
    counts: { recent: recent.length, new: newR.length, all: all.length },
    onSearch: handleSearch,
  };

  return (
    <div className="min-h-screen" ref={topRef}>
      {/* ── Page header ── */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="font-body text-xs uppercase tracking-widest font-semibold mb-1"
            style={{ color: "rgba(139,92,246,0.7)" }}>
            Discover
          </p>
          <h1 className="font-headline text-3xl font-bold text-text-main">Browse Anime</h1>
        </div>

        {/* Mobile filter toggle */}
        <button onClick={() => setSidebarOpen(o => !o)} type="button"
          className="flex lg:hidden items-center gap-2 px-4 py-2 rounded-xl font-body text-sm cursor-pointer transition-all"
          style={{
            background: sidebarOpen ? "rgba(139,92,246,0.15)" : glass,
            color:      sidebarOpen ? "#c4b5fd" : mutd,
            border:     `1px solid ${sidebarOpen ? "rgba(139,92,246,0.3)" : bdr}`,
          }}>
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M2.628 1.601C5.028 1.206 7.49 1 10 1s4.973.206 7.372.601a.75.75 0 0 1 .628.74v2.288a2.25 2.25 0 0 1-.659 1.59l-4.682 4.683a2.25 2.25 0 0 0-.659 1.59v3.037c0 .684-.31 1.33-.844 1.757l-1.937 1.55A.75.75 0 0 1 8 18.25v-5.757a2.25 2.25 0 0 0-.659-1.591L2.659 6.22A2.25 2.25 0 0 1 2 4.629V2.34a.75.75 0 0 1 .628-.74Z" clipRule="evenodd" />
          </svg>
          Filters
          {(tab !== "all" || status !== "all" || searchQuery) && (
            <span className="w-1.5 h-1.5 rounded-full bg-primary flex-none" />
          )}
        </button>
      </div>

      {/* ── Mobile filter panel ── */}
      {sidebarOpen && (
        <div className="lg:hidden mb-6 rounded-2xl p-5"
          style={{ background: glass, border: `1px solid ${bdr}`, backdropFilter: "blur(20px)" }}>
          <SidebarContent {...sidebarProps} />
        </div>
      )}

      {/* ── Layout ── */}
      <div className="flex gap-7">

        {/* ── Desktop Sidebar ── */}
        <aside className="hidden lg:block w-64 xl:w-72 flex-none">
          <div className="sticky top-28 rounded-2xl p-5 space-y-6 max-h-[calc(100vh-9rem)] overflow-y-auto scrollbar-none"
            style={{
              background: glass,
              border: `1px solid ${bdr}`,
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              boxShadow: "inset 0 0.5px 0 rgba(255,255,255,0.08)",
            }}>
            <SidebarContent {...sidebarProps} />
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 min-w-0">

          {/* Active filter chips + result count */}
          <div className="flex items-center gap-2 flex-wrap mb-5 min-h-[28px]">
            {filterTags.map(tag => (
              <span key={tag} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-body text-xs"
                style={{ background: "rgba(139,92,246,0.12)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.2)" }}>
                {tag}
              </span>
            ))}
            {!loading && (
              <span className="font-body text-xs ml-auto flex-none" style={{ color: dimmed }}>
                {searching ? "Searching…" : `${displayed.length} results`}
                {!searching && totalPages > 1 && (
                  <span style={{ color: "rgba(255,255,255,0.15)" }}> · pg {page}/{totalPages}</span>
                )}
              </span>
            )}
          </div>

          {/* Grid */}
          {loading || searching ? (
            <GridSkeleton />
          ) : displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-32 rounded-2xl text-center"
              style={{ background: glass, border: `1px solid ${bdr}` }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="rgba(139,92,246,0.5)" strokeWidth="1.5" className="w-12 h-12">
                <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
              </svg>
              <div>
                <p className="font-headline text-lg font-bold text-text-main mb-1">No results found</p>
                <p className="font-body text-sm" style={{ color: mutd }}>
                  {searchQuery ? `Nothing matched "${searchQuery}"` : "Try a different filter"}
                </p>
              </div>
              {(searchQuery || tab !== "all" || status !== "all") && (
                <button onClick={() => { setTab("all"); setStatus("all"); setSearchQuery(""); setSearchResults([]); }}
                  className="font-body text-sm cursor-pointer transition-colors hover:text-primary"
                  style={{ color: mutd }}>
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <AnimeGrid anime={pageItems} />
          )}

          {/* Pagination */}
          {!loading && !searching && totalPages > 1 && (
            <Pagination page={page} pages={totalPages} total={displayed.length} onChange={goToPage} />
          )}
        </main>
      </div>
    </div>
  );
}
