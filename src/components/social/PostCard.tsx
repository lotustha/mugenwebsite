"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { deletePost, postShareUrl, toggleLike, type SocialPost } from "@/lib/social-client";
import { useCurrentUser } from "./SocialProvider";
import UserAvatar from "./UserAvatar";
import RelativeTime from "./RelativeTime";
import LikeButton from "./LikeButton";
import ShareSheet from "./ShareSheet";
import VerifiedBadge from "./VerifiedBadge";
import EditPostModal from "./EditPostModal";
import { AudienceIcon } from "./AudiencePicker";

/**
 * Instagram-style feed post card: avatar header → media (double-tap to like) →
 * action bar (like / comment / share) → likes count → "username + caption" →
 * "View all N comments" → timestamp. Dark anime theme + real data only.
 */
export default function PostCard({
  post,
  onAuthRequired,
  onUpdated,
  onDeleted,
  priority = false,
}: {
  post: SocialPost;
  onAuthRequired?: () => void;
  onUpdated?: (post: SocialPost) => void;
  onDeleted?: (id: string) => void;
  priority?: boolean;
}) {
  const { user } = useCurrentUser();
  const [shareOpen, setShareOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const canManage = !!user && (user.id === post.author.id || user.role === "ADMIN");
  // Like state is lifted here so the heart, the "N likes" line and double-tap stay in sync.
  const [liked, setLiked] = useState(post.liked);
  const [likeCount, setLikeCount] = useState(post.likesCount);
  const [busy, setBusy] = useState(false);
  const [heartBurst, setHeartBurst] = useState(false);

  const display = post.author.displayName || post.author.username || "Anonymous";
  // For reposts, the media lives on the original post.
  const media = post.repostOf ?? post;
  const isText = media.type === "TEXT";

  async function doToggle() {
    if (!user) {
      onAuthRequired?.();
      return;
    }
    if (busy) return;
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    setBusy(true);
    try {
      const res = await toggleLike(post.id, liked);
      setLiked(res.liked);
      setLikeCount(res.likesCount);
    } catch {
      setLiked(liked); // revert
      setLikeCount(post.likesCount);
    } finally {
      setBusy(false);
    }
  }

  function onDoubleTapMedia() {
    if (!user) {
      onAuthRequired?.();
      return;
    }
    setHeartBurst(true);
    window.setTimeout(() => setHeartBurst(false), 650);
    if (!liked) void doToggle(); // IG double-tap only ever likes, never unlikes
  }

  // Close the ⋯ menu on outside click.
  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  async function copyLink() {
    setMenuOpen(false);
    try {
      await navigator.clipboard.writeText(postShareUrl(post.id));
    } catch {
      /* ignore */
    }
  }

  async function handleDelete() {
    setMenuOpen(false);
    if (deleting) return;
    if (typeof window !== "undefined" && !window.confirm("Delete this post? This can’t be undone.")) return;
    setDeleting(true);
    try {
      await deletePost(post.id);
      onDeleted?.(post.id);
    } catch {
      setDeleting(false);
    }
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="glass-panel overflow-hidden rounded-2xl"
    >
      <header className="flex items-center gap-3 p-3.5">
        <UserAvatar user={post.author} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {post.author.username ? (
              <Link href={`/u/${post.author.username}`} className="font-headline truncate font-semibold text-text-main hover:underline">
                {display}
              </Link>
            ) : (
              <span className="font-headline truncate font-semibold text-text-main">{display}</span>
            )}
            {post.author.verified && <VerifiedBadge size={15} />}
            {post.repostOf && <span className="shrink-0 text-xs text-text-main/50">· reposted</span>}
          </div>
          {post.author.username && <p className="truncate text-xs text-text-main/50">@{post.author.username}</p>}
        </div>
        {media.animeTag && (
          <span className="bg-brand-soft text-brand hidden shrink-0 rounded-full px-3 py-1 text-xs font-medium sm:inline">
            #{media.animeTag}
          </span>
        )}

        {/* ⋯ options menu */}
        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Post options"
            className="grid h-8 w-8 place-items-center rounded-full text-text-main/50 transition-colors hover:bg-white/10 hover:text-text-main"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
            </svg>
          </button>
          {menuOpen && (
            <div className="glass-dark absolute right-0 top-full z-30 mt-1 w-44 overflow-hidden rounded-2xl border border-outline-variant p-1.5 shadow-xl">
              {canManage && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setEditing(true);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-text-main transition-colors hover:bg-white/5"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Edit post
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-red-300 transition-colors hover:bg-red-500/10"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                    </svg>
                    Delete post
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={copyLink}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-text-main transition-colors hover:bg-white/5"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                Copy link
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Text-only status: caption is the body. */}
      {isText ? (
        media.caption && (
          <p className="whitespace-pre-wrap break-words px-4 pb-3 text-[17px] leading-relaxed text-text-main">
            {media.caption}
          </p>
        )
      ) : (
        /* Media (double-tap to like on images) */
        <div className="relative" onDoubleClick={media.type === "IMAGE" ? onDoubleTapMedia : undefined}>
          <PostMedia post={media} priority={priority} />
          <AnimatePresence>
            {heartBurst && (
              <motion.div
                key="bigheart"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.25, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="pointer-events-none absolute inset-0 grid place-items-center"
              >
                <svg width="96" height="96" viewBox="0 0 24 24" fill="#fff" style={{ filter: "drop-shadow(0 4px 14px rgba(0,0,0,0.45))" }}>
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center gap-4 px-3.5 pt-3">
        <LikeButton
          postId={post.id}
          liked={liked}
          count={likeCount}
          controlled
          onToggle={doToggle}
          showCount={false}
          onAuthRequired={onAuthRequired}
          size={26}
        />
        <Link
          href={`/social/${post.id}`}
          className="text-text-main/80 transition-colors hover:text-tertiary"
          aria-label="Comments"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        </Link>
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          className="ml-auto text-text-main/80 transition-colors hover:text-primary"
          aria-label="Share"
        >
          {/* paper-plane (IG share) */}
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
            <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </button>
      </div>

      {/* Likes count */}
      {likeCount > 0 && (
        <p className="px-3.5 pt-2 text-sm font-semibold text-text-main">
          {likeCount.toLocaleString()} {likeCount === 1 ? "like" : "likes"}
        </p>
      )}

      {/* Caption: username + text (IG style; text posts show it as the body above) */}
      {!isText && post.caption && (
        <p className="px-3.5 pt-1 text-[15px] leading-relaxed text-text-main/90">
          {post.author.username ? (
            <Link href={`/u/${post.author.username}`} className="font-semibold text-text-main hover:underline">
              {display}
            </Link>
          ) : (
            <span className="font-semibold text-text-main">{display}</span>
          )}
          {post.author.verified && <VerifiedBadge size={13} className="ml-1" />}
          <span className="mr-1.5" />
          {post.caption}
        </p>
      )}

      {/* View comments */}
      {post.commentsCount > 0 && (
        <Link
          href={`/social/${post.id}`}
          className="mt-1 block px-3.5 text-sm text-text-main/50 transition-colors hover:text-text-main/80"
        >
          View {post.commentsCount === 1 ? "1 comment" : `all ${post.commentsCount} comments`}
        </Link>
      )}

      {/* Timestamp + audience */}
      <div className="flex items-center gap-1.5 px-3.5 pb-3.5 pt-1.5 text-[11px] uppercase tracking-wide text-text-main/40">
        <RelativeTime iso={post.createdAt} />
        <span aria-hidden>·</span>
        <AudienceIcon visibility={post.visibility} size={12} />
      </div>

      <ShareSheet postId={post.id} open={shareOpen} onClose={() => setShareOpen(false)} />
      {editing && (
        <EditPostModal
          post={post}
          open={editing}
          onClose={() => setEditing(false)}
          onUpdated={(p) => {
            onUpdated?.(p);
            setEditing(false);
          }}
        />
      )}
    </motion.article>
  );
}

function PostMedia({ post, priority }: { post: SocialPost; priority: boolean }) {
  if (post.status === "PROCESSING" && post.type !== "IMAGE") {
    return (
      <div className="relative grid aspect-[4/5] place-items-center bg-surface-low">
        <div className="flex flex-col items-center gap-3 text-text-main/60">
          <span className="bg-brand h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          <span className="text-sm">Optimizing video…</span>
        </div>
      </div>
    );
  }
  if (post.status === "FAILED" || !post.mediaUrl) {
    return (
      <div className="grid aspect-[4/5] place-items-center bg-surface-low text-sm text-text-main/40">
        Media unavailable
      </div>
    );
  }
  if (post.type === "IMAGE") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={post.mediaUrl}
        alt={post.caption || "Post image"}
        loading={priority ? "eager" : "lazy"}
        className="max-h-[80vh] w-full select-none bg-surface-low object-cover"
        draggable={false}
      />
    );
  }
  // VIDEO / REEL
  return (
    <video
      src={post.mediaUrl}
      poster={post.posterUrl ?? undefined}
      controls
      playsInline
      preload="none"
      className="max-h-[80vh] w-full bg-black object-contain"
    />
  );
}
