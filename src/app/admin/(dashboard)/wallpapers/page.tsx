"use client";

import { useState, useEffect, useRef, useCallback, DragEvent, memo } from "react";
import Image from "next/image";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WallpaperCategory { id: string; name: string; slug: string; count?: number; }
interface WallpaperTag { id: string; name: string; slug: string; }
interface Wallpaper {
  id: string; title: string; description?: string | null; fileUrl: string;
  type: "IMAGE" | "VIDEO"; createdAt: string;
  category?: WallpaperCategory | null;   // pre-migration single FK
  categories?: WallpaperCategory[];      // post-migration many-to-many
  tags?: WallpaperTag[];
}
interface PinResult {
  url: string; status: "pending" | "processing" | "ok" | "error";
  error?: string; wallpaper?: Wallpaper; category?: string;
}
interface PinSearchResult {
  pinId: string; title: string; thumbnailUrl: string;
  isVideo: boolean; pinUrl: string;
}
type ImportMode = "search" | "urls";
type Tab = "import" | "upload" | "library";

// ─── Design tokens ────────────────────────────────────────────────────────────

const surface = "rgba(9,19,40,0.55)";
const surfaceDeep = "rgba(6,14,32,0.75)";
const border = "rgba(255,255,255,0.07)";
const borderMid = "rgba(255,255,255,0.1)";
const accentPurple = "#8B5CF6";
const accentMagenta = "#D946EF";
const textMuted = "rgba(222,229,255,0.4)";
const textDim = "rgba(222,229,255,0.25)";

const inputCls =
  "w-full px-3.5 py-2.5 rounded-lg font-body text-sm text-text-main placeholder:text-text-main/25 focus:outline-none transition-all duration-200 focus:ring-1 focus:ring-primary/40";
const inputSt = { background: surfaceDeep, border: `1px solid ${border}` };
const labelCls = "block font-body text-[0.6875rem] uppercase tracking-widest font-semibold mb-1.5";

// ─── Shared primitives ────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className={labelCls} style={{ color: textMuted }}>{children}</label>;
}

function GradientBtn({
  children, onClick, disabled, type = "button", className = "",
}: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean;
  type?: "button" | "submit"; className?: string;
}) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-headline text-sm font-semibold
        cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200
        hover:brightness-110 active:scale-[0.98] ${className}`}
      style={{ background: `linear-gradient(135deg,${accentPurple},${accentMagenta})`, color: "white" }}>
      {children}
    </button>
  );
}

function GhostBtn({
  children, onClick, disabled, className = "",
}: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-body text-xs font-medium
        cursor-pointer disabled:opacity-40 transition-all duration-200 hover:bg-white/5 ${className}`}
      style={{ color: "rgba(186,158,255,0.8)", border: `1px solid rgba(139,92,246,0.25)` }}>
      {children}
    </button>
  );
}

// ─── Category Combobox ────────────────────────────────────────────────────────

