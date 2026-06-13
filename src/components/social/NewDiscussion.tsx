"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCurrentUser } from "./SocialProvider";
import type { DiscussionListItem } from "./DiscussionCard";

const TITLE_MAX = 200;
const TAG_MAX = 80;
const CONTENT_MAX = 10000;

/** Modal composer for creating a new discussion thread. */
export default function NewDiscussion({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (d: DiscussionListItem) => void;
}) {
  const reduce = useReducedMotion();
  const { user } = useCurrentUser();
  const pathname = usePathname();

  const [title, setTitle] = useState("");
  const [animeTag, setAnimeTag] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setTitle("");
    setAnimeTag("");
    setContent("");
    setError(null);
    setSubmitting(false);
  };

  const close = () => {
    if (submitting) return;
    onClose();
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const t = title.trim();
    const c = content.trim();
    if (!t || !c) {
      setError("Title and content are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/social/discussions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: t, content: c, animeTag: animeTag.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Could not create discussion.");
        setSubmitting(false);
        return;
      }
      onCreated(data.discussion as DiscussionListItem);
      reset();
      onClose();
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="New discussion"
            initial={reduce ? false : { opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.22 }}
            className="glass-dark relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-outline-variant/70 p-5 sm:rounded-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-headline text-lg font-semibold text-text-main">New discussion</h2>
              <button
                type="button"
                onClick={close}
                className="rounded-full p-1.5 text-text-main/60 transition-colors hover:bg-white/5 hover:text-text-main"
                aria-label="Close"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {!user ? (
              <div className="py-6 text-center">
                <p className="text-sm text-text-main/70">Log in to start a discussion.</p>
                <Link
                  href={`/auth/login?next=${encodeURIComponent(pathname)}`}
                  className="bg-brand mt-4 inline-block rounded-full px-5 py-2 text-sm font-semibold text-white"
                >
                  Log in
                </Link>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
                    placeholder="Discussion title"
                    maxLength={TITLE_MAX}
                    autoFocus
                    className="w-full rounded-xl border border-outline-variant/70 bg-surface-low px-3.5 py-2.5 text-sm text-text-main placeholder:text-text-main/40 focus:border-primary/60 focus:outline-none"
                  />
                  <div className="mt-1 text-right text-[11px] text-text-main/40">
                    {title.length}/{TITLE_MAX}
                  </div>
                </div>

                <input
                  type="text"
                  value={animeTag}
                  onChange={(e) => setAnimeTag(e.target.value.slice(0, TAG_MAX))}
                  placeholder="Anime tag (optional, e.g. One Piece)"
                  maxLength={TAG_MAX}
                  className="w-full rounded-xl border border-outline-variant/70 bg-surface-low px-3.5 py-2.5 text-sm text-text-main placeholder:text-text-main/40 focus:border-primary/60 focus:outline-none"
                />

                <div>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value.slice(0, CONTENT_MAX))}
                    placeholder="What's on your mind? Markdown-ish formatting and line breaks are kept."
                    maxLength={CONTENT_MAX}
                    rows={7}
                    className="w-full resize-y rounded-xl border border-outline-variant/70 bg-surface-low px-3.5 py-2.5 text-sm leading-relaxed text-text-main placeholder:text-text-main/40 focus:border-primary/60 focus:outline-none"
                  />
                  <div className="mt-1 text-right text-[11px] text-text-main/40">
                    {content.length}/{CONTENT_MAX}
                  </div>
                </div>

                {error && <p className="text-sm text-secondary">{error}</p>}

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={close}
                    disabled={submitting}
                    className="rounded-full px-4 py-2 text-sm font-medium text-text-main/70 transition-colors hover:text-text-main disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !title.trim() || !content.trim()}
                    className="bg-brand rounded-full px-5 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
                  >
                    {submitting ? "Posting…" : "Post discussion"}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
