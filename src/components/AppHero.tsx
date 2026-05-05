"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────
type Screenshot = { url: string; caption?: string | null };

interface FeaturedApp {
  name: string;
  iconUrl?: string | null;
  screenshots: Screenshot[];
}

// ── Constants ──────────────────────────────────────────────────────────────────
const ANIME_CARDS = [
  "from-pink-500/50 to-purple-600/50",
  "from-blue-500/50 to-cyan-500/50",
  "from-orange-500/50 to-red-500/50",
  "from-green-500/50 to-teal-500/50",
  "from-violet-500/50 to-indigo-500/50",
  "from-amber-500/50 to-orange-500/50",
];

const FEATURES = ["HD Streaming", "Offline Download", "Sub & Dub", "No Ads"];
const STATS = [
  { value: "500K+", label: "Downloads" },
  { value: "4.8★", label: "Rating" },
  { value: "10K+", label: "Titles" },
];

// ── Fallback static screen ─────────────────────────────────────────────────────
function StaticScreen() {
  return (
    <div>
      <div className="px-4 pb-2 flex items-center justify-between">
        <div>
          <p className="font-headline text-[10px] text-primary font-bold tracking-widest uppercase">
            Mugen
          </p>
          <p className="font-body text-text-main/40 text-[8px]">For You</p>
        </div>
        <div className="w-6 h-6 rounded-full bg-linear-to-br from-primary/40 to-tertiary/40 border border-primary/30" />
      </div>

      <div className="mx-3 h-28 rounded-2xl overflow-hidden relative mb-3">
        <div className="absolute inset-0 bg-linear-to-br from-primary/30 via-surface-high to-tertiary/20" />
        <div className="absolute inset-0 bg-linear-to-t from-background/80 to-transparent" />
        <div className="absolute top-2 right-2">
          <span className="px-1.5 py-0.5 bg-secondary/90 rounded text-[6px] font-bold text-white">
            NEW
          </span>
        </div>
        <div className="absolute bottom-2 left-3">
          <p className="font-headline text-[9px] text-white font-bold">
            Attack on Titan
          </p>
          <p className="font-body text-white/50 text-[7px]">EP 87 • HD Quality</p>
        </div>
      </div>

      <div className="px-3 mb-2">
        <p className="font-body text-[8px] text-text-main/40 mb-2 uppercase tracking-widest">
          Trending Now
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {ANIME_CARDS.map((color, i) => (
            <div key={i} className={`h-12 rounded-xl bg-linear-to-br ${color}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Auto-scrolling app screenshots screen ──────────────────────────────────────
function AppScreen({ app }: { app: FeaturedApp }) {
  const shots = app.screenshots.slice(0, 6);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (shots.length <= 1) return;
    const id = setInterval(() => setCurrent((c) => (c + 1) % shots.length), 2800);
    return () => clearInterval(id);
  }, [shots.length]);

  return (
    <div className="h-full flex flex-col">
      {/* Mini header */}
      <div className="px-4 py-1.5 flex items-center justify-between flex-none">
        <div>
          <p className="font-headline text-[10px] text-primary font-bold tracking-widest uppercase">
            {app.name}
          </p>
          <p className="font-body text-text-main/40 text-[8px]">Screenshots</p>
        </div>
        {app.iconUrl ? (
          <div className="w-6 h-6 rounded-full overflow-hidden border border-primary/30 flex-none">
            <Image
              src={app.iconUrl}
              alt={app.name}
              width={24}
              height={24}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full bg-linear-to-br from-primary/40 to-tertiary/40 border border-primary/30" />
        )}
      </div>

      {/* Screenshot viewport */}
      <div className="flex-1 relative overflow-hidden min-h-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.45, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <Image
              src={shots[current].url}
              alt={shots[current].caption || `${app.name} screenshot ${current + 1}`}
              fill
              className="object-cover"
              sizes="240px"
            />
            <div className="absolute inset-x-0 bottom-0 h-14 bg-linear-to-t from-background/80 to-transparent pointer-events-none" />
          </motion.div>
        </AnimatePresence>

        {shots.length > 1 && (
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 z-10 pointer-events-none">
            {shots.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  i === current ? "w-4 h-1.5 bg-primary" : "w-1.5 h-1.5 bg-white/30"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Phone shell (wraps either screen) ─────────────────────────────────────────
function PhoneMockup({ app }: { app?: FeaturedApp | null }) {
  const showApp = !!(app && app.screenshots.length > 0);

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-primary/20 blur-[80px] scale-75 rounded-full" />

      <div className="relative w-[240px] h-[500px]">
        <div className="absolute inset-0 rounded-[2.8rem] bg-linear-to-b from-surface-high/80 to-surface-low border border-white/10 shadow-2xl overflow-hidden">
          <div className="absolute inset-0 m-[3px] rounded-[2.5rem] overflow-hidden bg-background flex flex-col">
            {/* Notch */}
            <div className="h-8 flex items-center justify-center flex-none">
              <div className="w-20 h-3.5 bg-surface-low rounded-full" />
            </div>

            {/* Screen content */}
            <div className="flex-1 overflow-hidden relative min-h-0">
              {showApp ? <AppScreen app={app!} /> : <StaticScreen />}
            </div>

            {/* Bottom nav */}
            <div className="h-12 bg-surface-low/95 backdrop-blur-md border-t border-white/5 flex items-center justify-around px-2 flex-none">
              <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
              </svg>
              <svg
                className="w-4 h-4 text-text-main/30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <svg
                className="w-4 h-4 text-text-main/30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <svg
                className="w-4 h-4 text-text-main/30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Floating badge: new episode */}
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -right-16 top-14 liquid-glass rounded-xl px-3 py-2"
        >
          <p className="font-body text-[9px] text-text-main/50">New Episode</p>
          <p className="font-headline text-[11px] font-bold text-primary">One Piece</p>
        </motion.div>

        {/* Floating badge: live */}
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.7 }}
          className="absolute -left-18 bottom-24 liquid-glass rounded-xl px-3 py-2"
        >
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            <p className="font-headline text-[11px] font-bold text-text-main">HD Online</p>
          </div>
          <p className="font-body text-[9px] text-text-main/40 mt-0.5">10K+ watching</p>
        </motion.div>

        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-16 h-1 bg-white/15 rounded-full" />
      </div>
    </div>
  );
}

// ── Hero section ───────────────────────────────────────────────────────────────
export default function AppHero({ featuredApp }: { featuredApp?: FeaturedApp | null }) {
  return (
    <section className="relative min-h-[90vh] flex items-start overflow-hidden bg-background">
      {/* Background orbs */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-primary/8 blur-[140px]" />
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full bg-tertiary/6 blur-[120px]" />
        <div className="absolute top-1/2 left-1/3 w-[300px] h-[300px] rounded-full bg-secondary/4 blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(186,158,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(186,158,255,0.8) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-10 pb-16 lg:pt-14 lg:pb-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <h1 className="font-headline text-5xl md:text-6xl xl:text-[4.5rem] font-extrabold text-text-main leading-[1.05] tracking-tight mb-6">
              Watch Anime{" "}
              <span className="text-gradient-primary">Without Limits</span>
            </h1>

            <p className="font-body text-text-main/55 text-lg leading-relaxed mb-10 max-w-lg">
              Stream thousands of anime titles in HD. Download for offline,
              track your watchlist, and never miss a new release — all in one
              beautiful app.
            </p>

            {/* Stats */}
            <div className="flex gap-8 mb-10">
              {STATS.map((s) => (
                <div key={s.label}>
                  <p className="font-headline text-2xl font-bold text-primary">{s.value}</p>
                  <p className="font-body text-text-main/35 text-sm mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="flex flex-wrap gap-4 mb-8">
              <Link
                href="/anime"
                className="inline-flex items-center gap-2 px-6 py-3 liquid-glass rounded-md font-headline font-semibold text-text-main border border-white/10 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
              >
                Browse Anime
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </Link>
            </div>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-2">
              {FEATURES.map((f) => (
                <span
                  key={f}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 glass rounded-full font-body text-xs text-text-main/50 border border-outline-variant/10"
                >
                  <svg
                    className="w-3 h-3 text-green-400 shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <polyline points="20,6 9,17 4,12" />
                  </svg>
                  {f}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Right: phone mockup */}
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }}
            className="flex justify-center lg:justify-end"
          >
            <PhoneMockup app={featuredApp} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
