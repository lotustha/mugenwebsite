"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { SocialPost } from "@/lib/social-client";
import UserAvatar from "./UserAvatar";
import RelativeTime from "./RelativeTime";
import LikeButton from "./LikeButton";
import ShareSheet from "./ShareSheet";

/** A feed post card: header, media (image/video/processing), caption, action bar. */
export default function PostCard({
  post,
  onAuthRequired,
  priority = false,
}: {
  post: SocialPost;
  onAuthRequired?: () => void;
  priority?: boolean;
}) {
  const [shareOpen, setShareOpen] = useState(false);
  const display = post.author.displayName || post.author.username || "Anonymous";
  // For reposts, the media lives on the original post.
  const media = post.repostOf ?? post;

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
            {post.repostOf && <span className="text-xs text-text-main/50">reposted</span>}
          </div>
          <div className="flex items-center gap-2 text-xs text-text-main/50">
            {post.author.username && <span className="truncate">@{post.author.username}</span>}
            <span>·</span>
            <RelativeTime iso={post.createdAt} />
          </div>
        </div>
        {media.animeTag && (
          <span className="bg-brand-soft text-brand hidden shrink-0 rounded-full px-3 py-1 text-xs font-medium sm:inline">
            #{media.animeTag}
          </span>
        )}
      </header>

      {post.caption && <p className="px-3.5 pb-3 text-[15px] leading-relaxed text-text-main/90">{post.caption}</p>}

      <PostMedia post={media} priority={priority} />

      <div className="flex items-center gap-5 px-3.5 py-3">
        <LikeButton postId={post.id} liked={post.liked} count={post.likesCount} onAuthRequired={onAuthRequired} />
        <Link
          href={`/social/${post.id}`}
          className="flex items-center gap-1.5 text-sm text-text-main/70 transition-colors hover:text-tertiary"
          aria-label="Comments"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
          <span className="tabular-nums">{post.commentsCount > 0 ? post.commentsCount : ""}</span>
        </Link>
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          className="ml-auto flex items-center gap-1.5 text-sm text-text-main/70 transition-colors hover:text-primary"
          aria-label="Share"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
            <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
          </svg>
        </button>
      </div>

      <ShareSheet postId={post.id} open={shareOpen} onClose={() => setShareOpen(false)} />
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
        className="max-h-[80vh] w-full bg-surface-low object-cover"
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
