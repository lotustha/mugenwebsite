"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

const surf    = "rgba(9,19,40,0.55)";
const bdr     = "rgba(255,255,255,0.07)";
const purple  = "#8B5CF6";
const magenta = "#D946EF";

function AppCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden animate-pulse" style={{ background: surf, border: `1px solid ${bdr}` }}>
      <div className="h-40 bg-surface" />
      <div className="p-5 space-y-3">
        <div className="flex gap-3">
          <div className="w-14 h-14 rounded-2xl bg-surface" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-4 bg-surface rounded w-1/2" />
            <div className="h-3 bg-surface rounded w-1/3" />
          </div>
        </div>
        <div className="h-3 bg-surface rounded" />
        <div className="h-3 bg-surface rounded w-3/4" />
        <div className="h-10 bg-surface rounded-xl mt-4" />
      </div>
    </div>
  );
}

function AppCard({ app }: { app: any }) {
  const playStoreLink = app.links?.find((l: any) => l.platform.toLowerCase().includes("play") || l.platform.toLowerCase().includes("google"));
  const primaryLink   = app.links?.[0];
  const downloadUrl   = playStoreLink?.url ?? primaryLink?.url ?? "#";
  const platforms     = [...new Set((app.links ?? []).map((l: any) => l.platform))];

  return (
    <Link href={`/apps/${app.slug ?? app.id}`}
      className="group rounded-2xl overflow-hidden flex flex-col cursor-pointer transition-all duration-200 hover:border-primary/40 hover:shadow-[0_8px_40px_rgba(139,92,246,0.12)]"
      style={{ background: surf, border: `1px solid ${bdr}` }}>

      {/* Banner */}
      <div className="relative h-36 overflow-hidden" style={{ background: "linear-gradient(135deg,rgba(139,92,246,0.25),rgba(217,70,239,0.15))" }}>
        {app.bannerUrl ? (
          <Image src={app.bannerUrl} alt={app.name} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center opacity-30"
              style={{ background: `linear-gradient(135deg,${purple},${magenta})` }}>
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white">
                <path d="M12.75 12.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM7.5 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM8.25 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM9.75 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM10.5 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM12.75 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM14.25 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM15 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM16.5 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM15 12.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM16.5 13.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" />
                <path fillRule="evenodd" d="M6.75 2.25A.75.75 0 0 1 7.5 3v1.5h9V3A.75.75 0 0 1 18 3v1.5h.75a3 3 0 0 1 3 3v11.25a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V7.5a3 3 0 0 1 3-3H6V3a.75.75 0 0 1 .75-.75Zm13.5 9a1.5 1.5 0 0 0-1.5-1.5H5.25a1.5 1.5 0 0 0-1.5 1.5v7.5a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5v-7.5Z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      </div>

      {/* Content */}
      <div className="flex-1 p-5 space-y-3">
        {/* Icon + name */}
        <div className="flex gap-3 -mt-10 relative">
          <div className="w-16 h-16 rounded-2xl overflow-hidden flex-none shadow-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `linear-gradient(135deg,${purple},${magenta})`, border: "3px solid rgba(9,19,40,0.8)" }}>
            {app.iconUrl
              ? <Image src={app.iconUrl} alt={app.name} width={64} height={64} className="w-full h-full object-cover" />
              : <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-white"><path d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18h3" /></svg>
            }
          </div>
          <div className="flex-1 min-w-0 pt-10">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-headline text-base font-bold text-text-main truncate">{app.name}</h2>
              {app.category && (
                <span className="px-2 py-0.5 rounded-full font-body text-[0.5625rem] font-semibold uppercase tracking-wide flex-none"
                  style={{ background: "rgba(139,92,246,0.15)", color: "#ba9eff", border: "1px solid rgba(139,92,246,0.25)" }}>
                  {app.category}
                </span>
              )}
            </div>
            <p className="font-body text-xs mt-0.5" style={{ color: "rgba(222,229,255,0.4)" }}>
              v{app.version}{app.size ? ` · ${app.size}` : ""}
            </p>
          </div>
        </div>

        {/* Tagline */}
        {(app.tagline || app.description) && (
          <p className="font-body text-sm leading-relaxed line-clamp-2" style={{ color: "rgba(222,229,255,0.55)" }}>
            {app.tagline || app.description}
          </p>
        )}

        {/* Platform chips */}
        {platforms.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {platforms.map((p: any) => (
              <span key={p} className="px-2 py-0.5 rounded-md font-body text-[0.625rem]"
                style={{ background: "rgba(255,255,255,0.05)", color: "rgba(222,229,255,0.45)", border: `1px solid ${bdr}` }}>
                {p}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Download CTA */}
      <div className="px-5 pb-5">
        <div className="flex items-center justify-between gap-3">
          <a href={downloadUrl} target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-headline text-sm font-bold transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
            style={{ background: `linear-gradient(135deg,${purple},${magenta})`, color: "white" }}>
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
              <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
            </svg>
            Download
          </a>
          <span className="font-body text-xs" style={{ color: "rgba(222,229,255,0.3)" }}>
            Details →
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function AppsContent() {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/apps")
      .then(r => r.json())
      .then(data => { setApps(Array.isArray(data) ? data : []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map(i => <AppCardSkeleton key={i} />)}
      </div>
    );
  }

  if (apps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 rounded-2xl text-center"
        style={{ background: surf, border: `1px solid ${bdr}` }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: `linear-gradient(135deg,${purple},${magenta})` }}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-white">
            <path d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18h3" />
          </svg>
        </div>
        <div>
          <p className="font-headline text-lg font-bold text-text-main">Coming Soon</p>
          <p className="font-body text-sm mt-1" style={{ color: "rgba(222,229,255,0.4)" }}>
            Our apps are on their way. Check back soon!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {apps.map(app => <AppCard key={app.id} app={app} />)}
    </div>
  );
}
