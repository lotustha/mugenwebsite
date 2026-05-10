import { prisma } from "@/lib/prisma";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

// Read fresh from Prisma on every request — without this, Next.js statically
// pre-renders this page at build time and admin additions don't appear until
// the next deploy.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Our Apps — MugenAnime",
  description: "Download the official MugenAnime app. Stream thousands of anime titles in HD, offline download, sub & dub — free on Android.",
  openGraph: {
    title: "Our Apps — MugenAnime",
    description: "Stream anime in HD, offline downloads, sub & dub. Free on Android.",
    type: "website",
  },
};

// ─── Design tokens ─────────────────────────────────────────────────────────────
const P  = "#8B5CF6";
const M  = "#D946EF";
const G  = "rgba(9,19,40,0.65)";
const B  = "rgba(255,255,255,0.07)";
const DM = "rgba(222,229,255,0.38)";

// ─── Data ──────────────────────────────────────────────────────────────────────
async function getApps() {
  try {
    return await (prisma.app as any).findMany({
      where: { published: true },
      include: {
        links: true,
        screenshots: { orderBy: { order: "asc" as const } },
        faqs: true,
      },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    });
  } catch {
    const apps = await prisma.app.findMany({
      where: { published: true },
      include: { links: true },
      orderBy: [{ createdAt: "desc" }],
    });
    return apps.map((a: any) => ({ ...a, screenshots: [], faqs: [] }));
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function playLink(links: any[]) {
  return links?.find((l: any) => l.platform.toLowerCase().includes("play") || l.platform.toLowerCase().includes("google"));
}
function apkLink(links: any[]) {
  return links?.find((l: any) => l.platform.toLowerCase().includes("apk"));
}

// ─── Featured App — full-width immersive hero ──────────────────────────────────
function FeaturedShowcase({ app }: { app: any }) {
  const slug        = app.slug ?? app.id;
  const primary     = playLink(app.links ?? []) ?? app.links?.[0];
  const apk         = apkLink(app.links ?? []);
  const shots: any[] = (app.screenshots ?? []).slice(0, 4);

  return (
    <div className="relative rounded-3xl overflow-hidden mb-24"
      style={{
        border: "1px solid rgba(139,92,246,0.3)",
        boxShadow: "0 0 0 1px rgba(217,70,239,0.1), 0 32px 120px rgba(139,92,246,0.2)",
      }}>

      {/* Banner backdrop */}
      {app.bannerUrl && (
        <div className="absolute inset-0">
          <Image src={app.bannerUrl} alt="" fill sizes="100vw" className="object-cover" priority />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(6,3,18,0.82) 0%, rgba(6,3,18,0.92) 60%, rgba(6,3,18,0.98) 100%)" }} />
        </div>
      )}
      {!app.bannerUrl && (
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(135deg,rgba(139,92,246,0.15) 0%,rgba(6,3,18,0.98) 60%)" }} />
      )}

      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-[120px]" style={{ background: "rgba(139,92,246,0.18)" }} />
        <div className="absolute -bottom-16 right-0 w-72 h-72 rounded-full blur-[100px]" style={{ background: "rgba(217,70,239,0.1)" }} />
      </div>

      <div className="relative grid lg:grid-cols-[1fr_1.15fr] min-h-[520px]">

        {/* ── Screenshots panel ── */}
        <div className="relative flex items-end justify-center lg:justify-start p-8 pb-0 lg:pb-8 overflow-hidden">
          {/* Right fade on desktop */}
          <div className="absolute right-0 top-0 bottom-0 w-20 z-10 hidden lg:block"
            style={{ background: "linear-gradient(to right,transparent,rgba(6,3,18,0.95))" }} />

          {shots.length > 0 ? (
            <div className="flex items-end gap-3">
              {shots.map((s, i) => (
                <div key={i}
                  className="flex-none rounded-2xl overflow-hidden transition-all duration-300"
                  style={{
                    width: "clamp(90px,18vw,130px)",
                    aspectRatio: "9/16",
                    background: "rgba(6,14,32,0.8)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
                    transform: `translateY(${i % 2 === 0 ? "0px" : "20px"})`,
                    opacity: i === 3 ? 0.5 : i === 2 ? 0.75 : 1,
                  }}>
                  <Image src={s.url} alt={s.caption || `${app.name} screenshot ${i + 1}`}
                    width={130} height={231} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          ) : (
            <div className="w-40 h-72 rounded-3xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg,${P}20,${M}20)`, border: `1px solid ${B}` }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: `linear-gradient(135deg,${P},${M})` }}>
                {app.iconUrl
                  ? <Image src={app.iconUrl} alt={app.name} width={64} height={64} className="w-full h-full object-cover rounded-2xl" />
                  : <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-white"><path d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18h3" /></svg>
                }
              </div>
            </div>
          )}
        </div>

        {/* ── Details panel ── */}
        <div className="flex flex-col justify-center gap-6 p-8 lg:pl-6 lg:pr-10 lg:py-12">

          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-body text-[0.6875rem] font-semibold uppercase tracking-widest"
              style={{ background: "rgba(139,92,246,0.18)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.35)" }}>
              <svg viewBox="0 0 12 12" fill="currentColor" className="w-3 h-3"><path d="M6 .5a.5.5 0 0 1 .449.278l1.264 2.562 2.828.411a.5.5 0 0 1 .277.854l-2.046 1.994.483 2.816a.5.5 0 0 1-.727.528L6 8.38l-2.528 1.33a.5.5 0 0 1-.727-.528l.483-2.816L1.182 4.605a.5.5 0 0 1 .277-.854l2.828-.411L5.551.778A.5.5 0 0 1 6 .5Z" /></svg>
              Featured App
            </span>
            {app.category && (
              <span className="px-3 py-1.5 rounded-full font-body text-[0.6875rem]"
                style={{ background: "rgba(255,255,255,0.06)", color: DM, border: `1px solid ${B}` }}>
                {app.category}
              </span>
            )}
            <span className="px-3 py-1.5 rounded-full font-body text-[0.6875rem] font-semibold"
              style={{ background: "rgba(52,211,153,0.1)", color: "rgba(52,211,153,0.9)", border: "1px solid rgba(52,211,153,0.2)" }}>
              Free
            </span>
          </div>

          {/* Icon + Name */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-3xl overflow-hidden flex-none shadow-2xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg,${P},${M})`, border: "3px solid rgba(9,3,22,0.7)", boxShadow: "0 8px 32px rgba(139,92,246,0.4)" }}>
              {app.iconUrl
                ? <Image src={app.iconUrl} alt={app.name} width={80} height={80} className="w-full h-full object-cover" />
                : <svg viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-white"><path d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18h3" /></svg>
              }
            </div>
            <div>
              <h1 className="font-headline text-3xl md:text-4xl font-extrabold text-white leading-tight">{app.name}</h1>
              <p className="font-body text-sm mt-1" style={{ color: "rgba(222,229,255,0.35)" }}>
                v{app.version}{app.size ? ` · ${app.size}` : ""} · Android
              </p>
            </div>
          </div>

          {/* Tagline */}
          {app.tagline && (
            <p className="font-headline text-lg font-semibold leading-snug" style={{ color: "rgba(222,229,255,0.8)" }}>
              {app.tagline}
            </p>
          )}

          {/* Description */}
          {app.description && (
            <p className="font-body text-sm leading-relaxed line-clamp-3" style={{ color: "rgba(222,229,255,0.55)" }}>
              {app.description}
            </p>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-5 flex-wrap">
            {[
              { label: "Version", value: app.version },
              ...(app.size ? [{ label: "Size", value: app.size }] : []),
              ...((app.faqs?.length ?? 0) > 0 ? [{ label: "FAQs", value: `${app.faqs.length}` }] : []),
              ...((app.screenshots?.length ?? 0) > 0 ? [{ label: "Screenshots", value: `${app.screenshots.length}` }] : []),
            ].map(s => (
              <div key={s.label}>
                <p className="font-body text-[0.625rem] uppercase tracking-widest font-semibold" style={{ color: "rgba(222,229,255,0.25)" }}>{s.label}</p>
                <p className="font-headline text-sm font-bold text-white mt-0.5">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Download CTAs */}
          <div className="flex flex-col sm:flex-row gap-3">
            {primary && (
              <a href={primary.url} target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl font-headline text-sm font-bold transition-all duration-200 hover:brightness-110 hover:shadow-xl active:scale-[0.97] cursor-pointer"
                style={{ background: `linear-gradient(135deg,${P},${M})`, color: "white", boxShadow: "0 8px 32px rgba(139,92,246,0.4)" }}>
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="m12.954 11.616 2.957-2.957L6.36 3.291c-.633-.342-1.226-.39-1.66-.09l8.254 8.415Zm3.461 3.462 3.074-1.729c.6-.336.929-.812.929-1.348s-.329-1.012-.929-1.348l-3.074-1.729-3.299 3.299 3.299 3.855Zm-4.512 1.127L3.65 20.591c.434.3 1.027.252 1.66-.09l9.552-5.368-3.41-3.928Zm-2.75-2.75L.856 4.78C.57 5.14.4 5.732.4 6.487v11.026c0 .755.17 1.347.456 1.707l8.297-5.765Z" />
                </svg>
                {primary.platform}
              </a>
            )}
            {apk && apk !== primary && (
              <a href={apk.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl font-headline text-sm font-semibold transition-all duration-200 hover:bg-white/5 cursor-pointer"
                style={{ color: "#a78bfa", border: "1px solid rgba(139,92,246,0.3)" }}>
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
                  <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
                </svg>
                APK Direct
              </a>
            )}
            <Link href={`/apps/${slug}`}
              className="flex items-center justify-center gap-1.5 px-5 py-3.5 rounded-2xl font-headline text-sm font-semibold transition-all duration-200 hover:bg-white/5 cursor-pointer"
              style={{ color: DM, border: `1px solid ${B}` }}>
              Full Details
              <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M2 8a.75.75 0 0 1 .75-.75h8.69L9.22 5.03a.75.75 0 1 1 1.06-1.06l3.5 3.5a.75.75 0 0 1 0 1.06l-3.5 3.5a.75.75 0 1 1-1.06-1.06l2.22-2.22H2.75A.75.75 0 0 1 2 8Z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── App row — mini FeaturedShowcase style ────────────────────────────────────
function AppRow({ app }: { app: any }) {
  const slug    = app.slug ?? app.id;
  const primary = playLink(app.links ?? []) ?? app.links?.[0];
  const apk     = apkLink(app.links ?? []);
  const shots: any[] = (app.screenshots ?? []).slice(0, 3);

  return (
    <div className="relative rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-[0_8px_48px_rgba(139,92,246,0.14)]"
      style={{
        border: "1px solid rgba(139,92,246,0.2)",
        boxShadow: "0 0 0 1px rgba(217,70,239,0.06), 0 8px 40px rgba(139,92,246,0.08)",
      }}>

      {/* ── Banner as blurred backdrop ── */}
      {app.bannerUrl ? (
        <div className="absolute inset-0">
          <Image src={app.bannerUrl} alt="" fill sizes="100vw" className="object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom,rgba(6,3,18,0.78) 0%,rgba(6,3,18,0.92) 55%,rgba(6,3,18,0.98) 100%)" }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to right,rgba(6,3,18,0.55) 0%,transparent 45%)" }} />
        </div>
      ) : (
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg,rgba(139,92,246,0.12) 0%,rgba(6,3,18,0.97) 60%)" }} />
      )}

      {/* ── Ambient glow (smaller/dimmer than featured) ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-16 -left-16 w-48 h-48 rounded-full blur-[80px]"
          style={{ background: "rgba(139,92,246,0.12)" }} />
        <div className="absolute -bottom-8 right-0 w-40 h-40 rounded-full blur-[60px]"
          style={{ background: "rgba(217,70,239,0.07)" }} />
      </div>

      {/* ── Content: screenshots left, details right ── */}
      <div className="relative grid md:grid-cols-[200px_1fr] min-h-[260px]">

        {/* ── Screenshots panel ── */}
        <div className="relative flex items-end justify-center md:justify-start p-5 pb-0 md:pb-5 overflow-hidden">
          {/* Right-edge fade into details */}
          <div className="absolute right-0 top-0 bottom-0 w-12 z-10 hidden md:block"
            style={{ background: "linear-gradient(to right,transparent,rgba(6,3,18,0.95))" }} />

          {shots.length > 0 ? (
            <div className="flex items-end gap-2.5">
              {shots.map((s, i) => (
                <div key={i} className="flex-none rounded-xl overflow-hidden"
                  style={{
                    width: "clamp(68px,13vw,88px)",
                    aspectRatio: "9/16",
                    background: "rgba(6,14,32,0.8)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    boxShadow: "0 16px 32px rgba(0,0,0,0.45)",
                    transform: `translateY(${i % 2 === 0 ? "0px" : "14px"})`,
                    opacity: i === 2 ? 0.65 : 1,
                  }}>
                  <Image src={s.url} alt={s.caption || `${app.name} ${i + 1}`}
                    width={88} height={156} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          ) : (
            /* Placeholder when no screenshots */
            <div className="w-20 h-36 rounded-2xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg,${P}18,${M}12)`, border: `1px solid ${B}` }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `linear-gradient(135deg,${P},${M})` }}>
                {app.iconUrl
                  ? <Image src={app.iconUrl} alt={app.name} width={40} height={40} className="w-full h-full object-cover rounded-xl" />
                  : <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white"><path d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18h3" /></svg>
                }
              </div>
            </div>
          )}
        </div>

        {/* ── Details panel ── */}
        <div className="flex flex-col justify-center gap-4 p-5 md:pl-4 md:pr-8 md:py-8">

          {/* Category badge */}
          {app.category && (
            <span className="self-start px-2.5 py-1 rounded-full font-body text-[0.5625rem] font-semibold uppercase tracking-widest"
              style={{ background: "rgba(139,92,246,0.15)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.28)" }}>
              {app.category}
            </span>
          )}

          {/* Icon + Name */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl overflow-hidden flex-none shadow-xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg,${P},${M})`, border: "2.5px solid rgba(6,3,18,0.7)", boxShadow: "0 4px 20px rgba(139,92,246,0.35)" }}>
              {app.iconUrl
                ? <Image src={app.iconUrl} alt={app.name} width={48} height={48} className="w-full h-full object-cover" />
                : <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white"><path d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18h3" /></svg>
              }
            </div>
            <div>
              <Link href={`/apps/${slug}`}>
                <h2 className="font-headline text-xl font-bold text-white hover:text-primary transition-colors cursor-pointer leading-tight">{app.name}</h2>
              </Link>
              <p className="font-body text-xs mt-0.5" style={{ color: "rgba(222,229,255,0.35)" }}>
                v{app.version}{app.size ? ` · ${app.size}` : ""} · Android
              </p>
            </div>
          </div>

          {/* Tagline */}
          {(app.tagline || app.description) && (
            <p className="font-body text-sm leading-relaxed line-clamp-2" style={{ color: "rgba(222,229,255,0.6)" }}>
              {app.tagline || app.description}
            </p>
          )}

          {/* Download CTAs */}
          <div className="flex flex-wrap gap-2.5">
            {primary && (
              <a href={primary.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-headline text-sm font-bold transition-all duration-200 hover:brightness-110 active:scale-[0.97] cursor-pointer"
                style={{ background: `linear-gradient(135deg,${P},${M})`, color: "white", boxShadow: "0 4px 16px rgba(139,92,246,0.35)" }}>
                <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                  <path d="m12.954 11.616 2.957-2.957L6.36 3.291c-.633-.342-1.226-.39-1.66-.09l8.254 8.415Zm3.461 3.462 3.074-1.729c.6-.336.929-.812.929-1.348s-.329-1.012-.929-1.348l-3.074-1.729-3.299 3.299 3.299 3.855Zm-4.512 1.127L3.65 20.591c.434.3 1.027.252 1.66-.09l9.552-5.368-3.41-3.928Zm-2.75-2.75L.856 4.78C.57 5.14.4 5.732.4 6.487v11.026c0 .755.17 1.347.456 1.707l8.297-5.765Z" />
                </svg>
                {primary.platform}
              </a>
            )}
            {apk && apk !== primary && (
              <a href={apk.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-headline text-sm font-semibold transition-all hover:bg-white/5 cursor-pointer"
                style={{ color: "#a78bfa", border: "1px solid rgba(139,92,246,0.28)" }}>
                APK
              </a>
            )}
            <Link href={`/apps/${slug}`}
              className="flex items-center gap-1 px-4 py-2.5 rounded-xl font-body text-sm transition-colors hover:text-white cursor-pointer"
              style={{ color: "rgba(222,229,255,0.3)", border: `1px solid ${B}` }}>
              Details
              <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 6h7M6.5 3l3 3-3 3" />
              </svg>
            </Link>

            {/* Free badge */}
            <span className="flex items-center gap-1 font-body text-xs font-semibold"
              style={{ color: "rgba(52,211,153,0.8)" }}>
              <svg viewBox="0 0 12 12" fill="currentColor" className="w-3 h-3">
                <path d="M6 .5a.5.5 0 0 1 .449.278l1.264 2.562 2.828.411a.5.5 0 0 1 .277.854l-2.046 1.994.483 2.816a.5.5 0 0 1-.727.528L6 8.38l-2.528 1.33a.5.5 0 0 1-.727-.528l.483-2.816L1.182 4.605a.5.5 0 0 1 .277-.854l2.828-.411L5.551.778A.5.5 0 0 1 6 .5Z" />
              </svg>
              Free
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default async function AppsPage() {
  const apps = await getApps();
  const featured = apps.find((a: any) => a.featured) ?? apps[0];
  const others   = apps.filter((a: any) => a.id !== featured?.id);

  return (
    <div className="min-h-screen">
      {/* ── Page hero header ── */}
      <div className="relative pt-16 pb-20 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full blur-[140px]"
            style={{ background: "radial-gradient(ellipse,rgba(139,92,246,0.1) 0%,transparent 70%)" }} />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="font-body text-xs uppercase tracking-widest font-semibold mb-4"
            style={{ color: "rgba(139,92,246,0.7)" }}>
            Download Free
          </p>
          <h1 className="font-headline text-5xl md:text-6xl font-extrabold text-white mb-4 leading-tight">
            Our{" "}
            <span className="text-gradient-primary">Apps</span>
          </h1>
          <p className="font-body text-lg max-w-xl mx-auto" style={{ color: "rgba(222,229,255,0.45)" }}>
            Built for anime fans. Free to download, always.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">

        {/* ── Empty state ── */}
        {apps.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-5 py-32 rounded-3xl text-center"
            style={{ background: G, border: `1px solid ${B}` }}>
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg,${P},${M})` }}>
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-white">
                <path d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18h3" />
              </svg>
            </div>
            <div>
              <p className="font-headline text-2xl font-bold text-white mb-2">Coming Soon</p>
              <p className="font-body text-sm" style={{ color: "rgba(222,229,255,0.4)" }}>
                Our apps are on their way. Check back soon!
              </p>
            </div>
          </div>
        )}

        {/* ── Featured showcase ── */}
        {featured && <FeaturedShowcase app={featured} />}

        {/* ── Other apps ── */}
        {others.length > 0 && (
          <div>
            <div className="flex items-center gap-4 mb-8">
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
              <p className="font-body text-xs uppercase tracking-widest font-semibold flex-none"
                style={{ color: "rgba(222,229,255,0.25)" }}>
                More Apps
              </p>
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
            </div>
            <div className="space-y-5">
              {others.map((app: any) => <AppRow key={app.id} app={app} />)}
            </div>
          </div>
        )}

        {/* ── Safety section ── */}
        <div className="mt-20 rounded-3xl p-8 md:p-10"
          style={{ background: "rgba(139,92,246,0.05)", border: "1px solid rgba(139,92,246,0.15)" }}>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-none"
              style={{ background: "rgba(139,92,246,0.15)" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
            </div>
            <div>
              <h2 className="font-headline text-lg font-bold text-white mb-2">Safe &amp; Compliant</h2>
              <p className="font-body text-sm leading-relaxed" style={{ color: "rgba(222,229,255,0.5)" }}>
                MugenAnime is distributed exclusively through official channels. We do not collect personal data beyond
                what is necessary for core app functionality. No malware, spyware, or unwanted software. All updates are
                reviewed before release. Questions?{" "}
                <a href="mailto:support@mugenanime.com" className="text-primary hover:underline transition-colors">
                  support@mugenanime.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
