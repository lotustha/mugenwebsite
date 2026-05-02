"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/",           label: "Home"       },
  { href: "/anime",      label: "Anime"      },
  { href: "/wallpapers", label: "Wallpapers" },
  { href: "/news",       label: "News"       },
  { href: "/apps",       label: "Apps"       },
];

// Liquid glass CSS — Apple WWDC 2025 aesthetic
const glass = {
  base: {
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(40px) saturate(200%)",
    WebkitBackdropFilter: "blur(40px) saturate(200%)",
    border: "1px solid rgba(255,255,255,0.10)",
    boxShadow: [
      "inset 0 0.5px 0 rgba(255,255,255,0.22)",   // top specular highlight
      "inset 0 -0.5px 0 rgba(255,255,255,0.06)",  // bottom subtle edge
      "0 8px 40px rgba(0,0,0,0.45)",              // depth shadow
      "0 2px 8px rgba(139,92,246,0.08)",          // purple tint glow
    ].join(", "),
  },
  scrolled: {
    background: "rgba(255,255,255,0.08)",
    backdropFilter: "blur(40px) saturate(220%)",
    WebkitBackdropFilter: "blur(40px) saturate(220%)",
    border: "1px solid rgba(255,255,255,0.13)",
    boxShadow: [
      "inset 0 0.5px 0 rgba(255,255,255,0.28)",
      "inset 0 -0.5px 0 rgba(255,255,255,0.07)",
      "0 12px 48px rgba(0,0,0,0.55)",
      "0 2px 12px rgba(139,92,246,0.12)",
    ].join(", "),
  },
};

