import Image from "next/image";
import Link from "next/link";

const purple  = "#8B5CF6";
const magenta = "#D946EF";
const bdr     = "rgba(255,255,255,0.07)";
const textMut = "rgba(222,229,255,0.45)";
const textDim = "rgba(222,229,255,0.28)";

// ─── Platform icon ─────────────────────────────────────────────────────────────
function PlatformIcon({ platform }: { platform: string }) {
  const p = platform.toLowerCase();
  if (p.includes("play") || p.includes("google")) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
        <path d="m12.954 11.616 2.957-2.957L6.36 3.291c-.633-.342-1.226-.39-1.66-.09l8.254 8.415Zm3.461 3.462 3.074-1.729c.6-.336.929-.812.929-1.348s-.329-1.012-.929-1.348l-3.074-1.729-3.299 3.299 3.299 3.855Zm-4.512 1.127L3.65 20.591c.434.3 1.027.252 1.66-.09l9.552-5.368-3.41-3.928Zm-2.75-2.75L.856 4.78C.57 5.14.4 5.732.4 6.487v11.026c0 .755.17 1.347.456 1.707l8.297-5.765Z" />
      </svg>
    );
  }
  if (p.includes("apk")) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
    </svg>
  );
}

// ─── Featured App ──────────────────────────────────────────────────────────────
function FeaturedApp({ app }: { app: any }) {
  const appSlug = app.slug ?? app.id;
  const screenshots: any[] = app.screenshots?.slice(0, 4) ?? [];
  const playLink = app.links?.find((l: any) =>
    l.platform.toLowerCase().includes("play") || l.platform.toLowerCase().includes("google")
  );
  const apkLink = app.links?.find((l: any) => l.platform.toLowerCase().includes("apk"));
  const primaryLink = playLink ?? app.links?.[0];

  return (
    <div className="relative rounded-3xl overflow-hidden"
      style={{
        background: "rgba(9,19,40,0.7)",
        border: "1px solid rgba(139,92,246,0.25)",
        boxShadow: "0 0 0 1px rgba(217,70,239,0.1), 0 32px 80px rgba(139,92,246,0.12)",
      }}>

      {/* Banner backdrop */}
      {app.bannerUrl && (
        <div className="absolute inset-0">
          <Image src={app.bannerUrl} alt="" fill sizes="100vw" className="object-cover opacity-[0.12]" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(9,19,40,0.98) 35%, rgba(9,19,40,0.7) 100%)" }} />
        </div>
      )}

      {/* Gradient border glow */}
      <div className="absolute inset-0 rounded-3xl pointer-events-none"
        style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.08) 0%, transparent 50%, rgba(217,70,239,0.05) 100%)" }} />

      <div className="relative grid lg:grid-cols-[1fr_1.1fr] gap-0">

        {/* ── Screenshots panel ── */}
        <div className="relative overflow-hidden lg:min-h-[480px]">
          {/* Gradient fade on right edge */}
          <div className="absolute right-0 top-0 bottom-0 w-16 z-10 lg:block hidden"
            style={{ background: "linear-gradient(to right, transparent, rgba(9,19,40,0.95))" }} />

          {screenshots.length > 0 ? (
            <div className="flex gap-3 p-6 pb-8 lg:pb-6 h-full items-center overflow-x-auto scrollbar-none"
              style={{ scrollSnapType: "x mandatory" }}>
              {screenshots.map((s, i) => (
                <div key={i} className="flex-none"
                  style={{ scrollSnapAlign: "start", width: "clamp(120px, 28vw, 160px)" }}>
                  <div className="relative rounded-2xl overflow-hidden"
                    style={{
                      aspectRatio: "9/16",
                      background: "rgba(6,14,32,0.8)",
                      border: `1px solid ${bdr}`,
                      boxShadow: "0 16px 40px rgba(0,0,0,0.4)",
                    }}>
                    <Image src={s.url} alt={s.caption || `${app.name} screenshot ${i + 1}`}
                      fill sizes="160px" className="object-cover" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Placeholder when no screenshots
            <div className="flex items-center justify-center lg:min-h-[480px] p-12">
              <div className="w-40 h-72 rounded-3xl flex items-center justify-center"
                style={{ background: `linear-gradient(135deg,${purple}22,${magenta}22)`, border: `1px solid ${bdr}` }}>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg,${purple},${magenta})` }}>
                  {app.iconUrl
                    ? <Image src={app.iconUrl} alt={app.name} width={64} height={64} className="w-full h-full object-cover rounded-2xl" />
                    : <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-white"><path d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18h3" /></svg>
                  }
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── App details panel ── */}
        <div className="flex flex-col justify-center gap-6 p-8 lg:p-10">

          {/* Featured badge */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-body text-[0.6875rem] font-semibold uppercase tracking-widest"
              style={{ background: "rgba(139,92,246,0.15)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.3)" }}>
              <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
              </svg>
              Featured App
            </span>
            {app.category && (
              <span className="px-3 py-1.5 rounded-full font-body text-[0.6875rem]"
                style={{ background: "rgba(255,255,255,0.05)", color: textMut, border: `1px solid ${bdr}` }}>
                {app.category}
              </span>
            )}
          </div>

          {/* Icon + name */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden flex-none shadow-2xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg,${purple},${magenta})`, border: `3px solid rgba(9,19,40,0.6)` }}>
              {app.iconUrl
                ? <Image src={app.iconUrl} alt={app.name} width={64} height={64} className="w-full h-full object-cover" />
                : <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-white"><path d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18h3" /></svg>
              }
            </div>
            <div>
              <h3 className="font-headline text-2xl font-bold text-text-main leading-tight">{app.name}</h3>
              <p className="font-body text-sm mt-0.5" style={{ color: textDim }}>
                v{app.version}{app.size ? ` · ${app.size}` : ""} · Android
              </p>
            </div>
          </div>

          {/* Tagline */}
          {(app.tagline || app.description) && (
            <p className="font-body text-base leading-relaxed" style={{ color: "rgba(222,229,255,0.65)" }}>
              {app.tagline || app.description?.slice(0, 160)}
            </p>
          )}

          {/* Download buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {primaryLink && (
              <a href={primaryLink.url} target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl font-headline text-sm font-bold transition-all duration-200 hover:brightness-110 hover:shadow-xl active:scale-[0.98] cursor-pointer"
                style={{ background: `linear-gradient(135deg,${purple},${magenta})`, color: "white", boxShadow: "0 8px 32px rgba(139,92,246,0.35)" }}>
                <PlatformIcon platform={primaryLink.platform} />
                {primaryLink.platform}
              </a>
            )}
            {apkLink && apkLink !== primaryLink && (
              <a href={apkLink.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl font-headline text-sm font-semibold transition-all duration-200 hover:bg-white/5 cursor-pointer"
                style={{ color: "#a78bfa", border: "1px solid rgba(139,92,246,0.3)" }}>
                <PlatformIcon platform="apk" />
                APK Direct
              </a>
            )}
          </div>

          {/* Free badge + details link */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 font-body text-xs font-semibold"
                style={{ color: "rgba(74,222,128,0.8)" }}>
                <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                  <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
                </svg>
                Free
              </span>
              <span style={{ color: "rgba(255,255,255,0.1)" }}>·</span>
              <span className="font-body text-xs" style={{ color: textDim }}>No ads · No subscription</span>
            </div>
            <Link href={`/apps/${appSlug}`}
              className="font-body text-xs flex items-center gap-1 transition-colors hover:text-primary"
              style={{ color: textMut }}>
              Details
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

// ─── Secondary app card ────────────────────────────────────────────────────────
function AppCard({ app }: { app: any }) {
  const appSlug = app.slug ?? app.id;
  const primaryLink = app.links?.find((l: any) =>
    l.platform.toLowerCase().includes("play") || l.platform.toLowerCase().includes("google")
  ) ?? app.links?.[0];

  return (
    <div className="group flex gap-4 p-5 rounded-2xl transition-all duration-200 hover:-translate-y-0.5 hover:border-purple-500/30 hover:shadow-[0_8px_24px_rgba(139,92,246,0.1)]"
      style={{ background: "rgba(9,19,40,0.55)", border: `1px solid ${bdr}` }}>

      {/* Icon → detail page */}
      <Link href={`/apps/${appSlug}`} className="flex-none">
        <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg flex items-center justify-center"
          style={{ background: `linear-gradient(135deg,${purple},${magenta})`, border: `2px solid rgba(9,19,40,0.6)` }}>
          {app.iconUrl
            ? <Image src={app.iconUrl} alt={app.name} width={56} height={56} className="w-full h-full object-cover" />
            : <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white"><path d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18h3" /></svg>
          }
        </div>
      </Link>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          {/* Name → detail page */}
          <Link href={`/apps/${appSlug}`} className="flex-1 min-w-0">
            <p className="font-headline text-sm font-bold text-text-main truncate group-hover:text-primary transition-colors">{app.name}</p>
            <p className="font-body text-xs" style={{ color: textDim }}>
              {app.category ?? "App"} · v{app.version}
            </p>
          </Link>
          {/* Get → platform download */}
          {primaryLink && (
            <a href={primaryLink.url} target="_blank" rel="noopener noreferrer"
              className="flex-none flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-headline text-[0.6875rem] font-bold transition-all hover:brightness-110 cursor-pointer whitespace-nowrap"
              style={{ background: `linear-gradient(135deg,${purple},${magenta})`, color: "white" }}>
              <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                <path d="M8.75 2.75a.75.75 0 0 0-1.5 0v5.69L5.03 6.22a.75.75 0 0 0-1.06 1.06l3.5 3.5a.75.75 0 0 0 1.06 0l3.5-3.5a.75.75 0 0 0-1.06-1.06L8.75 8.44V2.75Z" />
              </svg>
              Get
            </a>
          )}
        </div>
        {(app.tagline || app.description) && (
          <p className="font-body text-xs leading-relaxed line-clamp-2" style={{ color: textMut }}>
            {app.tagline || app.description}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Section ───────────────────────────────────────────────────────────────────
export default function HomeAppsSection({ apps }: { apps: any[] }) {
  if (!apps.length) return null;

  const [featured, ...others] = apps;

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Section background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[600px] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(139,92,246,0.07) 0%, transparent 70%)" }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Header ── */}
        <div className="flex items-end justify-between mb-12">
          <div>
            <p className="font-body text-xs uppercase tracking-widest font-semibold mb-3"
              style={{ color: "rgba(139,92,246,0.7)" }}>
              Download Free
            </p>
            <h2 className="font-headline text-3xl md:text-4xl font-bold text-text-main">
              Our{" "}
              <span className="text-gradient-primary">Apps</span>
            </h2>
            <p className="font-body text-sm mt-2" style={{ color: textMut }}>
              Built for anime fans. Free, always.
            </p>
          </div>
          <Link href="/apps"
            className="hidden sm:flex items-center gap-1.5 font-body text-sm transition-colors hover:text-primary group"
            style={{ color: textMut }}>
            View all
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5">
              <path fillRule="evenodd" d="M2 8a.75.75 0 0 1 .75-.75h8.69L9.22 5.03a.75.75 0 1 1 1.06-1.06l3.5 3.5a.75.75 0 0 1 0 1.06l-3.5 3.5a.75.75 0 1 1-1.06-1.06l2.22-2.22H2.75A.75.75 0 0 1 2 8Z" clipRule="evenodd" />
            </svg>
          </Link>
        </div>

        {/* ── Featured app ── */}
        <FeaturedApp app={featured} />

        {/* ── Other apps ── */}
        {others.length > 0 && (
          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {others.slice(0, 6).map(app => (
              <AppCard key={app.id} app={app} />
            ))}
          </div>
        )}

        {/* Mobile view all */}
        <div className="flex justify-center mt-8 sm:hidden">
          <Link href="/apps"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-body text-sm transition-all hover:bg-white/5"
            style={{ color: textMut, border: `1px solid ${bdr}` }}>
            View all apps
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M2 8a.75.75 0 0 1 .75-.75h8.69L9.22 5.03a.75.75 0 1 1 1.06-1.06l3.5 3.5a.75.75 0 0 1 0 1.06l-3.5 3.5a.75.75 0 1 1-1.06-1.06l2.22-2.22H2.75A.75.75 0 0 1 2 8Z" clipRule="evenodd" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
