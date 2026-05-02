import { prisma } from "@/lib/prisma";
import AppHero from "@/components/AppHero";
import HomeAnimeSection from "./HomeAnimeSection";
import HomeAppsSection from "./HomeAppsSection";
import Link from "next/link";

const APP_FEATURES = [
  {
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
      </svg>
    ),
    title: "HD Streaming",
    desc: "Crystal-clear 1080p with adaptive bitrate for any connection.",
    accent: "#8B5CF6",
    glow: "rgba(139,92,246,0.12)",
  },
  {
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
    ),
    title: "Offline Mode",
    desc: "Download episodes and watch without internet. Perfect for travel.",
    accent: "#61C2FF",
    glow: "rgba(97,194,255,0.12)",
  },
  {
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
    title: "Sub & Dub",
    desc: "Both subtitled and dubbed — watch however you prefer.",
    accent: "#D946EF",
    glow: "rgba(217,70,239,0.12)",
  },
  {
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
      </svg>
    ),
    title: "Smart Watchlist",
    desc: "Track progress, build your list, get personalized picks.",
    accent: "#FB923C",
    glow: "rgba(251,146,60,0.12)",
  },
];

async function getApps() {
  try {
    return await (prisma.app as any).findMany({
      where: { published: true },
      include: {
        links: true,
        screenshots: { orderBy: { order: "asc" as const } },
      },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    });
  } catch {
    const apps = await prisma.app.findMany({
      where: { published: true },
      include: { links: true },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    });
    return apps.map(a => ({ ...a, screenshots: [] }));
  }
}

export default async function Home() {
  const apps = await getApps();

  return (
    <div className="min-h-screen">

      {/* ── Hero ── */}
      <AppHero />

      {/* ── App Showcase (primary section) ── */}
      <HomeAppsSection apps={apps} />

      {/* ── Features ── */}
      <section className="py-20" style={{ background: "rgba(6,14,32,0.5)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="font-body text-xs uppercase tracking-widest font-semibold mb-3"
              style={{ color: "rgba(139,92,246,0.7)" }}>
              Why MugenAnime
            </p>
            <h2 className="font-headline text-3xl md:text-4xl font-bold text-text-main">
              Everything you need,{" "}
              <span className="text-gradient-primary">in one app</span>
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {APP_FEATURES.map(f => (
              <div key={f.title}
                className="rounded-2xl p-6 transition-all duration-300 cursor-default hover:-translate-y-0.5 hover:border-purple-500/25 hover:shadow-[0_8px_32px_rgba(139,92,246,0.1)]"
                style={{ background: "rgba(9,19,40,0.6)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: f.accent + "18", color: f.accent }}>
                  {f.icon}
                </div>
                <h3 className="font-headline text-base font-bold text-text-main mb-1.5">{f.title}</h3>
                <p className="font-body text-sm leading-relaxed" style={{ color: "rgba(222,229,255,0.45)" }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Anime Carousels ── */}
      <HomeAnimeSection />

      {/* ── Bottom CTA ── */}
      <section className="py-28 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full blur-[140px]"
            style={{ background: "radial-gradient(ellipse,rgba(139,92,246,0.12) 0%,transparent 70%)" }} />
        </div>
        <div className="relative max-w-2xl mx-auto px-4 text-center">
          <h2 className="font-headline text-4xl md:text-5xl font-extrabold text-text-main mb-5 leading-tight">
            Start watching{" "}
            <span className="text-gradient-primary">free today</span>
          </h2>
          <p className="font-body text-lg mb-10 max-w-lg mx-auto" style={{ color: "rgba(222,229,255,0.5)" }}>
            Join 500K+ anime fans. Download MugenAnime and dive in instantly — no subscription, no ads.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/apps"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-headline text-sm font-semibold transition-all duration-200 hover:bg-white/5"
              style={{ color: "rgba(222,229,255,0.55)", border: "1px solid rgba(255,255,255,0.1)" }}>
              View all apps
              <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M2 8a.75.75 0 0 1 .75-.75h8.69L9.22 5.03a.75.75 0 1 1 1.06-1.06l3.5 3.5a.75.75 0 0 1 0 1.06l-3.5 3.5a.75.75 0 1 1-1.06-1.06l2.22-2.22H2.75A.75.75 0 0 1 2 8Z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
