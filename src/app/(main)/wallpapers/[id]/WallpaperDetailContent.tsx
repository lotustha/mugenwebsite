"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPreview } from "@/lib/preview-store";
import AdUnit from "@/components/AdUnit";

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 lg:gap-10 animate-pulse">
      <div className="mx-auto w-full max-w-[320px] lg:max-w-none aspect-[9/16] rounded-3xl bg-surface" />
      <div className="space-y-5 pt-2">
        <div className="h-3 bg-surface rounded-full w-20" />
        <div className="space-y-3">
          <div className="h-8 bg-surface rounded-xl w-3/4" />
          <div className="h-4 bg-surface rounded w-full" />
          <div className="h-4 bg-surface rounded w-2/3" />
        </div>
        <div className="flex gap-2">
          <div className="h-7 bg-surface rounded-full w-24" />
          <div className="h-7 bg-surface rounded-full w-16" />
        </div>
        <div className="h-14 bg-surface rounded-2xl" />
      </div>
    </div>
  );
}

// ─── Related card ─────────────────────────────────────────────────────────────

function RelatedCard({ w }: { w: any }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playRef  = useRef<Promise<void> | null>(null);

  const safePlay  = () => { if (videoRef.current) playRef.current = videoRef.current.play().catch(() => {}); };
  const safePause = () => {
    (playRef.current ?? Promise.resolve()).catch(() => {}).finally(() => {
      if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0; }
    });
    playRef.current = null;
  };

  return (
    <Link href={`/wallpapers/${w.id}`}
      className="relative flex-none w-28 aspect-[9/16] rounded-xl overflow-hidden block group cursor-pointer"
      style={{ background: "rgba(6,14,32,0.6)", border: "1px solid rgba(255,255,255,0.07)" }}
      onMouseEnter={safePlay}
      onMouseLeave={safePause}>
      {w.type === "IMAGE" ? (
        <Image src={w.fileUrl} alt={w.title} fill sizes="112px"
          className="object-cover transition-transform duration-300 group-hover:scale-105" />
      ) : (
        <>
          <video ref={videoRef} src={w.fileUrl} className="w-full h-full object-cover" muted playsInline preload="metadata" />
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(6,14,32,0.3)" }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: "rgba(6,14,32,0.7)", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.15)" }}>
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 translate-x-px text-white/90"><path d="M8 5.14v14l11-7-11-7Z" /></svg>
            </div>
          </div>
        </>
      )}
      {/* Download count */}
      {(w.downloadsCount ?? 0) > 0 && (
        <div className="absolute bottom-1.5 left-0 right-0 flex justify-center pointer-events-none">
          <span className="font-mono text-[0.5rem] px-1.5 py-0.5 rounded-full tabular-nums"
            style={{ background: "rgba(6,14,32,0.78)", color: "rgba(222,229,255,0.5)", backdropFilter: "blur(4px)" }}>
            {w.downloadsCount.toLocaleString()}↓
          </span>
        </div>
      )}

      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl"
        style={{ border: "2px solid rgba(139,92,246,0.6)" }} />
    </Link>
  );
}

// ─── Download gate ────────────────────────────────────────────────────────────
// Shows an ad overlay with a countdown when user clicks Download.
// After the countdown the download starts automatically.

