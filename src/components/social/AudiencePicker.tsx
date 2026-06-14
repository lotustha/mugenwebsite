"use client";

import { useEffect, useRef, useState } from "react";
import type { PostVisibility } from "@/lib/social-client";

function GlobeIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
    </svg>
  );
}
function FriendsIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function LockIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export const AUDIENCE: Record<
  PostVisibility,
  { label: string; desc: string; Icon: (p: { size?: number }) => React.ReactElement }
> = {
  PUBLIC: { label: "Public", desc: "Anyone on MugenAnime", Icon: GlobeIcon },
  FOLLOWERS: { label: "Followers", desc: "People who follow you", Icon: FriendsIcon },
  PRIVATE: { label: "Only me", desc: "Only you can see this", Icon: LockIcon },
};

const ORDER: PostVisibility[] = ["PUBLIC", "FOLLOWERS", "PRIVATE"];

/** Facebook-style audience selector: a pill button that opens a 3-option menu. */
export default function AudiencePicker({
  value,
  onChange,
}: {
  value: PostVisibility;
  onChange: (v: PostVisibility) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const current = AUDIENCE[value];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="bg-brand-soft text-brand inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      >
        <current.Icon size={13} />
        {current.label}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="glass-dark absolute left-0 top-full z-40 mt-2 w-60 overflow-hidden rounded-2xl border border-outline-variant p-1.5 shadow-xl">
          <p className="px-3 py-1.5 text-xs font-semibold text-text-main/50">Who can see this?</p>
          {ORDER.map((key) => {
            const opt = AUDIENCE[key];
            const active = key === value;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  onChange(key);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${
                  active ? "bg-brand-soft" : "hover:bg-white/5"
                }`}
              >
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${active ? "text-brand bg-white/5" : "bg-white/5 text-text-main/70"}`}>
                  <opt.Icon size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-text-main">{opt.label}</span>
                  <span className="block truncate text-xs text-text-main/50">{opt.desc}</span>
                </span>
                {active && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="text-brand">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Tiny inline audience indicator (icon only) for the post header. */
export function AudienceIcon({ visibility, size = 12 }: { visibility: PostVisibility; size?: number }) {
  const { Icon, label } = AUDIENCE[visibility];
  return (
    <span title={label} aria-label={label} className="inline-flex items-center text-text-main/45">
      <Icon size={size} />
    </span>
  );
}
