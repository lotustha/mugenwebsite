"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { updatePost, type SocialPost, type PostVisibility } from "@/lib/social-client";
import AudiencePicker from "./AudiencePicker";

const MAX_CAPTION = 2200;

/** Edit a post's caption, anime tag, and audience. */
export default function EditPostModal({
  post,
  open,
  onClose,
  onUpdated,
}: {
  post: SocialPost;
  open: boolean;
  onClose: () => void;
  onUpdated: (post: SocialPost) => void;
}) {
  const [caption, setCaption] = useState(post.caption ?? "");
  const [animeTag, setAnimeTag] = useState(post.animeTag ?? "");
  const [visibility, setVisibility] = useState<PostVisibility>(post.visibility);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isText = post.type === "TEXT";

  async function save() {
    if (saving) return;
    if (isText && !caption.trim()) {
      setError("Text posts can’t be empty.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await updatePost(post.id, {
        caption: caption.trim(),
        animeTag: animeTag.trim() || null,
        visibility,
      });
      onUpdated(updated);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t save changes.");
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[130] grid place-items-end bg-black/70 backdrop-blur-sm sm:place-items-center sm:p-4"
          onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            role="dialog"
            aria-modal="true"
            aria-label="Edit post"
            className="glass-dark w-full max-w-lg rounded-t-3xl border border-outline-variant sm:rounded-3xl"
          >
            <div className="flex items-center justify-between border-b border-outline-variant px-5 py-4">
              <h2 className="font-headline text-lg font-semibold text-text-main">Edit post</h2>
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                aria-label="Close"
                className="grid h-9 w-9 place-items-center rounded-full text-text-main/60 transition-colors hover:bg-white/10 hover:text-text-main disabled:opacity-40"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div>
                <AudiencePicker value={visibility} onChange={setVisibility} />
              </div>

              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value.slice(0, MAX_CAPTION))}
                rows={isText ? 5 : 3}
                placeholder={isText ? "What's on your mind?" : "Write a caption…"}
                className="w-full resize-none rounded-xl border border-outline-variant bg-surface-low px-4 py-3 text-[15px] text-text-main placeholder:text-text-main/40 focus:border-primary focus:outline-none"
              />

              <div className="relative">
                <span className="text-brand pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium">#</span>
                <input
                  type="text"
                  value={animeTag}
                  onChange={(e) => setAnimeTag(e.target.value.slice(0, 80))}
                  placeholder="Anime tag (optional)"
                  className="w-full rounded-xl border border-outline-variant bg-surface-low py-3 pl-8 pr-4 text-[15px] text-text-main placeholder:text-text-main/40 focus:border-primary focus:outline-none"
                />
              </div>

              {error && (
                <p className="rounded-xl bg-red-500/10 px-4 py-2.5 text-sm text-red-300" role="alert">
                  {error}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-outline-variant px-5 py-4">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="rounded-full px-5 py-2.5 text-sm font-medium text-text-main/70 transition-colors hover:bg-white/10 hover:text-text-main disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="bg-brand flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
              >
                {saving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
