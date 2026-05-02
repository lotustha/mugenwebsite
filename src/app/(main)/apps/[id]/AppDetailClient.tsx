"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  motion,
  useScroll,
  useTransform,
  useInView,
  useReducedMotion,
  AnimatePresence,
} from "framer-motion";

// ─── Tokens ────────────────────────────────────────────────────────────────────
const surf    = "rgba(9,19,40,0.55)";
const surfD   = "rgba(6,14,32,0.72)";
const bdr     = "rgba(255,255,255,0.07)";
const purple  = "#8B5CF6";
const magenta = "#D946EF";
const textMut = "rgba(222,229,255,0.4)";
const textDim = "rgba(222,229,255,0.22)";

// ─── Scroll-reveal wrapper ─────────────────────────────────────────────────────
function Reveal({
  children, delay = 0, className = "",
}: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduce = useReducedMotion();
  return (
    <motion.div ref={ref} className={className}
      initial={reduce ? false : { opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}

// ─── FAQ accordion item ────────────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b" style={{ borderColor: bdr }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-4 py-4 text-left cursor-pointer group">
        <span className="font-body text-sm font-medium text-text-main group-hover:text-primary transition-colors">{q}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 flex-none" style={{ color: textMut }}>
            <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
          </svg>
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}>
            <p className="pb-4 font-body text-sm leading-relaxed" style={{ color: textMut }}>{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Video embed ───────────────────────────────────────────────────────────────
function VideoEmbed({ url }: { url: string }) {
  const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");
  let embedUrl = url;
  if (isYouTube) {
    const id = url.match(/(?:v=|youtu\.be\/|embed\/)([^&?/]+)/)?.[1];
    if (id) embedUrl = `https://www.youtube.com/embed/${id}?autoplay=0&rel=0`;
  }
  return isYouTube ? (
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden" style={{ background: surfD }}>
      <iframe src={embedUrl} className="absolute inset-0 w-full h-full" allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
    </div>
  ) : (
    <video src={url} controls className="w-full rounded-2xl" style={{ background: surfD }} />
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function AppDetailClient({ app }: { app: any }) {
  const reduce = useReducedMotion();

  const heroRef   = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const bannerY   = useTransform(scrollYProgress, [0, 1], ["0%", "25%"]);
  const bannerOp  = useTransform(scrollYProgress, [0, 0.7], [1, 0.3]);
  const contentY  = useTransform(scrollYProgress, [0, 1], ["0%", "15%"]);

  const playStore   = app.links?.find((l: any) => l.platform.toLowerCase().includes("play") || l.platform.toLowerCase().includes("google"));
  const apkLink     = app.links?.find((l: any) => l.platform.toLowerCase().includes("apk"));
  const iosLink     = app.links?.find((l: any) => l.platform.toLowerCase().includes("ios") || l.platform.toLowerCase().includes("apple"));
  const screenshots: any[] = app.screenshots ?? [];
  const faqs: any[]        = app.faqs ?? [];
  const appSlug = app.slug ?? app.id;

  return (
    <div className="min-h-screen">

      {/* ── Hero ── */}
      <div ref={heroRef} className="relative h-[340px] md:h-[400px] overflow-hidden"
        style={{ background: "linear-gradient(135deg,rgba(139,92,246,0.3),rgba(217,70,239,0.2))" }}>

        {/* Parallax banner */}
        {app.bannerUrl && (
          <motion.div className="absolute inset-0" style={{ y: reduce ? 0 : bannerY, opacity: reduce ? 1 : bannerOp }}>
            <Image src={app.bannerUrl} alt={app.name} fill sizes="100vw" className="object-cover scale-110" priority />
          </motion.div>
        )}

        {/* Gradient overlays */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom,rgba(6,14,32,0.2) 0%,rgba(6,14,32,0.92) 100%)" }} />

        {/* Ambient orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div className="absolute -top-20 -left-20 w-80 h-80 rounded-full blur-[100px]"
            style={{ background: "rgba(139,92,246,0.25)" }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.9, 0.6] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} />
          <motion.div className="absolute -bottom-10 right-0 w-60 h-60 rounded-full blur-[80px]"
            style={{ background: "rgba(217,70,239,0.18)" }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut", delay: 1 }} />
        </div>

        {/* Hero content */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 flex items-end gap-5"
          style={{ y: reduce ? 0 : contentY }}>

          {/* Icon */}
          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.7, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, type: "spring", stiffness: 200, damping: 20 }}
            className="w-20 h-20 rounded-3xl overflow-hidden flex-none flex items-center justify-center"
            style={{ background: `linear-gradient(135deg,${purple},${magenta})`, border: "4px solid rgba(6,14,32,0.8)", boxShadow: "0 8px 32px rgba(139,92,246,0.5)" }}>
            {app.iconUrl
              ? <Image src={app.iconUrl} alt={app.name} width={80} height={80} className="w-full h-full object-cover" />
              : <svg viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-white"><path d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18h3" /></svg>
            }
          </motion.div>

          {/* Title */}
          <motion.div className="flex-1 min-w-0"
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-headline text-2xl md:text-3xl font-bold text-white">{app.name}</h1>
              {app.category && (
                <span className="px-2.5 py-1 rounded-full font-body text-xs font-semibold"
                  style={{ background: "rgba(139,92,246,0.3)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.5)" }}>
                  {app.category}
                </span>
              )}
            </div>
            {app.tagline && <p className="font-body text-sm mt-1" style={{ color: "rgba(222,229,255,0.75)" }}>{app.tagline}</p>}
            <p className="font-body text-xs mt-1" style={{ color: "rgba(222,229,255,0.4)" }}>
              Version {app.version}{app.size ? ` · ${app.size}` : ""}
            </p>
          </motion.div>
        </motion.div>
      </div>

      {/* ── Download strip ── */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.4, ease: "easeOut" }}
        style={{ background: surfD, borderBottom: `1px solid ${bdr}` }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center gap-3">
          {playStore && (
            <motion.a href={playStore.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-headline text-sm font-bold cursor-pointer"
              style={{ background: `linear-gradient(135deg,${purple},${magenta})`, color: "white", boxShadow: "0 4px 20px rgba(139,92,246,0.35)" }}
              whileHover={reduce ? {} : { scale: 1.04, boxShadow: "0 8px 32px rgba(139,92,246,0.5)" }}
              whileTap={reduce ? {} : { scale: 0.97 }}>
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="m12.954 11.616 2.957-2.957L6.36 3.291c-.633-.342-1.226-.39-1.66-.09l8.254 8.415Zm3.461 3.462 3.074-1.729c.6-.336.929-.812.929-1.348s-.329-1.012-.929-1.348l-3.074-1.729-3.299 3.299 3.299 3.855Zm-4.512 1.127L3.65 20.591c.434.3 1.027.252 1.66-.09l9.552-5.368-3.41-3.928Zm-2.75-2.75L.856 4.78C.57 5.14.4 5.732.4 6.487v11.026c0 .755.17 1.347.456 1.707l8.297-5.765Z" />
              </svg>
              Google Play
            </motion.a>
          )}
          {apkLink && (
            <motion.a href={apkLink.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-headline text-sm font-semibold cursor-pointer"
              style={{ color: "#ba9eff", border: "1px solid rgba(139,92,246,0.3)" }}
              whileHover={reduce ? {} : { scale: 1.04, background: "rgba(139,92,246,0.08)" }}
              whileTap={reduce ? {} : { scale: 0.97 }}>
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
                <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
              </svg>
              APK Direct
            </motion.a>
          )}
          {iosLink && (
            <motion.a href={iosLink.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-headline text-sm font-semibold cursor-pointer"
              style={{ color: "#94a3b8", border: `1px solid ${bdr}` }}
              whileHover={reduce ? {} : { scale: 1.04 }}
              whileTap={reduce ? {} : { scale: 0.97 }}>
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2Zm.707 14.293a1 1 0 0 1-1.414 0l-3-3a1 1 0 0 1 1.414-1.414L12 14.172l2.293-2.293a1 1 0 0 1 1.414 1.414l-3 3Z" /></svg>
              App Store
            </motion.a>
          )}
          <Link href="/apps" className="ml-auto font-body text-sm transition-colors hover:text-text-main" style={{ color: textMut }}>
            ← All Apps
          </Link>
        </div>
      </motion.div>

      {/* ── Body ── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-14">

        {/* Screenshots */}
        {screenshots.length > 0 && (
          <Reveal>
            <h2 className="font-headline text-xl font-bold text-text-main mb-5">Screenshots</h2>
            <motion.div
              className="flex gap-4 overflow-x-auto pb-4 scrollbar-none"
              style={{ scrollSnapType: "x mandatory" }}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              variants={{ visible: { transition: { staggerChildren: 0.09 } } }}>
              {screenshots.map((s, i) => (
                <motion.div key={i} className="flex-none"
                  style={{ scrollSnapAlign: "start", width: "min(220px, 68vw)" }}
                  variants={reduce ? {} : {
                    hidden: { opacity: 0, x: 30, scale: 0.95 },
                    visible: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
                  }}
                  whileHover={reduce ? {} : { y: -8, scale: 1.03, transition: { duration: 0.25 } }}>
                  <div className="relative aspect-[9/16] rounded-2xl overflow-hidden"
                    style={{ background: surfD, border: `1px solid ${bdr}`, boxShadow: "0 16px 40px rgba(0,0,0,0.4)" }}>
                    <Image src={s.url} alt={s.caption || `${app.name} screenshot ${i + 1}`} fill sizes="220px" className="object-cover" />
                  </div>
                  {s.caption && (
                    <p className="font-body text-xs text-center mt-2" style={{ color: textDim }}>{s.caption}</p>
                  )}
                </motion.div>
              ))}
            </motion.div>
          </Reveal>
        )}

        {/* Description */}
        {app.description && (
          <Reveal>
            <h2 className="font-headline text-xl font-bold text-text-main mb-3">About {app.name}</h2>
            <div className="font-body text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "rgba(222,229,255,0.65)" }}>
              {app.description}
            </div>
          </Reveal>
        )}

        {/* Video */}
        {app.videoUrl && (
          <Reveal>
            <h2 className="font-headline text-xl font-bold text-text-main mb-4">See It in Action</h2>
            <VideoEmbed url={app.videoUrl} />
          </Reveal>
        )}

        {/* App details grid */}
        <Reveal>
          <motion.div
            className="rounded-2xl p-6 grid grid-cols-2 sm:grid-cols-4 gap-6"
            style={{ background: surf, border: `1px solid ${bdr}` }}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={{ visible: { transition: { staggerChildren: 0.07 } } }}>
            {[
              { label: "Version",  value: app.version },
              { label: "Size",     value: app.size || "—" },
              { label: "Category", value: app.category || "—" },
              { label: "Updated",  value: new Date(app.updatedAt).toLocaleDateString() },
            ].map(({ label, value }) => (
              <motion.div key={label}
                variants={reduce ? {} : {
                  hidden: { opacity: 0, y: 12 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
                }}>
                <p className="font-body text-[0.625rem] uppercase tracking-widest font-semibold mb-1.5" style={{ color: textDim }}>{label}</p>
                <p className="font-headline text-base font-bold text-text-main">{value}</p>
              </motion.div>
            ))}
          </motion.div>
        </Reveal>

        {/* FAQ */}
        {faqs.length > 0 && (
          <Reveal>
            <h2 className="font-headline text-xl font-bold text-text-main mb-3">
              Frequently Asked Questions
            </h2>
            <div className="rounded-2xl overflow-hidden" style={{ background: surf, border: `1px solid ${bdr}` }}>
              <div className="px-5 divide-y" style={{ borderColor: bdr }}>
                {faqs.map((f: any, i: number) => <FaqItem key={i} q={f.question} a={f.answer} />)}
              </div>
            </div>
          </Reveal>
        )}

        {/* Download links */}
        {(app.links ?? []).length > 0 && (
          <Reveal>
            <h2 className="font-headline text-xl font-bold text-text-main mb-4">Download Links</h2>
            <motion.div className="grid sm:grid-cols-2 gap-3"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={{ visible: { transition: { staggerChildren: 0.08 } } }}>
              {app.links.map((link: any) => (
                <motion.a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 rounded-xl cursor-pointer"
                  style={{ background: surfD, border: `1px solid ${bdr}` }}
                  variants={reduce ? {} : {
                    hidden: { opacity: 0, y: 16 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
                  }}
                  whileHover={reduce ? {} : {
                    borderColor: "rgba(139,92,246,0.4)",
                    boxShadow: "0 4px 24px rgba(139,92,246,0.12)",
                    x: 3,
                    transition: { duration: 0.18 },
                  }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-none"
                    style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.25)" }}>
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" style={{ color: "#ba9eff" }}>
                      <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
                      <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-headline text-sm font-semibold text-text-main">{link.platform}</p>
                    <p className="font-body text-xs truncate" style={{ color: textMut }}>{link.url}</p>
                  </div>
                  <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 flex-none" style={{ color: textDim }}>
                    <path fillRule="evenodd" d="M8.914 6.025a.75.75 0 0 1 1.06 0 3.5 3.5 0 0 1 0 4.95l-2 2a3.5 3.5 0 0 1-4.95-4.95l1.5-1.5a.75.75 0 0 1 1.06 1.06l-1.5 1.5a2 2 0 0 0 2.83 2.83l2-2a2 2 0 0 0 0-2.83.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                    <path fillRule="evenodd" d="M7.086 9.975a.75.75 0 0 1-1.06 0 3.5 3.5 0 0 1 0-4.95l2-2a3.5 3.5 0 0 1 4.95 4.95l-1.5 1.5a.75.75 0 1 1-1.06-1.06l1.5-1.5a2 2 0 0 0-2.83-2.83l-2 2a2 2 0 0 0 0 2.83.75.75 0 0 1 0 1.06Z" clipRule="evenodd" />
                  </svg>
                </motion.a>
              ))}
            </motion.div>
          </Reveal>
        )}

        {/* Footer links */}
        <Reveal>
          <div className="flex flex-wrap items-center gap-4 pt-4 border-t" style={{ borderColor: bdr }}>
            {app.privacyPolicy && (
              <Link href={`/apps/${appSlug}/privacy-policy`}
                className="font-body text-sm transition-colors hover:text-primary" style={{ color: textMut }}>
                Privacy Policy
              </Link>
            )}
            <span className="font-body text-xs" style={{ color: textDim }}>Package: {app.packageName || "—"}</span>
            <Link href="/apps" className="ml-auto font-body text-sm transition-colors hover:text-text-main/60" style={{ color: textDim }}>
              ← All Apps
            </Link>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
