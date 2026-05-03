"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  {
    href: "/",
    label: "Home",
    exact: true,
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor"
        strokeWidth={active ? 0 : 1.75} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M2.25 12l8.954-8.955a1.126 1.126 0 0 1 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    href: "/anime",
    label: "Anime",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor"
        strokeWidth={active ? 0 : 1.75} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
      </svg>
    ),
  },
  {
    href: "/wallpapers",
    label: "Walls",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor"
        strokeWidth={active ? 0 : 1.75} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
      </svg>
    ),
  },
  {
    href: "/news",
    label: "News",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor"
        strokeWidth={active ? 0 : 1.75} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z" />
      </svg>
    ),
  },
  {
    href: "/apps",
    label: "Apps",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor"
        strokeWidth={active ? 0 : 1.75} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18h3" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(40px) saturate(200%)",
        WebkitBackdropFilter: "blur(40px) saturate(200%)",
        borderTop: "1px solid rgba(255,255,255,0.11)",
        boxShadow: [
          "inset 0 0.5px 0 rgba(255,255,255,0.18)",  // top specular
          "0 -8px 40px rgba(0,0,0,0.45)",             // depth shadow
          "0 -2px 12px rgba(139,92,246,0.08)",         // purple tint
        ].join(", "),
        paddingBottom: "env(safe-area-inset-bottom)",
      }}>
      <div className="flex items-stretch h-16">
        {TABS.map(tab => {
          const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          return (
            <Link key={tab.href} href={tab.href}
              className="flex-1 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all duration-150 active:scale-95"
              style={{ color: active ? "#a78bfa" : "rgba(222,229,255,0.38)" }}>
              {/* Active indicator dot above icon */}
              <span className="relative flex flex-col items-center gap-1">
                {active && (
                  <span className="absolute -top-2.5 w-5 h-0.5 rounded-full"
                    style={{ background: "linear-gradient(90deg,#8B5CF6,#D946EF)" }} />
                )}
                {tab.icon(active)}
              </span>
              <span className="font-body text-[0.5625rem] font-medium leading-none">
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