export default function Navbar() {
  const [isOpen, setIsOpen]     = useState(false);
  const [hidden, setHidden]     = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const lastScrollY             = useRef(0);
  const pathname                = usePathname();

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 20);
      if (y < 10)                      setHidden(false);
      else if (y > lastScrollY.current){ setHidden(true); setIsOpen(false); }
      else                              setHidden(false);
      lastScrollY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const currentGlass = scrolled ? glass.scrolled : glass.base;

  return (
    <>
      {/* Floating liquid glass navbar */}
      <div
        className={`fixed z-50 transition-transform duration-300 ${hidden ? "-translate-y-[120%]" : "translate-y-0"}`}
        style={{ top: 16, left: 16, right: 16 }}
      >
        <nav
          className="rounded-2xl px-4"
          style={{
            ...currentGlass,
            transition: "background 300ms, box-shadow 300ms, border-color 300ms",
          }}
        >
          <div className="mx-auto max-w-6xl">
            <div className="flex h-14 items-center justify-between gap-6">

              {/* ── Logo ── */}
              <Link href="/" className="flex items-center gap-2 flex-none group">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-105"
                  style={{
                    background: "linear-gradient(135deg,rgba(139,92,246,0.9),rgba(217,70,239,0.9))",
                    boxShadow: "inset 0 0.5px 0 rgba(255,255,255,0.4), 0 4px 12px rgba(139,92,246,0.5)",
                    border: "1px solid rgba(255,255,255,0.2)",
                  }}>
                  <svg viewBox="0 0 16 16" fill="white" className="w-4 h-4" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }}>
                    <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 2a5 5 0 1 1 0 10A5 5 0 0 1 8 3Zm-.75 2.5v2.75l2.25 1.35-.5.83-2.75-1.65V7.5h1Z" />
                  </svg>
                </div>
                <span className="font-headline text-[1.1rem] font-bold tracking-tight text-white/90 group-hover:text-white transition-colors duration-150">
                  Mugen
                </span>
              </Link>

              {/* ── Desktop nav links ── */}
              <div className="hidden md:flex items-center gap-0.5 flex-1 justify-center">
                {NAV_LINKS.map(({ href, label }) => {
                  const active = isActive(href);
                  return (
                    <Link key={href} href={href}
                      className="relative px-3.5 py-1.5 font-body text-sm font-medium rounded-xl transition-all duration-150 cursor-pointer"
                      style={{
                        color: active ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.45)",
                        background: active
                          ? "rgba(255,255,255,0.09)"
                          : "transparent",
                        boxShadow: active
                          ? "inset 0 0.5px 0 rgba(255,255,255,0.18), inset 0 -0.5px 0 rgba(0,0,0,0.1)"
                          : "none",
                        border: active
                          ? "1px solid rgba(255,255,255,0.1)"
                          : "1px solid transparent",
                      }}
                    >
                      {label}
                    </Link>
                  );
                })}
              </div>

              {/* ── CTA + hamburger ── */}
              <div className="flex items-center gap-2 flex-none">
                {/* Get App — liquid glass button */}
                <Link href="/apps"
                  className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl font-headline text-sm font-semibold cursor-pointer transition-all duration-200 hover:brightness-110 active:scale-[0.96]"
                  style={{
                    background: "linear-gradient(135deg,rgba(139,92,246,0.75),rgba(217,70,239,0.75))",
                    color: "white",
                    border: "1px solid rgba(255,255,255,0.2)",
                    boxShadow: "inset 0 0.5px 0 rgba(255,255,255,0.3), 0 4px 16px rgba(139,92,246,0.35)",
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                  }}>
                  <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v8.5A2.25 2.25 0 0 0 8.25 14.5h1.5A2.25 2.25 0 0 0 12 12.25v-8.5A2.25 2.25 0 0 0 10.5 1.5ZM8.25 3h2.25a.75.75 0 0 1 .75.75v.5H7.5v-.5A.75.75 0 0 1 8.25 3Zm1.125 9.75a.875.875 0 1 1 0-1.75.875.875 0 0 1 0 1.75Z" />
                  </svg>
                  Get App
                </Link>

                {/* Mobile hamburger */}
                <button
                  onClick={() => setIsOpen(o => !o)}
                  aria-label="Toggle menu"
                  className="flex md:hidden w-9 h-9 items-center justify-center rounded-xl cursor-pointer transition-all duration-150"
                  style={{
                    color: "rgba(255,255,255,0.65)",
                    background: isOpen ? "rgba(255,255,255,0.1)" : "transparent",
                    border: "1px solid " + (isOpen ? "rgba(255,255,255,0.15)" : "transparent"),
                  }}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    {isOpen
                      ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      : <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />}
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* ── Mobile menu — separate floating glass panel ── */}
        <div
          className="md:hidden mt-2 rounded-2xl overflow-hidden transition-all duration-300"
          style={{
            maxHeight: isOpen ? "400px" : "0px",
            opacity: isOpen ? 1 : 0,
            ...(isOpen ? {
              background: "rgba(11,4,22,0.75)",
              backdropFilter: "blur(40px) saturate(200%)",
              WebkitBackdropFilter: "blur(40px) saturate(200%)",
              border: "1px solid rgba(255,255,255,0.10)",
              boxShadow: [
                "inset 0 0.5px 0 rgba(255,255,255,0.18)",
                "0 16px 48px rgba(0,0,0,0.5)",
              ].join(", "),
            } : {}),
          }}
        >
          <div className="p-3 space-y-1">
            {NAV_LINKS.map(({ href, label }) => {
              const active = isActive(href);
              return (
                <Link key={href} href={href} onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl font-body text-sm font-medium cursor-pointer transition-all duration-150"
                  style={{
                    color: active ? "white" : "rgba(255,255,255,0.5)",
                    background: active ? "rgba(255,255,255,0.09)" : "transparent",
                    border: active ? "1px solid rgba(255,255,255,0.1)" : "1px solid transparent",
                    boxShadow: active ? "inset 0 0.5px 0 rgba(255,255,255,0.15)" : "none",
                  }}>
                  {active && (
                    <span className="w-1 h-4 rounded-full flex-none"
                      style={{ background: "linear-gradient(180deg,rgba(139,92,246,0.9),rgba(217,70,239,0.9))" }} />
                  )}
                  {label}
                </Link>
              );
            })}

            <div className="pt-1 pb-0.5">
              <Link href="/apps" onClick={() => setIsOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-headline text-sm font-semibold cursor-pointer transition-all active:scale-[0.98]"
                style={{
                  background: "linear-gradient(135deg,rgba(139,92,246,0.8),rgba(217,70,239,0.8))",
                  color: "white",
                  border: "1px solid rgba(255,255,255,0.18)",
                  boxShadow: "inset 0 0.5px 0 rgba(255,255,255,0.25), 0 4px 20px rgba(139,92,246,0.3)",
                }}>
                <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                  <path d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v8.5A2.25 2.25 0 0 0 8.25 14.5h1.5A2.25 2.25 0 0 0 12 12.25v-8.5A2.25 2.25 0 0 0 10.5 1.5ZM8.25 3h2.25a.75.75 0 0 1 .75.75v.5H7.5v-.5A.75.75 0 0 1 8.25 3Zm1.125 9.75a.875.875 0 1 1 0-1.75.875.875 0 0 1 0 1.75Z" />
                </svg>
                Get the App — Free
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
