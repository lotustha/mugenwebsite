"use client";

interface PaginationProps {
  page: number;
  pages: number;
  total?: number;
  onChange: (p: number) => void;
}

const btn = (active: boolean, disabled: boolean) => ({
  background:  active   ? "linear-gradient(135deg,#8B5CF6,#D946EF)" : "rgba(9,19,40,0.6)",
  color:       active   ? "white"                                    : "rgba(222,229,255,0.55)",
  border:      active   ? "1px solid rgba(139,92,246,0.5)"          : "1px solid rgba(255,255,255,0.07)",
  opacity:     disabled ? 0.35                                       : 1,
  cursor:      disabled ? "default" : "pointer",
});

export default function Pagination({ page, pages, total, onChange }: PaginationProps) {
  if (pages <= 1) return null;

  // Build visible page range: always show first, last, and 2 around current
  const visible = new Set<number>();
  visible.add(1);
  visible.add(pages);
  for (let i = Math.max(1, page - 2); i <= Math.min(pages, page + 2); i++) visible.add(i);
  const sorted = [...visible].sort((a, b) => a - b);

  // Insert null for gaps
  const items: (number | null)[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) items.push(null);
    items.push(sorted[i]);
  }

  return (
    <div className="flex flex-col items-center gap-3 pt-2">
      {/* Desktop: full page buttons */}
      <div className="hidden sm:flex items-center gap-1.5">
        {/* Prev */}
        <button
          onClick={() => onChange(page - 1)} disabled={page === 1}
          className="flex items-center gap-1 px-3 py-2 rounded-xl font-body text-sm transition-all duration-150"
          style={btn(false, page === 1)}>
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
            <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 0 1 0 1.06L7.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L5.47 8.53a.75.75 0 0 1 0-1.06l3.25-3.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
          </svg>
          Prev
        </button>

        {/* Page numbers */}
        {items.map((p, i) =>
          p === null ? (
            <span key={`gap-${i}`} className="w-8 text-center font-body text-sm"
              style={{ color: "rgba(222,229,255,0.22)" }}>…</span>
          ) : (
            <button key={p} onClick={() => onChange(p)}
              className="w-9 h-9 rounded-xl font-headline text-sm font-semibold transition-all duration-150"
              style={btn(p === page, false)}>
              {p}
            </button>
          )
        )}

        {/* Next */}
        <button
          onClick={() => onChange(page + 1)} disabled={page === pages}
          className="flex items-center gap-1 px-3 py-2 rounded-xl font-body text-sm transition-all duration-150"
          style={btn(false, page === pages)}>
          Next
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
            <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Mobile: prev / page info / next */}
      <div className="flex sm:hidden items-center gap-3">
        <button onClick={() => onChange(page - 1)} disabled={page === 1}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-body text-sm transition-all"
          style={btn(false, page === 1)}>
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 0 1 0 1.06L7.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L5.47 8.53a.75.75 0 0 1 0-1.06l3.25-3.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
          </svg>
          Prev
        </button>

        <span className="font-body text-sm" style={{ color: "rgba(222,229,255,0.45)" }}>
          {page} / {pages}
        </span>

        <button onClick={() => onChange(page + 1)} disabled={page === pages}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-body text-sm transition-all"
          style={btn(false, page === pages)}>
          Next
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Total count */}
      {total !== undefined && (
        <p className="font-body text-xs" style={{ color: "rgba(222,229,255,0.22)" }}>
          {total.toLocaleString()} total
        </p>
      )}
    </div>
  );
}
