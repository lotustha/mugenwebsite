"use client";

import { useState } from "react";

const bdr = "rgba(255,255,255,0.07)";
const textMut = "rgba(222,229,255,0.4)";

export function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b" style={{ borderColor: bdr }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-4 py-4 text-left cursor-pointer group">
        <span className="font-body text-sm font-medium text-text-main group-hover:text-primary transition-colors">{q}</span>
        <svg viewBox="0 0 16 16" fill="currentColor"
          className={`w-4 h-4 flex-none transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          style={{ color: textMut }}>
          <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>
      {open && (
        <div className="pb-4">
          <p className="font-body text-sm leading-relaxed" style={{ color: textMut }}>{a}</p>
        </div>
      )}
    </div>
  );
}