function CategoryCombobox({
  categories, selected, onChange, onCreateCategory, placeholder = "Search or add categories…",
}: {
  categories: WallpaperCategory[];
  selected: WallpaperCategory[];
  onChange: (cats: WallpaperCategory[]) => void;
  onCreateCategory: (name: string) => Promise<WallpaperCategory | null>;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = categories.filter(
    (c) => !selected.find((s) => s.id === c.id) && c.name.toLowerCase().includes(query.toLowerCase())
  );
  const exactMatch = categories.some((c) => c.name.toLowerCase() === query.toLowerCase().trim());
  const alreadySelected = selected.some((s) => s.name.toLowerCase() === query.toLowerCase().trim());
  const showCreate = query.trim().length > 0 && !exactMatch && !alreadySelected;

  const select = (cat: WallpaperCategory) => {
    onChange([...selected, cat]);
    setQuery("");
    inputRef.current?.focus();
  };

  const remove = (id: string) => onChange(selected.filter((s) => s.id !== id));

  const handleCreate = async () => {
    if (!query.trim() || creating) return;
    setCreating(true);
    const newCat = await onCreateCategory(query.trim());
    if (newCat) { onChange([...selected, newCat]); setQuery(""); }
    setCreating(false);
    inputRef.current?.focus();
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {/* Pill input area */}
      <div
        onClick={() => { setOpen(true); inputRef.current?.focus(); }}
        className="flex flex-wrap gap-1.5 p-2 min-h-[44px] rounded-lg cursor-text transition-all duration-200"
        style={{
          background: surfaceDeep,
          border: `1px solid ${open ? "rgba(139,92,246,0.5)" : border}`,
          boxShadow: open ? "0 0 0 3px rgba(139,92,246,0.1)" : "none",
        }}>
        {selected.map((cat) => (
          <span key={cat.id}
            className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-md font-body text-xs font-medium select-none"
            style={{ background: "rgba(139,92,246,0.2)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.35)" }}>
            {cat.name}
            <button type="button"
              onClick={(e) => { e.stopPropagation(); remove(cat.id); }}
              className="w-4 h-4 flex items-center justify-center rounded cursor-pointer hover:bg-white/10 transition-colors ml-0.5">
              <svg viewBox="0 0 12 12" fill="currentColor" className="w-2.5 h-2.5">
                <path d="M3.47 3.47a.75.75 0 0 1 1.06 0L6 4.94l1.47-1.47a.75.75 0 1 1 1.06 1.06L7.06 6l1.47 1.47a.75.75 0 1 1-1.06 1.06L6 7.06 4.53 8.53a.75.75 0 0 1-1.06-1.06L4.94 6 3.47 4.53a.75.75 0 0 1 0-1.06Z" />
              </svg>
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !query && selected.length) { e.preventDefault(); remove(selected[selected.length - 1].id); }
            if (e.key === "Escape") { setOpen(false); }
            if (e.key === "Enter") { e.preventDefault(); if (filtered[0]) select(filtered[0]); else if (showCreate) handleCreate(); }
          }}
          placeholder={selected.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[120px] bg-transparent font-body text-sm text-text-main placeholder:text-text-main/25 focus:outline-none py-0.5"
        />
      </div>

      {/* Dropdown */}
      {open && (filtered.length > 0 || showCreate || (query && filtered.length === 0 && !showCreate)) && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1.5 rounded-xl overflow-hidden max-h-56 overflow-y-auto"
          style={{ background: "rgba(6,10,28,0.98)", border: "1px solid rgba(139,92,246,0.28)", boxShadow: "0 12px 40px rgba(0,0,0,0.5)" }}>
          {filtered.map((cat) => (
            <button key={cat.id} type="button"
              onMouseDown={(e) => { e.preventDefault(); select(cat); }}
              className="w-full px-3.5 py-2.5 flex items-center gap-2.5 font-body text-sm text-left cursor-pointer transition-colors hover:bg-primary/10"
              style={{ color: "rgba(222,229,255,0.85)" }}>
              <span className="w-2 h-2 rounded-full flex-none" style={{ background: "rgba(139,92,246,0.6)" }} />
              {cat.name}
            </button>
          ))}
          {showCreate && (
            <button type="button"
              onMouseDown={(e) => { e.preventDefault(); handleCreate(); }}
              disabled={creating}
              className="w-full px-3.5 py-2.5 flex items-center gap-2.5 font-body text-sm text-left cursor-pointer transition-colors hover:bg-primary/10 disabled:opacity-50"
              style={{ color: "#a78bfa", borderTop: filtered.length ? "1px solid rgba(139,92,246,0.12)" : "none" }}>
              {creating
                ? <div className="w-3.5 h-3.5 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(167,139,250,0.2)", borderTopColor: "#a78bfa" }} />
                : <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 flex-none">
                    <path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2Z" />
                  </svg>
              }
              Create "{query.trim()}"
            </button>
          )}
          {query && filtered.length === 0 && !showCreate && (
            <div className="px-3.5 py-2.5 font-body text-sm" style={{ color: textDim }}>
              Already added
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tab Bar ──────────────────────────────────────────────────────────────────

const TAB_ITEMS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  {
    id: "import",
    label: "Import",
    icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 flex-none">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0Z" />
    </svg>,
  },
  {
    id: "upload",
    label: "Upload",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3.5 h-3.5 flex-none">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>,
  },
  {
    id: "library",
    label: "Library",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3.5 h-3.5 flex-none">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
    </svg>,
  },
];

function TabBar({ active, onChange, counts }: {
  active: Tab; onChange: (t: Tab) => void; counts: Record<Tab, number>;
}) {
  return (
    <div className="flex gap-1 p-1 rounded-xl" style={{ background: surfaceDeep, border: `1px solid ${border}` }}>
      {TAB_ITEMS.map(({ id, label, icon }) => {
        const isActive = active === id;
        return (
          <button key={id} type="button" onClick={() => onChange(id)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-body text-sm font-medium
              cursor-pointer transition-all duration-200"
            style={{
              background: isActive ? `linear-gradient(135deg,rgba(139,92,246,0.25),rgba(217,70,239,0.15))` : "transparent",
              color: isActive ? "#e2d5ff" : textMuted,
              border: isActive ? `1px solid rgba(139,92,246,0.35)` : "1px solid transparent",
            }}>
            <span style={{ color: isActive ? accentPurple : textMuted }}>{icon}</span>
            {label}
            {counts[id] > 0 && (
              <span className="px-1.5 py-0.5 rounded-full font-body text-[0.5625rem] tabular-nums leading-none"
                style={{
                  background: isActive ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.06)",
                  color: isActive ? "#ba9eff" : textMuted,
                }}>
                {counts[id]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Stats Row ────────────────────────────────────────────────────────────────

function StatChip({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl" style={{ background: surface, border: `1px solid ${border}` }}>
      <span className="font-headline text-xl font-bold" style={{ color: accent ?? "white" }}>{value}</span>
      <span className="font-body text-xs" style={{ color: textMuted }}>{label}</span>
    </div>
  );
}

// ─── Pinterest importer ───────────────────────────────────────────────────────

function PinRow({ result }: { result: PinResult }) {
  const short = result.url.length > 60 ? result.url.slice(0, 57) + "…" : result.url;
  const statusColor = result.status === "ok" ? "#4ade80" : result.status === "error" ? "#f87171" : "rgba(186,158,255,0.6)";
  return (
    <div className="grid grid-cols-[20px_1fr_auto] items-start gap-3 py-3 border-b last:border-0"
      style={{ borderColor: "rgba(255,255,255,0.04)" }}>
      <div className="flex items-center justify-center mt-0.5">
        {result.status === "pending" && <div className="w-1.5 h-1.5 rounded-full" style={{ background: textDim }} />}
        {result.status === "processing" && (
          <div className="w-4 h-4 rounded-full border-2 animate-spin"
            style={{ borderColor: "rgba(186,158,255,0.15)", borderTopColor: accentPurple }} />
        )}
        {result.status === "ok" && (
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" style={{ color: "#4ade80" }}>
            <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
          </svg>
        )}
        {result.status === "error" && (
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" style={{ color: "#f87171" }}>
            <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clipRule="evenodd" />
          </svg>
        )}
      </div>
      <div className="min-w-0">
        <p className="font-mono text-[0.6875rem] truncate" style={{ color: textMuted }}>{short}</p>
        {result.status === "ok" && result.wallpaper && (
          <p className="font-body text-xs mt-0.5 font-medium truncate" style={{ color: "#4ade80" }}>
            {result.wallpaper.title}
            {result.category && <span style={{ color: "rgba(186,158,255,0.7)" }}> · {result.category}</span>}
          </p>
        )}
        {result.status === "error" && (
          <p className="font-body text-[0.6875rem] mt-0.5 truncate" style={{ color: "#f87171" }}>{result.error}</p>
        )}
        {result.status === "processing" && (
          <p className="font-body text-[0.6875rem] mt-0.5" style={{ color: statusColor }}>Scraping pin…</p>
        )}
      </div>
      {result.status === "ok" && result.wallpaper && (
        <div className="w-11 h-11 rounded-lg overflow-hidden flex-none" style={{ background: surfaceDeep }}>
          {result.wallpaper.type === "IMAGE"
            ? <Image src={result.wallpaper.fileUrl} alt={result.wallpaper.title} width={44} height={44} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" style={{ color: "rgba(186,158,255,0.5)" }}>
                  <path d="M4.5 4.5a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h8.25a3 3 0 0 0 3-3v-9a3 3 0 0 0-3-3H4.5ZM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06Z" />
                </svg>
              </div>
          }
        </div>
      )}
    </div>
  );
}

// Thumbnail card for the search-results grid. Click toggles selection.
function PinThumb({
  pin, selected, status, onClick,
}: {
  pin: PinSearchResult;
  selected: boolean;
  status?: "processing" | "ok" | "error";
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick}
      className="relative aspect-[9/16] rounded-lg overflow-hidden cursor-pointer transition-all duration-150 group"
      style={{
        border: selected ? `2px solid ${accentPurple}` : `1px solid ${border}`,
        boxShadow: selected ? `0 0 0 3px rgba(139,92,246,0.18)` : "none",
        opacity: status === "ok" ? 0.55 : 1,
      }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={pin.thumbnailUrl} alt={pin.title}
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy" referrerPolicy="no-referrer" />

      {/* Video badge */}
      {pin.isVideo && (
        <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-body text-[0.5625rem] font-semibold"
          style={{ background: "rgba(6,14,32,0.85)", color: "#e2d5ff", backdropFilter: "blur(6px)" }}>
          <svg viewBox="0 0 12 12" fill="currentColor" className="w-2.5 h-2.5"><path d="M3 2.25v7.5L9.75 6 3 2.25Z" /></svg>
          VIDEO
        </span>
      )}

      {/* Selection checkmark */}
      <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-md flex items-center justify-center transition-all"
        style={{
          background: selected ? accentPurple : "rgba(6,14,32,0.7)",
          border: selected ? `1px solid ${accentPurple}` : `1px solid rgba(255,255,255,0.2)`,
          backdropFilter: "blur(6px)",
        }}>
        {selected && (
          <svg viewBox="0 0 12 12" fill="currentColor" className="w-3 h-3 text-white">
            <path fillRule="evenodd" d="M10.28 3.22a.75.75 0 0 1 0 1.06l-5 5a.75.75 0 0 1-1.06 0l-2-2a.75.75 0 0 1 1.06-1.06L4.75 7.69l4.47-4.47a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
          </svg>
        )}
      </span>

      {/* Status overlay */}
      {status && (
        <div className="absolute inset-0 flex items-center justify-center"
          style={{ background: status === "error" ? "rgba(127,29,29,0.5)" : status === "ok" ? "rgba(20,83,45,0.45)" : "rgba(6,14,32,0.55)" }}>
          {status === "processing" && (
            <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(255,255,255,0.25)", borderTopColor: "white" }} />
          )}
          {status === "ok" && (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7" style={{ color: "#4ade80" }}>
              <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
            </svg>
          )}
          {status === "error" && (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7" style={{ color: "#f87171" }}>
              <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm8.47-3.97a.75.75 0 0 1 1.06 0L12 9.94l1.72-1.72a.75.75 0 1 1 1.06 1.06L13.06 11l1.72 1.72a.75.75 0 1 1-1.06 1.06L12 12.06l-1.72 1.72a.75.75 0 0 1-1.06-1.06L10.94 11l-1.72-1.72a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
          )}
        </div>
      )}

      {/* Title bar */}
      <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 font-body text-[0.625rem] truncate"
        style={{ background: "linear-gradient(to top, rgba(6,14,32,0.9), transparent)", color: "rgba(222,229,255,0.75)" }}>
        {pin.title}
      </div>
    </button>
  );
}

function PinterestImporter({
  onImported, categories, onCreateCategory,
}: {
  onImported: (w: Wallpaper) => void;
  categories: WallpaperCategory[];
  onCreateCategory: (name: string) => Promise<WallpaperCategory | null>;
}) {
  const [mode, setMode] = useState<ImportMode>("search");

  // Shared assignment fields (apply to whichever mode imports)
  const [selectedCategory, setSelectedCategory] = useState<WallpaperCategory[]>([]);
  const [tagsInput, setTagsInput] = useState("");
  const tagNames = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);

  // ── Search-mode state ─────────────────────────────────────────────────────
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<PinSearchResult[]>([]);
  const [selectedPins, setSelectedPins] = useState<Set<string>>(new Set());
  const [importStatus, setImportStatus] = useState<Map<string, "processing" | "ok" | "error">>(new Map());
  const [importErrors, setImportErrors] = useState<Map<string, string>>(new Map());
  const [importing, setImporting] = useState(false);

  // ── URL-mode state ────────────────────────────────────────────────────────
  const [text, setText] = useState("");
  const [urlResults, setUrlResults] = useState<PinResult[]>([]);
  const [urlRunning, setUrlRunning] = useState(false);

  const parsedUrls = text.split(/[\n,]+/).map((u) => u.trim())
    .filter((u) => u.length > 0 && (u.includes("pinterest") || u.includes("pin.it")));

  // ── Search handlers ───────────────────────────────────────────────────────
  const handleSearch = async () => {
    if (!query.trim() || searching) return;
    setSearching(true);
    setSearchError(null);
    setSearchResults([]);
    setSelectedPins(new Set());
    setImportStatus(new Map());
    setImportErrors(new Map());
    try {
      const res = await fetch("/api/admin/pinterest-search", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), limit: 30 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSearchError(data.error ?? "Search failed");
      } else {
        setSearchResults(data.results ?? []);
      }
    } catch {
      setSearchError("Network error");
    }
    setSearching(false);
  };

  const togglePin = (pinId: string) => {
    setSelectedPins((prev) => {
      const next = new Set(prev);
      if (next.has(pinId)) next.delete(pinId); else next.add(pinId);
      return next;
    });
  };

  const selectAllVideos = () => {
    setSelectedPins(new Set(searchResults.filter((r) => r.isVideo).map((r) => r.pinId)));
  };
  const selectAll = () => setSelectedPins(new Set(searchResults.map((r) => r.pinId)));
  const clearSelection = () => setSelectedPins(new Set());

  const handleSearchImport = async () => {
    if (!selectedPins.size || importing) return;
    setImporting(true);
    const pins = searchResults
      .filter((r) => selectedPins.has(r.pinId))
      .map((r) => ({ pinId: r.pinId, pinUrl: r.pinUrl, title: r.title }));

    // Mark all selected as processing
    setImportStatus((prev) => {
      const next = new Map(prev);
      for (const p of pins) next.set(p.pinId, "processing");
      return next;
    });

    try {
      const res = await fetch("/api/admin/pinterest-import", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pins,
          categoryId: selectedCategory[0]?.id,
          tagNames,
        }),
      });
      const data = await res.json();
      const results: Array<{ pinId: string; status: "ok" | "error"; error?: string; wallpaper?: Wallpaper }> = data.results ?? [];

      setImportStatus((prev) => {
        const next = new Map(prev);
        for (const r of results) next.set(r.pinId, r.status);
        return next;
      });
      setImportErrors((prev) => {
        const next = new Map(prev);
        for (const r of results) if (r.error) next.set(r.pinId, r.error);
        return next;
      });
      for (const r of results) {
        if (r.status === "ok" && r.wallpaper) onImported(r.wallpaper);
      }
    } catch {
      setImportStatus((prev) => {
        const next = new Map(prev);
        for (const p of pins) next.set(p.pinId, "error");
        return next;
      });
    }
    setImporting(false);
  };

  const okCount = Array.from(importStatus.values()).filter((s) => s === "ok").length;
  const errCount = Array.from(importStatus.values()).filter((s) => s === "error").length;

  // ── URL-mode handler ──────────────────────────────────────────────────────
  const handleUrlImport = async () => {
    if (!parsedUrls.length || urlRunning) return;
    setUrlRunning(true);
    setUrlResults(parsedUrls.map((url) => ({ url, status: "pending" })));
    const categoryId = selectedCategory[0]?.id;
    for (const url of parsedUrls) {
      setUrlResults((p) => p.map((r) => r.url === url ? { ...r, status: "processing" } : r));
      try {
        const res = await fetch("/api/admin/pinterest-scrape", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            urls: [url],
            ...(categoryId ? { categoryId } : {}),
            ...(tagNames.length ? { tagNames } : {}),
          }),
        });
        const data = await res.json();
        const result = data.results?.[0];
        if (!result) {
          setUrlResults((p) => p.map((r) => r.url === url ? { ...r, status: "error", error: "No response" } : r));
          continue;
        }
        setUrlResults((p) => p.map((r) => r.url === url ? { ...r, ...result } : r));
        if (result.status === "ok" && result.wallpaper) onImported(result.wallpaper);
      } catch {
        setUrlResults((p) => p.map((r) => r.url === url ? { ...r, status: "error", error: "Network error" } : r));
      }
    }
    setUrlRunning(false);
  };

  const urlDone = urlResults.filter((r) => r.status !== "pending" && r.status !== "processing").length;
  const urlOk = urlResults.filter((r) => r.status === "ok").length;
  const urlErr = urlResults.filter((r) => r.status === "error").length;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Mode toggle */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: surfaceDeep, border: `1px solid ${border}` }}>
        {([
          { id: "search" as ImportMode, label: "Search Pinterest", icon: (
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" /></svg>
          )},
          { id: "urls" as ImportMode, label: "Paste URLs", icon: (
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M12.586 4.586a2 2 0 1 1 2.828 2.828l-3 3a2 2 0 0 1-2.828 0 1 1 0 0 0-1.414 1.414 4 4 0 0 0 5.656 0l3-3a4 4 0 0 0-5.656-5.656l-1.5 1.5a1 1 0 1 0 1.414 1.414l1.5-1.5Zm-5 5a2 2 0 0 1 2.828 0 1 1 0 1 0 1.414-1.414 4 4 0 0 0-5.656 0l-3 3a4 4 0 1 0 5.656 5.656l1.5-1.5a1 1 0 1 0-1.414-1.414l-1.5 1.5a2 2 0 1 1-2.828-2.828l3-3Z" clipRule="evenodd" /></svg>
          )},
        ]).map(({ id, label, icon }) => {
          const isActive = mode === id;
          return (
            <button key={id} type="button" onClick={() => setMode(id)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-body text-xs font-medium cursor-pointer transition-all duration-200"
              style={{
                background: isActive ? `linear-gradient(135deg,rgba(139,92,246,0.25),rgba(217,70,239,0.15))` : "transparent",
                color: isActive ? "#e2d5ff" : textMuted,
                border: isActive ? `1px solid rgba(139,92,246,0.35)` : "1px solid transparent",
              }}>
              <span style={{ color: isActive ? accentPurple : textMuted }}>{icon}</span>
              {label}
            </button>
          );
        })}
      </div>

      {/* Shared category + tags */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <FieldLabel>Assign to Category {mode === "search" ? "" : "(optional)"}</FieldLabel>
          <CategoryCombobox
            categories={categories}
            selected={selectedCategory}
            onChange={(cats) => setSelectedCategory(cats.slice(-1))}
            onCreateCategory={onCreateCategory}
            placeholder="Pick or create a category…"
          />
        </div>
        <div>
          <FieldLabel>Tags (comma-separated)</FieldLabel>
          <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)}
            placeholder="naruto, live wallpaper, anime"
            className={inputCls} style={inputSt} />
          <p className="mt-1 font-body text-[0.625rem]" style={{ color: textDim }}>
            {tagNames.length > 0
              ? <><span style={{ color: "#a78bfa" }}>{tagNames.length}</span> tag{tagNames.length !== 1 ? "s" : ""} will be applied</>
              : "Tags help users search for these wallpapers"}
          </p>
        </div>
      </div>

      {mode === "search" ? (
        <>
          {/* Search input */}
          <div>
            <FieldLabel>Search Pinterest</FieldLabel>
            <div className="flex gap-2">
              <input value={query} onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSearch(); } }}
                disabled={searching || importing}
                placeholder='e.g. "Naruto Live Wallpaper 4K"'
                className={inputCls} style={inputSt} />
              <GradientBtn onClick={handleSearch} disabled={searching || !query.trim()}>
                {searching
                  ? <><div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />Searching…</>
                  : <>Search</>
                }
              </GradientBtn>
            </div>
            {searchError && (
              <p className="mt-1.5 font-body text-xs" style={{ color: "#f87171" }}>{searchError}</p>
            )}
          </div>

          {searchResults.length > 0 && (
            <>
              {/* Selection toolbar */}
              <div className="flex items-center justify-between flex-wrap gap-2 px-3 py-2 rounded-lg"
                style={{ background: surfaceDeep, border: `1px solid ${border}` }}>
                <span className="font-body text-xs" style={{ color: textMuted }}>
                  <span style={{ color: "white" }}>{searchResults.length}</span> results
                  {selectedPins.size > 0 && (
                    <> · <span style={{ color: "#ba9eff" }}>{selectedPins.size}</span> selected</>
                  )}
                </span>
                <div className="flex items-center gap-1.5">
                  <GhostBtn onClick={selectAllVideos}>Select all videos</GhostBtn>
                  <GhostBtn onClick={selectAll}>Select all</GhostBtn>
                  {selectedPins.size > 0 && <GhostBtn onClick={clearSelection}>Clear</GhostBtn>}
                </div>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                {searchResults.map((pin) => (
                  <PinThumb key={pin.pinId}
                    pin={pin}
                    selected={selectedPins.has(pin.pinId)}
                    status={importStatus.get(pin.pinId)}
                    onClick={() => togglePin(pin.pinId)} />
                ))}
              </div>

              {/* Failed-pin error list */}
              {importErrors.size > 0 && (
                <div className="rounded-xl overflow-hidden" style={{ background: surfaceDeep, border: `1px solid ${border}` }}>
                  <div className="px-4 py-2 font-body text-[0.6875rem] uppercase tracking-widest font-semibold border-b"
                    style={{ color: "#f87171", borderColor: "rgba(255,255,255,0.05)", background: "rgba(239,68,68,0.05)" }}>
                    {importErrors.size} pin{importErrors.size !== 1 ? "s" : ""} failed
                  </div>
                  <ul className="px-4 py-2 space-y-1">
                    {Array.from(importErrors.entries()).slice(0, 8).map(([pinId, err]) => (
                      <li key={pinId} className="font-mono text-[0.6875rem]" style={{ color: "rgba(248,113,113,0.85)" }}>
                        <span style={{ color: textDim }}>{pinId}</span> — {err}
                      </li>
                    ))}
                    {importErrors.size > 8 && (
                      <li className="font-body text-[0.625rem]" style={{ color: textDim }}>
                        …and {importErrors.size - 8} more
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Import action */}
              <div className="flex items-center gap-3 flex-wrap">
                <GradientBtn onClick={handleSearchImport} disabled={importing || selectedPins.size === 0}>
                  {importing
                    ? <><div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />Importing {selectedPins.size}…</>
                    : <>Import {selectedPins.size > 0 ? selectedPins.size : ""} selected</>
                  }
                </GradientBtn>
                {okCount > 0 && <span className="font-body text-xs font-medium" style={{ color: "#4ade80" }}>{okCount} imported</span>}
                {errCount > 0 && <span className="font-body text-xs font-medium" style={{ color: "#f87171" }}>{errCount} failed</span>}
              </div>
            </>
          )}
        </>
      ) : (
        <>
          {/* URL input */}
          <div>
            <FieldLabel>Pinterest Pin URLs — one per line or comma-separated</FieldLabel>
            <textarea value={text} onChange={(e) => setText(e.target.value)} disabled={urlRunning}
              placeholder={"https://www.pinterest.com/pin/123456789/\nhttps://pin.it/XXXXXXX"}
              rows={5} className={`${inputCls} resize-none font-mono text-[0.6875rem] leading-relaxed`}
              style={{ ...inputSt, opacity: urlRunning ? 0.6 : 1 }} />
            <p className="mt-1.5 font-body text-xs tabular-nums" style={{ color: textDim }}>
              {parsedUrls.length > 0
                ? <><span style={{ color: accentPurple }}>{parsedUrls.length}</span> URL{parsedUrls.length !== 1 ? "s" : ""} detected</>
                : "Paste Pinterest pin URLs above"}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <GradientBtn onClick={handleUrlImport} disabled={urlRunning || !parsedUrls.length}>
              {urlRunning
                ? <><div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />Importing…</>
                : <>Import {parsedUrls.length > 0 ? parsedUrls.length : ""} Pin{parsedUrls.length !== 1 ? "s" : ""}</>
              }
            </GradientBtn>
            {urlResults.length > 0 && !urlRunning && (
              <>
                {urlOk > 0 && <span className="font-body text-xs font-medium" style={{ color: "#4ade80" }}>{urlOk} imported</span>}
                {urlErr > 0 && <span className="font-body text-xs font-medium" style={{ color: "#f87171" }}>{urlErr} failed</span>}
                <button type="button" onClick={() => { setUrlResults([]); setText(""); }}
                  className="font-body text-xs cursor-pointer hover:text-text-main/60 transition-colors"
                  style={{ color: textDim }}>
                  Clear
                </button>
              </>
            )}
          </div>

          {urlResults.length > 0 && (
            <div className="rounded-xl overflow-hidden" style={{ background: surfaceDeep, border: `1px solid ${border}` }}>
              <div className="px-4 py-2.5 flex items-center justify-between border-b" style={{ borderColor: "rgba(255,255,255,0.05)", background: "rgba(6,14,32,0.4)" }}>
                <span className="font-body text-[0.6875rem] uppercase tracking-widest font-semibold" style={{ color: textMuted }}>Progress</span>
                <div className="flex items-center gap-3">
                  <div className="h-1.5 w-24 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${(urlDone / urlResults.length) * 100}%`, background: `linear-gradient(90deg,${accentPurple},${accentMagenta})` }} />
                  </div>
                  <span className="font-mono text-[0.6875rem] tabular-nums" style={{ color: textDim }}>{urlDone}/{urlResults.length}</span>
                </div>
              </div>
              <div className="px-4">{urlResults.map((r) => <PinRow key={r.url} result={r} />)}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Drop Zone ────────────────────────────────────────────────────────────────

// memo prevents re-renders when the parent's title/category/tags state updates —
// that was the flicker root cause (new blob URL → image reload on every keystroke)
const DropZone = memo(function DropZone({ file, onFile }: { file: File | null; onFile: (f: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [pasted, setPasted] = useState(false);

  // Stable blob URL — only recreated when `file` changes, not on parent re-renders
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const isVideo = file?.type.startsWith("video/");

  const onDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.type.startsWith("image/") || f.type.startsWith("video/"))) onFile(f);
  }, [onFile]);

  // Global paste — works anywhere on the page while Upload tab is mounted
  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.kind === "file" && (item.type.startsWith("image/") || item.type.startsWith("video/"))) {
          const f = item.getAsFile();
          if (!f) continue;
          const ext = item.type.split("/")[1] ?? "png";
          const named = new File([f], f.name || `pasted-${Date.now()}.${ext}`, { type: item.type });
          onFile(named);
          setPasted(true);
          setTimeout(() => setPasted(false), 1800);
          e.preventDefault();
          return;
        }
      }
    };
    document.addEventListener("paste", handler);
    return () => document.removeEventListener("paste", handler);
  }, [onFile]);

  return (
    <div className="flex flex-col h-full">
      {/* 9:16 portrait frame */}
      <div onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)} onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className="relative aspect-[9/16] w-full rounded-2xl overflow-hidden cursor-pointer group"
        style={{
          background: dragging
            ? "rgba(139,92,246,0.13)"
            : pasted
              ? "rgba(74,222,128,0.07)"
              : "rgba(6,14,32,0.6)",
          border: `2px dashed ${dragging ? accentPurple : pasted ? "#4ade80" : "rgba(255,255,255,0.1)"}`,
          boxShadow: dragging ? `0 0 32px rgba(139,92,246,0.25)` : pasted ? `0 0 24px rgba(74,222,128,0.2)` : "none",
          transition: "border-color 180ms, background 180ms, box-shadow 180ms",
        }}>
        <input ref={inputRef} type="file" accept="image/*,video/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />

        {file && preview ? (
          <>
            {isVideo
              ? <video src={preview} className="absolute inset-0 w-full h-full object-cover" muted loop playsInline />
              : <Image src={preview} alt="preview" fill sizes="280px" className="object-cover" unoptimized />
            }
            {/* Hover overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              style={{ background: "rgba(6,14,32,0.72)", backdropFilter: "blur(4px)" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8" style={{ color: "rgba(222,229,255,0.7)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
              </svg>
              <span className="font-body text-xs font-medium" style={{ color: "rgba(222,229,255,0.7)" }}>Click or paste to replace</span>
            </div>
            {/* File info chip */}
            <div className="absolute bottom-2 left-2 right-2 px-2.5 py-1.5 rounded-lg font-mono text-[0.5625rem] truncate"
              style={{ background: "rgba(6,14,32,0.88)", color: textMuted, backdropFilter: "blur(8px)" }}>
              {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-5">
            {/* Upload icon */}
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
              style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.22)" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-7 h-7" style={{ color: accentPurple }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
              </svg>
            </div>
            <div className="text-center space-y-2">
              <p className="font-body text-sm font-semibold" style={{ color: "rgba(222,229,255,0.8)" }}>Drop here</p>
              <div className="flex flex-col gap-1.5 items-center">
                <span className="font-body text-[0.6875rem]" style={{ color: textDim }}>or click to browse</span>
                <div className="flex items-center gap-1.5">
                  <div className="h-px w-6" style={{ background: "rgba(255,255,255,0.08)" }} />
                  <span className="font-body text-[0.625rem]" style={{ color: textDim }}>or</span>
                  <div className="h-px w-6" style={{ background: "rgba(255,255,255,0.08)" }} />
                </div>
                <kbd className="px-2 py-1 rounded-md font-mono text-[0.6875rem] font-medium"
                  style={{ background: "rgba(139,92,246,0.14)", border: "1px solid rgba(139,92,246,0.28)", color: "#ba9eff" }}>
                  Ctrl + V
                </kbd>
              </div>
            </div>
            <div className="absolute bottom-3 left-0 right-0 text-center">
              <span className="font-body text-[0.5625rem]" style={{ color: textDim }}>9:16 · max 100 MB</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

// ─── Upload Tab ───────────────────────────────────────────────────────────────

function UploadTab({
  categories, onUploaded, onCreateCategory,
}: {
  categories: WallpaperCategory[];
  onUploaded: (w: Wallpaper) => void;
  onCreateCategory: (name: string) => Promise<WallpaperCategory | null>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCats, setSelectedCats] = useState<WallpaperCategory[]>([]);
  const [tagsInput, setTagsInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleFile = useCallback((f: File) => setFile(f), []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) return;
    setError(""); setSuccess(""); setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", title);
    if (description.trim()) fd.append("description", description.trim());
    if (selectedCats.length) fd.append("categories", selectedCats.map(c => c.name).join(","));
    if (tagsInput.trim()) fd.append("tags", tagsInput.trim());
    const res = await fetch("/api/admin/wallpapers", { method: "POST", body: fd });
    if (res.ok) {
      const w = await res.json();
      onUploaded(w);
      setTitle(""); setDescription(""); setSelectedCats([]); setTagsInput(""); setFile(null);
      setSuccess("Uploaded successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Upload failed");
    }
    setUploading(false);
  };

  return (
    <div className="grid md:grid-cols-[220px_1fr] gap-6 items-start">
      <DropZone file={file} onFile={handleFile} />

      <form onSubmit={handleUpload} className="flex flex-col gap-4">
        {error && (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-none" style={{ color: "#f87171" }}>
              <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clipRule="evenodd" />
            </svg>
            <p className="font-body text-sm" style={{ color: "#f87171" }}>{error}</p>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl" style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)" }}>
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-none" style={{ color: "#4ade80" }}>
              <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
            </svg>
            <p className="font-body text-sm" style={{ color: "#4ade80" }}>{success}</p>
          </div>
        )}
        {!file && !error && (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl" style={{ background: "rgba(139,92,246,0.07)", border: "1px solid rgba(139,92,246,0.15)" }}>
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-none" style={{ color: "rgba(186,158,255,0.6)" }}>
              <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
            </svg>
            <p className="font-body text-xs" style={{ color: "rgba(186,158,255,0.7)" }}>
              Drop, click the preview, or <kbd className="px-1 py-0.5 rounded font-mono text-[0.625rem]" style={{ background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.3)", color: "#ba9eff" }}>Ctrl+V</kbd> paste a file
            </p>
          </div>
        )}

        <div>
          <FieldLabel>Title *</FieldLabel>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required
            placeholder="Wallpaper title…" className={inputCls} style={inputSt} />
        </div>

        <div>
          <FieldLabel>Description</FieldLabel>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
            placeholder="Optional description…"
            className={`${inputCls} resize-none leading-relaxed`} style={inputSt} />
          <p className="mt-1 font-body text-[0.625rem] text-right" style={{ color: textDim }}>{description.length}/500</p>
        </div>

        <div>
          <FieldLabel>Categories</FieldLabel>
          <CategoryCombobox
            categories={categories}
            selected={selectedCats}
            onChange={setSelectedCats}
            onCreateCategory={onCreateCategory}
          />
          <p className="mt-1 font-body text-[0.625rem]" style={{ color: textDim }}>Type to search · Enter to select · create new on the fly</p>
        </div>

        <div>
          <FieldLabel>Tags</FieldLabel>
          <input type="text" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)}
            placeholder="naruto, sasuke, shonen…" className={inputCls} style={inputSt} />
          <p className="mt-1 font-body text-[0.625rem]" style={{ color: textDim }}>Comma-separated</p>
        </div>

        <div className="mt-auto pt-1">
          <GradientBtn type="submit" disabled={uploading || !file || !title} className="w-full justify-center">
            {uploading
              ? <><div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />Uploading…</>
              : <><svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
                  <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
                </svg>
                Upload Wallpaper</>
            }
          </GradientBtn>
        </div>
      </form>
    </div>
  );
}

// ─── Wallpaper Delete Modal ───────────────────────────────────────────────────

function WallpaperDeleteModal({ w, onConfirm, onCancel, deleting }: {
  w: Wallpaper; onConfirm: () => void; onCancel: () => void; deleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(6,14,32,0.85)", backdropFilter: "blur(8px)" }}
      onClick={onCancel}>
      <div className="w-full max-w-sm rounded-2xl p-6 space-y-5"
        style={{ background: "rgba(9,19,40,0.98)", border: "1px solid rgba(239,68,68,0.22)", boxShadow: "0 24px 80px rgba(0,0,0,0.5)" }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-start gap-4">
          {/* Thumbnail */}
          <div className="w-11 h-[62px] rounded-xl overflow-hidden flex-none" style={{ background: surfaceDeep, border: `1px solid ${border}` }}>
            {w.type === "IMAGE"
              ? <Image src={w.fileUrl} alt={w.title} width={44} height={62} className="w-full h-full object-cover" />
              : <video src={w.fileUrl} className="w-full h-full object-cover" muted playsInline preload="metadata" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2.5"
              style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" style={{ color: "#f87171" }}>
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="font-headline text-sm font-bold text-text-main">Delete wallpaper?</h3>
            <p className="font-body text-xs mt-0.5 line-clamp-2" style={{ color: textMuted }}>{w.title}</p>
          </div>
        </div>

        <p className="font-body text-sm leading-relaxed" style={{ color: "rgba(222,229,255,0.45)" }}>
          This will permanently remove the wallpaper. This action cannot be undone.
        </p>

        <div className="flex gap-3">
          <button type="button" onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl font-body text-sm cursor-pointer transition-all hover:bg-white/5"
            style={{ color: textMuted, border: `1px solid ${border}` }}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={deleting}
            className="flex-1 py-2.5 rounded-xl font-headline text-sm font-semibold cursor-pointer transition-all hover:brightness-110 disabled:opacity-50"
            style={{ background: "rgba(239,68,68,0.16)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }}>
            {deleting
              ? <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-red-400/30 border-t-red-400 animate-spin inline-block" />
                  Deleting…
                </span>
              : "Delete Permanently"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Wallpaper Card ───────────────────────────────────────────────────────────

function WallpaperCard({ w, categories, onDelete, onUpdate, onCreateCategory }: {
  w: Wallpaper;
  categories: WallpaperCategory[];
  onDelete: (id: string) => void;
  onUpdate: (updated: Wallpaper) => void;
  onCreateCategory: (name: string) => Promise<WallpaperCategory | null>;
}) {
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing]           = useState(false);
  const [showDeleteModal, setShowDelete] = useState(false);
  const [deleting, setDeleting]         = useState(false);
  const [editTitle, setEditTitle]       = useState(w.title);
  const [editDesc, setEditDesc]         = useState(w.description ?? "");
  const [editCats, setEditCats]         = useState<WallpaperCategory[]>([]);
  const [editTags, setEditTags]         = useState("");
  const [saving, setSaving]             = useState(false);

  // Resolve current categories from whichever schema field is populated
  const resolveCats = (): WallpaperCategory[] => {
    if (w.categories && w.categories.length > 0) return w.categories;
    if (w.category) return [w.category];
    return [];
  };

  const openEdit = () => {
    setEditTitle(w.title);
    setEditDesc(w.description ?? "");
    setEditCats(resolveCats());
    setEditTags((w.tags ?? []).map(t => t.name).join(", "));
    setEditing(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    const tagNames = editTags.split(",").map(t => t.trim()).filter(Boolean);
    const res = await fetch("/api/admin/wallpapers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: w.id,
        title: editTitle,
        description: editDesc,
        categoryIds: editCats.map(c => c.id),
        tagNames,
      }),
    });
    if (res.ok) { onUpdate(await res.json()); setEditing(false); }
    setSaving(false);
  };

  return (
    <div className="rounded-xl overflow-hidden group relative"
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ background: surface, border: `1px solid ${hovered ? "rgba(139,92,246,0.35)" : border}`, transition: "border-color 200ms" }}>

      <div className="relative aspect-[9/16]" style={{ background: surfaceDeep }}>
        {w.type === "IMAGE"
          ? <Image src={w.fileUrl} alt={w.title} fill
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105" />
          : <video src={w.fileUrl} className="w-full h-full object-cover" muted loop playsInline />
        }

        {/* Hover overlay */}
        <div className="absolute inset-0 flex flex-col justify-between p-2.5 transition-opacity duration-200"
          style={{ opacity: hovered ? 1 : 0, background: "linear-gradient(to top,rgba(6,14,32,0.92) 0%,rgba(6,14,32,0.3) 50%,transparent 100%)" }}>
          <div className="flex justify-end gap-1.5">
            <button onClick={openEdit}
              className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-150 hover:scale-110"
              style={{ background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.4)" }}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} style={{ color: "#ba9eff" }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z" />
              </svg>
            </button>
            <button onClick={() => setShowDelete(true)}
              className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-150 hover:scale-110"
              style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} style={{ color: "#f87171" }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
          <div>
            <p className="font-body text-xs font-medium text-white truncate leading-tight">{w.title}</p>
            {(() => {
              const cats = w.categories?.length ? w.categories : w.category ? [w.category] : [];
              return cats.length > 0 ? (
                <div className="flex flex-wrap gap-1 mt-1">
                  {cats.slice(0, 2).map(c => (
                    <span key={c.id} className="font-body text-[0.5625rem] px-1.5 py-0.5 rounded"
                      style={{ background: "rgba(139,92,246,0.6)", color: "white" }}>{c.name}</span>
                  ))}
                  {cats.length > 2 && (
                    <span className="font-body text-[0.5625rem]" style={{ color: "rgba(186,158,255,0.7)" }}>+{cats.length - 2}</span>
                  )}
                </div>
              ) : null;
            })()}
            {w.description && (
              <p className="font-body text-[0.5625rem] mt-1 line-clamp-2" style={{ color: "rgba(222,229,255,0.5)" }}>{w.description}</p>
            )}
          </div>
        </div>

        {/* Type badge */}
        <span className="absolute top-1.5 right-1.5 p-1 rounded-md transition-opacity duration-200"
          style={{ background: "rgba(6,14,32,0.8)", backdropFilter: "blur(6px)", opacity: hovered ? 0 : 1 }}>
          {w.type === "VIDEO"
            ? <svg viewBox="0 0 16 16" fill="currentColor" className="w-2.5 h-2.5" style={{ color: "#ba9eff" }}><path d="M3 3.5A1.5 1.5 0 0 1 4.5 2h7A1.5 1.5 0 0 1 13 3.5v9A1.5 1.5 0 0 1 11.5 14h-7A1.5 1.5 0 0 1 3 12.5v-9Zm8.5 4.243V8l-3-1.757v3.514L11.5 8z" /></svg>
            : <svg viewBox="0 0 16 16" fill="currentColor" className="w-2.5 h-2.5" style={{ color: "rgba(222,229,255,0.45)" }}><path fillRule="evenodd" d="M2 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4Zm9.5 6.5-3-2.5-1.5 1.5-2-2.5-2 3H12l-.5-1.5Z" clipRule="evenodd" /></svg>
          }
        </span>
      </div>

      {/* Edit drawer — fixed right panel, escapes overflow:hidden so CategoryCombobox dropdown renders correctly */}
      {editing && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40"
            style={{ background: "rgba(6,10,28,0.6)", backdropFilter: "blur(4px)" }}
            onClick={() => setEditing(false)} />

          {/* Drawer */}
          <div className="fixed inset-y-0 right-0 z-50 w-96 max-w-[95vw] flex flex-col"
            style={{ background: "rgba(7,12,28,0.99)", borderLeft: "1px solid rgba(255,255,255,0.08)", boxShadow: "-24px 0 80px rgba(0,0,0,0.5)" }}>

            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b flex-none"
              style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(6,10,26,0.8)" }}>
              {/* Thumbnail */}
              <div className="w-9 h-[52px] rounded-lg overflow-hidden flex-none"
                style={{ background: surfaceDeep, border: `1px solid ${border}` }}>
                {w.type === "IMAGE"
                  ? <Image src={w.fileUrl} alt={w.title} width={36} height={52} className="w-full h-full object-cover" />
                  : <video src={w.fileUrl} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-headline text-sm font-bold text-text-main">Edit Wallpaper</p>
                <p className="font-body text-xs truncate mt-0.5" style={{ color: textMuted }}>{w.title}</p>
              </div>
              <button type="button" onClick={() => setEditing(false)} aria-label="Close"
                className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer flex-none transition-colors hover:bg-white/5"
                style={{ color: textMuted }}>
                <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                  <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                </svg>
              </button>
            </div>

            {/* Scrollable form */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
              <div>
                <label className="block font-body text-[0.625rem] uppercase tracking-widest font-semibold mb-1.5" style={{ color: textMuted }}>
                  Title *
                </label>
                <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                  className={`${inputCls}`} style={inputSt}
                  placeholder="Wallpaper title…" />
              </div>

              <div>
                <label className="block font-body text-[0.625rem] uppercase tracking-widest font-semibold mb-1.5" style={{ color: textMuted }}>
                  Description
                </label>
                <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={4}
                  className={`${inputCls} resize-none leading-relaxed`} style={inputSt}
                  placeholder="Optional description…" />
                <p className="mt-1 font-body text-[0.625rem] text-right tabular-nums" style={{ color: textDim }}>
                  {editDesc.length}/500
                </p>
              </div>

              <div>
                <label className="block font-body text-[0.625rem] uppercase tracking-widest font-semibold mb-1.5" style={{ color: textMuted }}>
                  Categories
                </label>
                <CategoryCombobox
                  categories={categories}
                  selected={editCats}
                  onChange={setEditCats}
                  onCreateCategory={onCreateCategory}
                  placeholder="Search or create categories…"
                />
                <p className="mt-1.5 font-body text-[0.625rem]" style={{ color: textDim }}>
                  Type to search · Enter to select · create new on the fly
                </p>
              </div>

              <div>
                <label className="block font-body text-[0.625rem] uppercase tracking-widest font-semibold mb-1.5" style={{ color: textMuted }}>
                  Tags
                </label>
                <input
                  value={editTags}
                  onChange={e => setEditTags(e.target.value)}
                  placeholder="naruto, sasuke, anime…"
                  className={inputCls} style={inputSt}
                />
                <p className="mt-1.5 font-body text-[0.625rem]" style={{ color: textDim }}>
                  Comma-separated · new tags created automatically
                </p>
              </div>

              {/* File info (read-only) */}
              <div className="rounded-xl p-3 space-y-1.5" style={{ background: surfaceDeep, border: `1px solid ${border}` }}>
                <p className="font-body text-[0.625rem] uppercase tracking-widest font-semibold" style={{ color: textDim }}>File</p>
                <p className="font-mono text-[0.625rem] break-all" style={{ color: textMuted }}>{w.fileUrl.split("/").pop()}</p>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded font-body text-[0.5625rem] font-semibold uppercase"
                    style={{ background: w.type === "VIDEO" ? "rgba(139,92,246,0.18)" : "rgba(255,255,255,0.06)", color: w.type === "VIDEO" ? "#ba9eff" : textMuted }}>
                    {w.type}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 px-5 py-4 border-t flex-none"
              style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(6,10,26,0.8)" }}>
              <button type="button" onClick={() => setEditing(false)}
                className="flex-1 py-2.5 rounded-xl font-body text-sm cursor-pointer transition-all hover:bg-white/5"
                style={{ color: textMuted, border: `1px solid ${border}` }}>
                Cancel
              </button>
              <button type="button" onClick={saveEdit} disabled={saving || !editTitle.trim()}
                className="flex-1 py-2.5 rounded-xl font-headline text-sm font-semibold cursor-pointer transition-all hover:brightness-110 disabled:opacity-40"
                style={{ background: "linear-gradient(135deg,#8B5CF6,#D946EF)", color: "white" }}>
                {saving
                  ? <span className="flex items-center justify-center gap-2"><span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block" />Saving…</span>
                  : "Save Changes"
                }
              </button>
            </div>
          </div>
        </>
      )}

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <WallpaperDeleteModal
          w={w}
          deleting={deleting}
          onCancel={() => setShowDelete(false)}
          onConfirm={async () => {
            setDeleting(true);
            await onDelete(w.id);
            setDeleting(false);
            setShowDelete(false);
          }}
        />
      )}
    </div>
  );
}

// ─── Library Tab ──────────────────────────────────────────────────────────────

function LibraryTab({
  wallpapers, categories, loading, onDelete, onDeleteCat, onCreateCat, onUpdate,
}: {
  wallpapers: Wallpaper[];
  categories: WallpaperCategory[];
  loading: boolean;
  onDelete: (id: string) => void;
  onDeleteCat: (id: string) => void;
  onCreateCat: (name: string) => Promise<void>;
  onUpdate: (updated: Wallpaper) => void;
}) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "IMAGE" | "VIDEO">("ALL");
  const [catFilter, setCatFilter] = useState<string>("ALL");
  const [newCat, setNewCat] = useState("");
  const [catSaving, setCatSaving] = useState(false);

  const handleCreateCat = async () => {
    if (!newCat.trim() || catSaving) return;
    setCatSaving(true);
    await onCreateCat(newCat.trim());
    setNewCat("");
    setCatSaving(false);
  };

  const filtered = wallpapers.filter((w) => {
    const matchSearch = !search || w.title.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "ALL" || w.type === typeFilter;
    const cats = w.categories ?? [];
    const matchCat = catFilter === "ALL"
      || (catFilter === "NONE" && cats.length === 0)
      || cats.some(c => c.id === catFilter);
    return matchSearch && matchType && matchCat;
  });

  return (
    <div className="space-y-5">
      {/* Categories row */}
      <div className="rounded-xl p-4 space-y-3" style={{ background: surface, border: `1px solid ${border}` }}>
        <div className="flex items-center justify-between">
          <span className="font-body text-xs uppercase tracking-widest font-semibold" style={{ color: textMuted }}>Categories</span>
          <span className="font-mono text-xs tabular-nums" style={{ color: textDim }}>{categories.length}</span>
        </div>
        {/* Add new */}
        <div className="flex gap-2">
          <input value={newCat} onChange={(e) => setNewCat(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleCreateCat())}
            placeholder="New category name…" className={`${inputCls} flex-1 text-xs py-2`} style={inputSt} />
          <GhostBtn onClick={handleCreateCat} disabled={catSaving || !newCat.trim()}>
            {catSaving ? "…" : "+ Add"}
          </GhostBtn>
        </div>
        {/* Pills */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <div key={c.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full cursor-pointer group/cat transition-all duration-150 hover:border-primary/40"
                style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.18)" }}>
                <span className="font-body text-[0.6875rem]" style={{ color: "#ba9eff" }}>{c.name}</span>
                {c.count !== undefined && (
                  <span className="font-mono text-[0.5625rem] tabular-nums" style={{ color: "rgba(186,158,255,0.4)" }}>{c.count}</span>
                )}
                <button onClick={() => onDeleteCat(c.id)}
                  className="opacity-0 group-hover/cat:opacity-100 cursor-pointer transition-opacity duration-150 hover:text-red-400"
                  style={{ color: "rgba(186,158,255,0.45)", lineHeight: 1 }}>
                  <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                    <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filters toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: textDim }}>
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
          </svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search wallpapers…" className={`${inputCls} pl-9`} style={inputSt} />
        </div>

        {/* Type filter */}
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: surfaceDeep, border: `1px solid ${border}` }}>
          {(["ALL", "IMAGE", "VIDEO"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTypeFilter(t)}
              className="px-3 py-1.5 rounded-md font-body text-xs font-medium cursor-pointer transition-all duration-150"
              style={{
                background: typeFilter === t ? "rgba(139,92,246,0.2)" : "transparent",
                color: typeFilter === t ? "#ba9eff" : textMuted,
                border: typeFilter === t ? "1px solid rgba(139,92,246,0.3)" : "1px solid transparent",
              }}>
              {t}
            </button>
          ))}
        </div>

        {/* Category filter */}
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}
          className="px-3 py-2 rounded-lg font-body text-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
          style={{ background: surfaceDeep, border: `1px solid ${border}`, color: textMuted }}>
          <option value="ALL">All categories</option>
          <option value="NONE">Uncategorized</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <span className="font-mono text-xs tabular-nums ml-auto" style={{ color: textDim }}>
          {filtered.length} / {wallpapers.length}
        </span>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="rounded-xl overflow-hidden animate-pulse" style={{ background: surface }}>
              <div className="aspect-[9/16]" style={{ background: surfaceDeep }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 rounded-xl" style={{ background: surface, border: `1px solid ${border}` }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: surfaceDeep }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" className="w-7 h-7" style={{ color: textDim }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="font-body text-sm font-medium" style={{ color: "rgba(222,229,255,0.5)" }}>
              {wallpapers.length === 0 ? "No wallpapers yet" : "No results match your filters"}
            </p>
            <p className="font-body text-xs mt-1" style={{ color: textDim }}>
              {wallpapers.length === 0 ? "Import from Pinterest or upload a file" : "Try adjusting the search or filters"}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filtered.map((w) => (
            <WallpaperCard key={w.id} w={w} categories={categories} onDelete={onDelete} onUpdate={onUpdate} onCreateCategory={async (name) => { await onCreateCat(name); return categories.find(c => c.name === name) ?? null; }} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminWallpapersPage() {
  const [tab, setTab] = useState<Tab>("library");
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [categories, setCategories] = useState<WallpaperCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/wallpapers").then((r) => r.json()),
      fetch("/api/admin/wallpaper-categories").then((r) => r.json()),
    ]).then(([ws, cats]) => {
      setWallpapers(Array.isArray(ws) ? ws : []);
      setCategories(Array.isArray(cats) ? cats : []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const addWallpaper = (w: Wallpaper) => setWallpapers((p) => [w, ...p]);

  const deleteWallpaper = async (id: string) => {
    const res = await fetch(`/api/admin/wallpapers?id=${id}`, { method: "DELETE" });
    if (res.ok) setWallpapers((p) => p.filter((w) => w.id !== id));
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Delete this category? Wallpapers will be uncategorized.")) return;
    const res = await fetch(`/api/admin/wallpaper-categories?id=${id}`, { method: "DELETE" });
    if (res.ok) setCategories((p) => p.filter((c) => c.id !== id));
  };

  const createCategory = async (name: string): Promise<WallpaperCategory | null> => {
    const res = await fetch("/api/admin/wallpaper-categories", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const cat = await res.json();
      setCategories((p) => [...p, cat].sort((a, b) => a.name.localeCompare(b.name)));
      return cat;
    }
    return null;
  };

  const updateWallpaper = (updated: Wallpaper) =>
    setWallpapers((p) => p.map((w) => w.id === updated.id ? updated : w));

  const images = wallpapers.filter((w) => w.type === "IMAGE").length;
  const videos = wallpapers.filter((w) => w.type === "VIDEO").length;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="flex-1">
          <h1 className="font-headline text-3xl font-bold text-text-main tracking-tight">Wallpapers</h1>
          <p className="font-body text-sm mt-1" style={{ color: textMuted }}>
            Manage your image and video wallpaper library
          </p>
        </div>
        {!loading && (
          <div className="flex items-center gap-2 flex-wrap">
            <StatChip label="Total" value={wallpapers.length} accent="#ba9eff" />
            <StatChip label="Images" value={images} accent="rgba(222,229,255,0.7)" />
            <StatChip label="Videos" value={videos} accent={accentPurple} />
            <StatChip label="Categories" value={categories.length} accent={accentMagenta} />
          </div>
        )}
      </div>

      {/* Tab nav */}
      <TabBar active={tab} onChange={setTab} counts={{ import: 0, upload: 0, library: wallpapers.length }} />

      {/* Tab panels */}
      <div className="rounded-xl p-5 md:p-6" style={{ background: surface, border: `1px solid ${border}` }}>
        {tab === "import" && (
          <PinterestImporter
            onImported={addWallpaper}
            categories={categories}
            onCreateCategory={createCategory}
          />
        )}
        {tab === "upload" && (
          <UploadTab categories={categories} onUploaded={addWallpaper} onCreateCategory={createCategory} />
        )}
        {tab === "library" && (
          <LibraryTab
            wallpapers={wallpapers}
            categories={categories}
            loading={loading}
            onDelete={deleteWallpaper}
            onDeleteCat={deleteCategory}
            onCreateCat={async (name) => { await createCategory(name); }}
            onUpdate={updateWallpaper}
          />
        )}
      </div>
    </div>
  );
}
