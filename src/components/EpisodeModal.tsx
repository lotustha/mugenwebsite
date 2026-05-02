"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface Episode {
  number?: number | string;
  title?: string;
  episodeId?: string;
  id?: string;
}

interface Props {
  episode: Episode | null;
  mediaTitle: string;
  onClose: () => void;
}

export default function EpisodeModal({ episode, mediaTitle, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <AnimatePresence>
      {episode && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-md w-full glass-dark rounded-2xl border border-primary/20 p-8 shadow-2xl"
            style={{ boxShadow: "0 0 40px rgba(186, 158, 255, 0.15)" }}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-text-main/50 hover:text-text-main transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 border border-primary/30 mx-auto mb-6">
              <svg className="w-8 h-8 text-primary" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>

            <h2 className="font-headline text-xl font-bold text-text-main text-center mb-2">
              {mediaTitle}
            </h2>
            <p className="font-body text-primary text-center text-sm mb-1">
              Episode {episode.number}
              {episode.title ? ` — ${episode.title}` : ""}
            </p>

            <div className="my-6 border-t border-outline-variant/20" />

            <p className="font-body text-text-main/70 text-center mb-6 leading-relaxed">
              To watch this episode, download the <span className="text-primary font-semibold">Mugen App</span> — free on Android, with full episodes, no ads.
            </p>

            <Link
              href="/apps"
              onClick={onClose}
              className="block w-full py-3 px-6 text-center font-headline font-semibold text-surface rounded-xl transition-all duration-200 bg-gradient-to-r from-primary to-primary-dim hover:opacity-90"
              style={{ boxShadow: "0 0 20px rgba(186, 158, 255, 0.3)" }}
            >
              Download Free App
            </Link>

            <p className="font-body text-text-main/40 text-xs text-center mt-4">
              Available for Android · iOS coming soon
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
