"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { postShareUrl, repost as doRepost } from "@/lib/social-client";
import { useCurrentUser } from "./SocialProvider";

/** Bottom-sheet share menu: native share, copy link, and internal repost. */
export default function ShareSheet({
  postId,
  open,
  onClose,
  onReposted,
}: {
  postId: string;
  open: boolean;
  onClose: () => void;
  onReposted?: () => void;
}) {
  const { user } = useCurrentUser();
  const [copied, setCopied] = useState(false);
  const [reposting, setReposting] = useState(false);
  const url = postShareUrl(postId);

  useEffect(() => {
    if (open) return;
    void Promise.resolve().then(() => setCopied(false));
  }, [open]);

  async function nativeShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ url, title: "Check out this post on MugenAnime" });
        onClose();
      } catch {
        /* cancelled */
      }
    } else {
      await copyLink();
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      /* ignore */
    }
  }

  async function handleRepost() {
    if (!user || reposting) return;
    setReposting(true);
    try {
      await doRepost(postId);
      onReposted?.();
      onClose();
    } finally {
      setReposting(false);
    }
  }

  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[130] flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div
            className="glass-dark relative w-full max-w-md rounded-t-3xl border border-white/10 p-5 sm:rounded-3xl"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-headline mb-4 text-lg font-semibold text-text-main">Share</h3>
            <div className="flex flex-col gap-2">
              <button onClick={nativeShare} className="glass-panel rounded-xl px-4 py-3 text-left text-text-main hover:border-brand">
                Share via…
              </button>
              <button onClick={copyLink} className="glass-panel rounded-xl px-4 py-3 text-left text-text-main hover:border-brand">
                {copied ? "Link copied ✓" : "Copy link"}
              </button>
              {user && (
                <button
                  onClick={handleRepost}
                  disabled={reposting}
                  className="bg-brand rounded-xl px-4 py-3 text-left font-semibold text-white disabled:opacity-60"
                >
                  {reposting ? "Reposting…" : "Repost to your feed"}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
