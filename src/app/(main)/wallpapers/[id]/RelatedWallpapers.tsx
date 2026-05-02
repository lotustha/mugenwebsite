"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";

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

export default function RelatedWallpapers({ items, label }: { items: any[]; label: string }) {
  if (!items.length) return null;
  return (
    <div className="space-y-3 pt-2">
      <p className="font-body text-xs uppercase tracking-widest font-semibold" style={{ color: "rgba(222,229,255,0.3)" }}>
        {label}
      </p>
      <div className="flex gap-3 overflow-x-auto pb-2 lg:flex-wrap lg:overflow-visible scrollbar-none"
        style={{ scrollSnapType: "x mandatory" }}>
        {items.map(w => (
          <div key={w.id} style={{ scrollSnapAlign: "start" }}>
            <RelatedCard w={w} />
          </div>
        ))}
      </div>
    </div>
  );
}