function DownloadGate({ fileUrl, title }: { fileUrl: string; title: string }) {
  const [open, setOpen]           = useState(false);
  const [countdown, setCountdown] = useState(5);
  const fileUrlRef = useRef(fileUrl);
  fileUrlRef.current = fileUrl;

  const handleOpen = () => {
    setCountdown(5);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
    // countdown reached 0 — trigger download
    const a = document.createElement("a");
    a.href = fileUrlRef.current;
    a.download = "";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    const t = setTimeout(() => setOpen(false), 1000);
    return () => clearTimeout(t);
  }, [open, countdown]);

  return (
    <>
      {/* Download button */}
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl font-headline text-base font-bold cursor-pointer transition-all duration-200 hover:brightness-110 hover:shadow-lg active:scale-[0.98]"
        style={{
          background: "linear-gradient(135deg,#8B5CF6,#D946EF)",
          color: "white",
          boxShadow: "0 8px 32px rgba(139,92,246,0.35)",
        }}
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
          <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
          <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
        </svg>
        Free Download
      </button>

      {/* Ad overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{ background: "rgba(6,3,18,0.82)", backdropFilter: "blur(6px)" }}
            onClick={() => setOpen(false)}
          />

          <div
            className="relative w-full max-w-sm rounded-2xl overflow-hidden"
            style={{
              background: "rgba(9,19,40,0.98)",
              border: "1px solid rgba(139,92,246,0.3)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(217,70,239,0.1)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-3 border-b"
              style={{ borderColor: "rgba(255,255,255,0.07)" }}
            >
              <p className="font-body text-xs uppercase tracking-widest font-semibold" style={{ color: "rgba(222,229,255,0.3)" }}>
                Advertisement
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-6 h-6 rounded-full flex items-center justify-center transition-colors hover:bg-white/10 cursor-pointer"
                style={{ color: "rgba(222,229,255,0.3)" }}
              >
                <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                  <path d="M2.22 2.22a.75.75 0 0 1 1.06 0L8 6.94l4.72-4.72a.75.75 0 1 1 1.06 1.06L9.06 8l4.72 4.72a.75.75 0 1 1-1.06 1.06L8 9.06l-4.72 4.72a.75.75 0 0 1-1.06-1.06L6.94 8 2.22 3.28a.75.75 0 0 1 0-1.06Z" />
                </svg>
              </button>
            </div>

            {/* Ad unit — slot ID: AdSense → Ad units → Display ad */}
            <div className="px-4 pt-4">
              <AdUnit slot="YOUR_DOWNLOAD_GATE_SLOT_ID" className="min-h-[100px]" />
            </div>

            {/* Countdown footer */}
            <div className="px-5 py-4 text-center">
              {countdown > 0 ? (
                <p className="font-body text-sm" style={{ color: "rgba(222,229,255,0.5)" }}>
                  Preparing your download in{" "}
                  <span
                    className="font-headline font-bold text-xl tabular-nums"
                    style={{ color: "#c4b5fd" }}
                  >
                    {countdown}
                  </span>
                  s…
                </p>
              ) : (
                <div className="flex items-center justify-center gap-2" style={{ color: "#34d399" }}>
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                  </svg>
                  <span className="font-headline text-sm font-semibold">Starting download…</span>
                </div>
              )}
              <p className="font-body text-[0.6875rem] mt-1.5" style={{ color: "rgba(222,229,255,0.2)" }}>
                {title}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function WallpaperDetailContent({ id }: { id: string }) {
  const preview = getPreview(`wallpaper:${id}`);

  const [wallpaper, setWallpaper]   = useState<any>(preview ?? null);
  const [related, setRelated]       = useState<any[]>([]);
  const [fullLoaded, setFullLoaded] = useState(false);
  const [missing, setMissing]       = useState(false);
  const [muted, setMuted]           = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    fetch(`/api/wallpapers/${encodeURIComponent(id)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data || data.error) { if (!preview) setMissing(true); }
        else setWallpaper(data);
        setFullLoaded(true);
      })
      .catch(() => { if (!preview) setMissing(true); setFullLoaded(true); });
  }, [id, preview]);

  useEffect(() => {
    if (!fullLoaded || !wallpaper) return;
    const cat = wallpaper.categories?.[0]?.slug;
    const tag = wallpaper.tags?.[0]?.slug;
    // Prefer category filter, fall back to first tag, then plain recent
    let qs = "?limit=8";
    if (cat) qs += `&category=${cat}`;
    else if (tag) qs += `&tag=${tag}`;
    fetch(`/api/wallpapers${qs}`)
      .then(r => r.json())
      .then((data: any) => {
        const arr: any[] = Array.isArray(data) ? data : (data.wallpapers ?? []);
        setRelated(arr.filter((w: any) => w.id !== id).slice(0, 7));
      })
      .catch(() => {});
  }, [id, fullLoaded, wallpaper]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  if (missing) notFound();
  if (!wallpaper) return <Skeleton />;

  const isVideo    = wallpaper.type === "VIDEO";
  const categories = wallpaper.categories ?? [];
  const tags       = wallpaper.tags ?? [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 lg:gap-10">

      {/* ── Column 1: portrait media ── */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <div className="mx-auto w-full max-w-[320px] lg:max-w-none relative aspect-[9/16] rounded-3xl overflow-hidden"
          style={{ background: "rgba(6,14,32,0.8)", boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)" }}>

          {isVideo ? (
            <>
              <video ref={videoRef} src={wallpaper.fileUrl}
                className="absolute inset-0 w-full h-full object-cover"
                autoPlay loop muted playsInline />

              {/* Live badge */}
              <div className="absolute top-3.5 left-3.5 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ background: "rgba(6,14,32,0.7)", backdropFilter: "blur(10px)", border: "1px solid rgba(139,92,246,0.5)", color: "#c4b5fd" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                LIVE
              </div>

              {/* Mute toggle */}
              <button type="button" onClick={() => setMuted(m => !m)} aria-label={muted ? "Unmute" : "Mute"}
                className="absolute bottom-3.5 right-3.5 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95"
                style={{ background: "rgba(6,14,32,0.65)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.12)" }}>
                {muted ? (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" style={{ color: "rgba(222,229,255,0.65)" }}>
                    <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM17.78 9.22a.75.75 0 1 0-1.06 1.06L18.44 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06l1.72-1.72 1.72 1.72a.75.75 0 1 0 1.06-1.06L20.56 12l1.72-1.72a.75.75 0 0 0-1.06-1.06l-1.72 1.72-1.72-1.72Z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" style={{ color: "rgba(222,229,255,0.9)" }}>
                    <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM18.584 5.106a.75.75 0 0 1 1.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 0 1-1.06-1.06 8.25 8.25 0 0 0 0-11.668.75.75 0 0 1 0-1.06Z" />
                    <path d="M15.932 7.757a.75.75 0 0 1 1.061 0 6 6 0 0 1 0 8.486.75.75 0 0 1-1.06-1.061 4.5 4.5 0 0 0 0-6.364.75.75 0 0 1 0-1.06Z" />
                  </svg>
                )}
              </button>
            </>
          ) : (
            <Image src={wallpaper.fileUrl} alt={wallpaper.title} fill
              sizes="(max-width: 1024px) 320px, 320px"
              className="object-cover" priority />
          )}
        </div>
      </div>

      {/* ── Column 2: info ── */}
      <div className="flex flex-col gap-5 pt-1 min-w-0">

        {/* Back */}
        <Link href="/wallpapers"
          className="inline-flex items-center gap-2 text-sm cursor-pointer transition-colors group w-fit"
          style={{ color: "rgba(222,229,255,0.38)" }}>
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 transition-transform duration-150 group-hover:-translate-x-0.5">
            <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
          </svg>
          <span className="font-body hover:text-text-main/60 transition-colors">All Wallpapers</span>
        </Link>

        {/* Header */}
        <div className="space-y-3">
          {/* Type + count */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-body text-xs font-semibold"
              style={{
                background: isVideo ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.06)",
                color: isVideo ? "#c4b5fd" : "rgba(222,229,255,0.5)",
                border: `1px solid ${isVideo ? "rgba(139,92,246,0.35)" : "rgba(255,255,255,0.08)"}`,
              }}>
              {isVideo
                ? <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3"><path d="M3 3.5A1.5 1.5 0 0 1 4.5 2h7A1.5 1.5 0 0 1 13 3.5v9A1.5 1.5 0 0 1 11.5 14h-7A1.5 1.5 0 0 1 3 12.5v-9Zm8.5 4.243V8l-3-1.757v3.514L11.5 8z" /></svg>
                : <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M2 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4Zm9.5 6.5-3-2.5-1.5 1.5-2-2.5-2 3H12l-.5-1.5Z" clipRule="evenodd" /></svg>
              }
              {isVideo ? "Live Wallpaper" : "Image Wallpaper"}
            </span>
            {fullLoaded && (wallpaper.downloadsCount ?? 0) > 0 && (
              <span className="font-body text-xs flex items-center gap-1" style={{ color: "rgba(222,229,255,0.28)" }}>
                <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                  <path d="M8.75 2.75a.75.75 0 0 0-1.5 0v5.69L5.03 6.22a.75.75 0 0 0-1.06 1.06l3.5 3.5a.75.75 0 0 0 1.06 0l3.5-3.5a.75.75 0 0 0-1.06-1.06L8.75 8.44V2.75Z" />
                  <path d="M3.5 9.75a.75.75 0 0 0-1.5 0v1.5A2.75 2.75 0 0 0 4.75 14h6.5A2.75 2.75 0 0 0 14 11.25v-1.5a.75.75 0 0 0-1.5 0v1.5c0 .69-.56 1.25-1.25 1.25h-6.5c-.69 0-1.25-.56-1.25-1.25v-1.5Z" />
                </svg>
                {wallpaper.downloadsCount.toLocaleString()} downloads
              </span>
            )}
          </div>

          <h1 className="font-headline text-2xl sm:text-3xl font-bold text-text-main leading-tight">
            {wallpaper.title}
          </h1>

          {wallpaper.description && (
            <p className="font-body text-sm leading-relaxed" style={{ color: "rgba(222,229,255,0.5)" }}>
              {wallpaper.description}
            </p>
          )}
        </div>

        {/* Categories */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {categories.map((c: any) => (
              <Link key={c.id} href={`/wallpapers?category=${c.slug}`}
                className="px-3 py-1.5 rounded-full font-body text-xs font-medium cursor-pointer transition-all duration-150 hover:brightness-125"
                style={{ background: "rgba(139,92,246,0.13)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.25)" }}>
                {c.name}
              </Link>
            ))}
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t: any) => (
              <span key={t.id} className="px-2.5 py-1 rounded-lg font-body text-[0.6875rem]"
                style={{ background: "rgba(255,255,255,0.04)", color: "rgba(222,229,255,0.38)", border: "1px solid rgba(255,255,255,0.07)" }}>
                #{t.name}
              </span>
            ))}
          </div>
        )}

        {/* Divider */}
        <div style={{ height: "1px", background: "rgba(255,255,255,0.06)" }} />

        {/* Inline ad — slot ID: AdSense → Ad units → Display ad */}
        <AdUnit slot="YOUR_WALLPAPER_DETAIL_SLOT_ID" className="rounded-xl overflow-hidden" />

        {/* Download CTA — opens ad gate with countdown */}
        <DownloadGate fileUrl={wallpaper.fileUrl} title={wallpaper.title} />

        {/* DMCA */}
        <div className="flex justify-end">
          <Link href="/dmca" className="font-body text-xs transition-colors hover:text-text-main/50"
            style={{ color: "rgba(222,229,255,0.2)" }}>
            Report copyright
          </Link>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div className="space-y-3 pt-2">
            <p className="font-body text-xs uppercase tracking-widest font-semibold"
              style={{ color: "rgba(222,229,255,0.3)" }}>
              {categories.length > 0 ? `More · ${categories[0].name}` : "More Wallpapers"}
            </p>
            {/* Horizontal scroll on mobile, wrap on desktop */}
            <div className="flex gap-3 overflow-x-auto pb-2 lg:flex-wrap lg:overflow-visible scrollbar-none"
              style={{ scrollSnapType: "x mandatory" }}>
              {related.map(w => (
                <div key={w.id} style={{ scrollSnapAlign: "start" }}>
                  <RelatedCard w={w} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
