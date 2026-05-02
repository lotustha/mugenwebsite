"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

// ─── Primary tabs (always visible) ────────────────────────────────────────────
const PRIMARY = [
  {
    href: "/admin", exact: true, label: "Dashboard",
    icon: (a: boolean) => <svg viewBox="0 0 24 24" fill={a ? "currentColor" : "none"} stroke="currentColor" strokeWidth={a ? 0 : 1.75} className="w-5 h-5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  },
  {
    href: "/admin/posts", label: "Posts",
    icon: (a: boolean) => <svg viewBox="0 0 24 24" fill={a ? "currentColor" : "none"} stroke="currentColor" strokeWidth={a ? 0 : 1.75} className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
  },
  {
    href: "/admin/wallpapers", label: "Wallpapers",
    icon: (a: boolean) => <svg viewBox="0 0 24 24" fill={a ? "currentColor" : "none"} stroke="currentColor" strokeWidth={a ? 0 : 1.75} className="w-5 h-5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  },
  {
    href: "/admin/rss", label: "RSS",
    icon: (a: boolean) => <svg viewBox="0 0 24 24" fill={a ? "currentColor" : "none"} stroke="currentColor" strokeWidth={a ? 0 : 1.75} className="w-5 h-5"><circle cx="5" cy="19" r="2"/><path strokeLinecap="round" d="M5 11a8 8 0 0 1 8 8"/><path strokeLinecap="round" d="M5 6a13 13 0 0 1 13 13"/></svg>,
  },
];

// ─── Secondary items (inside More drawer) ─────────────────────────────────────
const SECONDARY = [
  { href: "/admin/apps",                label: "Apps",             color: "#a78bfa" },
  { href: "/admin/in-app-messages",     label: "In-App Messages",  color: "#60a5fa" },
  { href: "/admin/income",              label: "Ad Revenue",       color: "#34d399" },
  { href: "/admin/categories",          label: "Categories",       color: "rgba(222,229,255,0.6)" },
  { href: "/admin/tags",                label: "Tags",             color: "rgba(222,229,255,0.6)" },
  { href: "/admin/wallpaper-categories",label: "W. Categories",    color: "rgba(222,229,255,0.6)" },
  { href: "/admin/settings",            label: "Settings",         color: "#fbbf24" },
];

export default function AdminBottomNav({ userEmail }: { userEmail: string }) {
  const pathname  = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/admin/login";
  };

  const anySecondaryActive = SECONDARY.some(s => pathname.startsWith(s.href));

  return (
    <>
      {/* ── More drawer backdrop ── */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={() => setOpen(false)} />
      )}

      {/* ── More drawer ── */}
      <div className="fixed left-0 right-0 z-50 md:hidden transition-transform duration-300"
        style={{
          bottom: open ? "64px" : "-100%",
          background: "rgba(9,14,30,0.97)",
          backdropFilter: "blur(24px)",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "20px 20px 0 0",
          boxShadow: "0 -16px 48px rgba(0,0,0,0.5)",
          transform: open ? "translateY(0)" : "translateY(100%)",
        }}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
        </div>

        {/* User info */}
        <div className="px-5 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <p className="font-body text-xs text-white/40">Signed in as</p>
          <p className="font-body text-sm text-white/80 truncate">{userEmail}</p>
        </div>

        {/* Secondary nav items */}
        <div className="px-3 py-2 grid grid-cols-2 gap-1">
          {SECONDARY.map(item => {
            const active = pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all cursor-pointer"
                style={{
                  background: active ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.04)",
                  color:      active ? "#c4b5fd" : item.color,
                  border:     active ? "1px solid rgba(139,92,246,0.25)" : "1px solid transparent",
                }}>
                <span className="font-body text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Divider + actions */}
        <div className="px-5 py-3 border-t flex items-center justify-between"
          style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <Link href="/" onClick={() => setOpen(false)}
            className="flex items-center gap-2 font-body text-sm cursor-pointer"
            style={{ color: "rgba(222,229,255,0.4)" }}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
              <path d="M9 2H3.5A1.5 1.5 0 0 0 2 3.5v9A1.5 1.5 0 0 0 3.5 14H10a1.5 1.5 0 0 0 1.5-1.5V9" />
              <path strokeLinecap="round" d="M7 9l5-5M8 4h4v4" />
            </svg>
            View Site
          </Link>
          <button onClick={signOut}
            className="flex items-center gap-2 font-body text-sm cursor-pointer transition-colors hover:text-red-400"
            style={{ color: "rgba(248,113,113,0.6)" }}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
              <path strokeLinecap="round" d="M10 3h2.5A1.5 1.5 0 0 1 14 4.5v7A1.5 1.5 0 0 1 12.5 13H10M7 10.5l3-3m0 0L7 4.5M10 7.5H2" />
            </svg>
            Sign Out
          </button>
        </div>

        {/* Safe area spacer */}
        <div style={{ height: "env(safe-area-inset-bottom)" }} />
      </div>

      {/* ── Bottom nav bar ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden flex items-stretch h-16"
        style={{
          background: "rgba(6,10,24,0.95)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 -4px 24px rgba(0,0,0,0.4)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}>

        {PRIMARY.map(tab => {
          const active = isActive(tab.href, tab.exact);
          return (
            <Link key={tab.href} href={tab.href}
              className="flex-1 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all active:scale-95"
              style={{ color: active ? "#a78bfa" : "rgba(222,229,255,0.35)" }}>
              <span className="relative flex flex-col items-center gap-1">
                {active && <span className="absolute -top-2.5 w-5 h-0.5 rounded-full"
                  style={{ background: "linear-gradient(90deg,#8B5CF6,#D946EF)" }} />}
                {tab.icon(active)}
              </span>
              <span className="font-body text-[0.5rem] font-medium">{tab.label}</span>
            </Link>
          );
        })}

        {/* More button */}
        <button type="button" onClick={() => setOpen(o => !o)}
          className="flex-1 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all active:scale-95"
          style={{ color: open || anySecondaryActive ? "#a78bfa" : "rgba(222,229,255,0.35)" }}>
          <span className="relative flex flex-col items-center gap-1">
            {(open || anySecondaryActive) && <span className="absolute -top-2.5 w-5 h-0.5 rounded-full"
              style={{ background: "linear-gradient(90deg,#8B5CF6,#D946EF)" }} />}
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M3 6.75A.75.75 0 0 1 3.75 6h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 6.75ZM3 12a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 12Zm0 5.25a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
            </svg>
          </span>
          <span className="font-body text-[0.5rem] font-medium">More</span>
        </button>
      </nav>
    </>
  );
}
