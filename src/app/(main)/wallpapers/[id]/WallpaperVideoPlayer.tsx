"use client";

import { useRef, useState, useEffect } from "react";

export default function WallpaperVideoPlayer({ fileUrl }: { fileUrl: string }) {
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  return (
    <>
      <video ref={videoRef} src={fileUrl}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay loop muted playsInline />

      <div className="absolute top-3.5 left-3.5 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
        style={{ background: "rgba(6,14,32,0.7)", backdropFilter: "blur(10px)", border: "1px solid rgba(139,92,246,0.5)", color: "#c4b5fd" }}>
        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
        LIVE
      </div>

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
  );
}
