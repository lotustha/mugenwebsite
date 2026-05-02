"use client";

import Link from "next/link";
import { useState, FormEvent } from "react";

const EXPLORE = [
  { href: "/anime",      label: "Anime"      },
  { href: "/wallpapers", label: "Wallpapers" },
  { href: "/news",       label: "News"       },
  { href: "/apps",       label: "Our Apps"   },
];

const COMPANY = [
  { href: "/",               label: "Home"           },
  { href: "/support",        label: "Support"        },
  { href: "/dmca",           label: "DMCA"           },
];

const LEGAL = [
  { href: "/privacy-policy",   label: "Privacy Policy"   },
  { href: "/terms-of-service", label: "Terms of Service" },
];

export default function Footer() {
  const [email, setEmail]         = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading]     = useState(false);

  const handleSubscribe = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) { setSubscribed(true); setEmail(""); }
    } catch {}
    setLoading(false);
  };

  return (
    <footer className="hidden md:block border-t" style={{ background: "rgba(6,3,18,0.98)", borderColor: "rgba(255,255,255,0.06)" }}>

      {/* ── Main grid ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10">

          {/* Brand */}
          <div className="col-span-2 lg:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,#8B5CF6,#D946EF)" }}>
                <svg viewBox="0 0 16 16" fill="white" className="w-4 h-4">
                  <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 2a5 5 0 1 1 0 10A5 5 0 0 1 8 3Zm-.75 2.5v2.75l2.25 1.35-.5.83-2.75-1.65V7.5h1Z" />
                </svg>
              </div>
              <span className="font-headline text-lg font-bold text-white">MugenAnime</span>
            </div>
            <p className="font-body text-sm leading-relaxed mb-6" style={{ color: "rgba(222,229,255,0.45)" }}>
              Your gateway to thousands of anime titles. Stream in HD, download for offline, track your watchlist — all free.
            </p>

            {/* Newsletter */}
            <p className="font-body text-xs uppercase tracking-widest font-semibold mb-3"
              style={{ color: "rgba(222,229,255,0.25)" }}>
              Stay Updated
            </p>
            {subscribed ? (
              <div className="flex items-center gap-2 text-sm" style={{ color: "#34d399" }}>
                <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm11.78-1.72a.75.75 0 0 0-1.06-1.06L7 8.94 5.28 7.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.06 0l4.25-4.25Z" clipRule="evenodd" />
                </svg>
                <span className="font-body">You&apos;re subscribed!</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="flex-1 px-3.5 py-2.5 rounded-xl font-body text-sm text-white/80 placeholder:text-white/20 outline-none focus:ring-1 focus:ring-primary/40 min-w-0"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                />
                <button type="submit" disabled={loading}
                  className="px-4 py-2.5 rounded-xl font-headline text-sm font-semibold text-white cursor-pointer transition-all hover:brightness-110 disabled:opacity-50 flex-none"
                  style={{ background: "linear-gradient(135deg,#8B5CF6,#D946EF)" }}>
                  {loading ? "…" : "Go"}
                </button>
              </form>
            )}
          </div>

          {/* Explore */}
          <div>
            <p className="font-body text-[0.625rem] uppercase tracking-widest font-semibold mb-4"
              style={{ color: "rgba(222,229,255,0.25)" }}>
              Explore
            </p>
            <ul className="space-y-3">
              {EXPLORE.map(l => (
                <li key={l.href}>
                  <Link href={l.href}
                    className="font-body text-sm transition-colors duration-150 hover:text-white"
                    style={{ color: "rgba(222,229,255,0.5)" }}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <p className="font-body text-[0.625rem] uppercase tracking-widest font-semibold mb-4"
              style={{ color: "rgba(222,229,255,0.25)" }}>
              Company
            </p>
            <ul className="space-y-3">
              {COMPANY.map(l => (
                <li key={l.href}>
                  <Link href={l.href}
                    className="font-body text-sm transition-colors duration-150 hover:text-white"
                    style={{ color: "rgba(222,229,255,0.5)" }}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="font-body text-[0.625rem] uppercase tracking-widest font-semibold mb-4"
              style={{ color: "rgba(222,229,255,0.25)" }}>
              Legal
            </p>
            <ul className="space-y-3">
              {LEGAL.map(l => (
                <li key={l.href}>
                  <Link href={l.href}
                    className="font-body text-sm transition-colors duration-150 hover:text-white"
                    style={{ color: "rgba(222,229,255,0.5)" }}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-body text-xs" style={{ color: "rgba(222,229,255,0.25)" }}>
            © {new Date().getFullYear()} MugenAnime. All rights reserved.
          </p>
          <p className="font-body text-xs" style={{ color: "rgba(222,229,255,0.2)" }}>
            For entertainment purposes only. All anime content belongs to their respective owners.
          </p>
        </div>
      </div>
    </footer>
  );
}
