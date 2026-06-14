"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { createPost, type SocialPost, type PostVisibility } from "@/lib/social-client";
import { useCurrentUser } from "./SocialProvider";
import UserAvatar from "./UserAvatar";
import AudiencePicker from "./AudiencePicker";

const MAX_CAPTION = 2200;
const MAX_IMAGE = 12 * 1024 * 1024; // 12MB
const MAX_VIDEO = 100 * 1024 * 1024; // 100MB

type Kind = "image" | "video";

/** Modal composer for creating a social post (image or video) with caption + anime tag. */
export default function PostComposer({
  open,
  onClose,
  onCreated,
  initialAnimeTag,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (post: SocialPost) => void;
  initialAnimeTag?: string;
}) {
  const { user, loading: authLoading } = useCurrentUser();
  const router = useRouter();
  const pathname = usePathname();
  const reduce = useReducedMotion();

  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<Kind | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [animeTag, setAnimeTag] = useState(initialAnimeTag ?? "");
  const [visibility, setVisibility] = useState<PostVisibility>("PUBLIC");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dragging, setDragging] = useState(false);

  // Anime tag autocomplete (real titles from the anime API).
  const [animeResults, setAnimeResults] = useState<{ id: string; title: string; image?: string }[]>([]);
  const [animeOpen, setAnimeOpen] = useState(false);
  const [animeSearching, setAnimeSearching] = useState(false);
  const animeSkipRef = useRef(false); // suppress the search fired by selecting a suggestion

  const inputRef = useRef<HTMLInputElement | null>(null);

  const clearPreview = useCallback(() => {
    setPreviewUrl((url) => {
      if (url) URL.revokeObjectURL(url);
      return null;
    });
  }, []);

  const reset = useCallback(() => {
    clearPreview();
    setFile(null);
    setKind(null);
    setCaption("");
    setAnimeTag(initialAnimeTag ?? "");
    setVisibility("PUBLIC");
    setAnimeResults([]);
    setAnimeOpen(false);
    setError(null);
    setSubmitting(false);
    setDragging(false);
  }, [clearPreview, initialAnimeTag]);

  // Revoke object URL on unmount.
  useEffect(() => () => clearPreview(), [clearPreview]);

  // Auth double-check: the entry points guard this, but if opened while signed
  // out, redirect to login instead of showing the composer.
  useEffect(() => {
    if (!open || authLoading || user) return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) router.push(`/auth/login?next=${encodeURIComponent(pathname)}`);
    });
    return () => {
      cancelled = true;
    };
  }, [open, authLoading, user, router, pathname]);

  // Lock body scroll while open + close on Escape.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, submitting]);

  // Pre-tag with the anime when opened from an anime discussion page.
  useEffect(() => {
    if (!open) return;
    animeSkipRef.current = true; // don't auto-search the seeded value
    void Promise.resolve().then(() => setAnimeTag(initialAnimeTag ?? ""));
  }, [open, initialAnimeTag]);

  // Debounced anime-title search against the anime API for the tag field.
  useEffect(() => {
    if (animeSkipRef.current) {
      animeSkipRef.current = false;
      return;
    }
    const q = animeTag.trim();
    let cancelled = false;
    // All state updates live inside the deferred timeout (never synchronously in
    // the effect body) to avoid cascading renders.
    const t = setTimeout(async () => {
      if (q.length < 2) {
        setAnimeResults([]);
        setAnimeOpen(false);
        return;
      }
      setAnimeSearching(true);
      try {
        const res = await fetch(`/api/anime/search?query=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (cancelled) return;
        // API returns { results: [...] }; tolerate a bare array or { data: [...] } too.
        const raw = Array.isArray(data) ? data : data?.results ?? data?.data ?? [];
        const list = Array.isArray(raw) ? raw : [];
        setAnimeResults(
          list
            .slice(0, 6)
            .map((a: { id?: unknown; title?: unknown; image?: unknown }) => ({
              id: String(a.id ?? ""),
              title: String(a.title ?? ""),
              image: typeof a.image === "string" ? a.image : undefined,
            }))
            .filter((a) => a.title),
        );
        setAnimeOpen(true);
      } catch {
        if (!cancelled) setAnimeResults([]);
      } finally {
        if (!cancelled) setAnimeSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [animeTag]);

  function selectAnime(title: string) {
    animeSkipRef.current = true; // don't immediately re-search the value we just set
    setAnimeTag(title.slice(0, 80));
    setAnimeResults([]);
    setAnimeOpen(false);
  }

  function handleClose() {
    if (submitting) return;
    reset();
    onClose();
  }

  function pickFile(f: File) {
    setError(null);
    const isImage = f.type.startsWith("image/");
    const isVideo = f.type.startsWith("video/");
    if (!isImage && !isVideo) {
      setError("Please choose an image or a video file.");
      return;
    }
    if (isImage && f.size > MAX_IMAGE) {
      setError("Images must be 12MB or smaller.");
      return;
    }
    if (isVideo && f.size > MAX_VIDEO) {
      setError("Videos must be 100MB or smaller.");
      return;
    }
    clearPreview();
    setFile(f);
    setKind(isImage ? "image" : "video");
    setPreviewUrl(URL.createObjectURL(f));
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) pickFile(f);
    e.target.value = ""; // allow re-picking same file
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) pickFile(f);
  }

  async function handleSubmit() {
    if (submitting) return;
    if (!file && !caption.trim()) return; // need media or text
    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData();
      if (file) form.set("file", file);
      if (caption.trim()) form.set("caption", caption.trim());
      if (animeTag.trim()) form.set("animeTag", animeTag.trim());
      form.set("visibility", visibility);
      const res = await createPost(form);
      onCreated(res.post);
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  const overlayMotion = reduce
    ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };
  const sheetMotion = reduce
    ? { initial: { opacity: 1, y: 0 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0 } }
    : { initial: { opacity: 0, y: 24, scale: 0.98 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: 24, scale: 0.98 } };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          {...overlayMotion}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[120] grid place-items-end overflow-y-auto bg-black/70 backdrop-blur-sm sm:place-items-center sm:p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <motion.div
            {...sheetMotion}
            transition={{ duration: 0.22, ease: "easeOut" }}
            role="dialog"
            aria-modal="true"
            aria-label="Create a post"
            className="glass-dark relative w-full max-w-xl rounded-t-3xl border border-outline-variant sm:rounded-3xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-outline-variant px-5 py-4">
              <h2 className="font-headline text-lg font-semibold text-text-main">Create post</h2>
              <button
                type="button"
                onClick={handleClose}
                disabled={submitting}
                aria-label="Close"
                className="grid h-9 w-9 place-items-center rounded-full text-text-main/60 transition-colors hover:bg-white/10 hover:text-text-main disabled:opacity-40"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="max-h-[75vh] space-y-4 overflow-y-auto px-5 py-4">
              {/* Author row */}
              {user && (
                <div className="flex items-center gap-3">
                  <UserAvatar user={user} size="md" link={false} />
                  <div className="min-w-0">
                    <p className="font-headline truncate font-semibold text-text-main">
                      {user.displayName || user.username || "You"}
                    </p>
                    <div className="mt-1">
                      <AudiencePicker value={visibility} onChange={setVisibility} />
                    </div>
                  </div>
                </div>
              )}

              {/* Drop zone / preview */}
              {!previewUrl ? (
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                  className={`flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
                    dragging ? "border-primary bg-brand-soft" : "border-outline-variant bg-surface-low hover:border-primary/60"
                  }`}
                >
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                  </svg>
                  <div>
                    <p className="font-medium text-text-main">Drop a photo or video</p>
                    <p className="mt-1 text-sm text-text-main/50">or click to browse · images ≤12MB · video ≤100MB</p>
                  </div>
                </button>
              ) : (
                <div className="relative overflow-hidden rounded-2xl bg-black">
                  {kind === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewUrl} alt="Selected preview" className="max-h-[50vh] w-full object-contain" />
                  ) : (
                    <video src={previewUrl} controls playsInline className="max-h-[50vh] w-full object-contain" />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      clearPreview();
                      setFile(null);
                      setKind(null);
                    }}
                    disabled={submitting}
                    aria-label="Remove media"
                    className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white backdrop-blur transition-colors hover:bg-black/80 disabled:opacity-40"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              <input
                ref={inputRef}
                type="file"
                accept="image/*,video/*"
                onChange={onInputChange}
                className="hidden"
              />

              {/* Caption */}
              <div>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value.slice(0, MAX_CAPTION))}
                  rows={3}
                  placeholder="Share what's on your mind…"
                  className="w-full resize-none rounded-xl border border-outline-variant bg-surface-low px-4 py-3 text-[15px] text-text-main placeholder:text-text-main/40 focus:border-primary focus:outline-none"
                />
                <div className="mt-1 text-right text-xs text-text-main/40 tabular-nums">
                  {caption.length}/{MAX_CAPTION}
                </div>
              </div>

              {/* Anime tag — autocomplete from the anime API */}
              <div>
                <div className="relative">
                  <span className="text-brand pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium">#</span>
                  <input
                    type="text"
                    value={animeTag}
                    onChange={(e) => setAnimeTag(e.target.value.slice(0, 80))}
                    onFocus={() => animeResults.length > 0 && setAnimeOpen(true)}
                    autoComplete="off"
                    placeholder="Tag an anime… e.g. Jujutsu Kaisen"
                    className="w-full rounded-xl border border-outline-variant bg-surface-low py-3 pl-8 pr-10 text-[15px] text-text-main placeholder:text-text-main/40 focus:border-primary focus:outline-none"
                  />
                  {animeSearching && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                  )}
                </div>

                {animeOpen && animeResults.length > 0 && (
                  <ul className="mt-2 overflow-hidden rounded-xl border border-outline-variant bg-surface-low">
                    {animeResults.map((a) => (
                      <li key={a.id || a.title}>
                        <button
                          type="button"
                          onClick={() => selectAnime(a.title)}
                          className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-white/5"
                        >
                          <span className="relative h-12 w-9 flex-none overflow-hidden rounded bg-surface">
                            {a.image && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={a.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                            )}
                          </span>
                          <span className="truncate text-sm text-text-main">{a.title}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {animeOpen && !animeSearching && animeResults.length === 0 && animeTag.trim().length >= 2 && (
                  <p className="mt-2 px-1 text-xs text-text-main/40">No anime found — you can still post this tag as-is.</p>
                )}
              </div>

              {error && (
                <p className="rounded-xl bg-red-500/10 px-4 py-2.5 text-sm text-red-300" role="alert">
                  {error}
                </p>
              )}

              {submitting && kind === "video" && (
                <p className="text-sm text-tertiary">Uploading… we&apos;ll optimize your video automatically.</p>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-outline-variant px-5 py-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={submitting}
                className="rounded-full px-5 py-2.5 text-sm font-medium text-text-main/70 transition-colors hover:bg-white/10 hover:text-text-main disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={(!file && !caption.trim()) || submitting}
                className="bg-brand flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                )}
                {submitting ? "Posting…" : "Post"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
