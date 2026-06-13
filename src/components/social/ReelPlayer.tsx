"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { SocialPost } from "@/lib/social-client";
import { postShareUrl, toggleLike } from "@/lib/social-client";
import { useCurrentUser } from "./SocialProvider";
import UserAvatar from "./UserAvatar";
import FollowButton from "./FollowButton";
import LikeButton from "./LikeButton";
import VerifiedBadge from "./VerifiedBadge";

/** One full-screen reel: tap to play/pause, double-tap to like, action rail on the right. */
export default function ReelPlayer({ post, active }: { post: SocialPost; active: boolean }) {
  const reduceMotion = useReducedMotion();
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useCurrentUser();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastTap = useRef(0);

  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [burst, setBurst] = useState(0); // increments to retrigger the heart animation
  const [liked, setLiked] = useState(post.liked);

  const display = post.author.displayName || post.author.username || "Anonymous";
  const username = post.author.username;
  const shareUrl = post.id ? postShareUrl(post.id) : undefined;

  // Reflect the real <video> play/pause state (set from element events, not synchronously in an effect).
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
    };
  }, []);

  // React's `muted` prop only applies on mount; sync subsequent toggles imperatively.
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  // Drive playback from the `active` flag the parent feeds us.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (active) {
      v.play().catch(() => {});
    } else {
      v.pause();
      v.currentTime = 0;
    }
  }, [active]);

  const requireAuth = useCallback(() => {
    router.push(`/auth/login?next=${encodeURIComponent(pathname)}`);
  }, [router, pathname]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, []);

  const likeFromTap = useCallback(async () => {
    if (!user) {
      requireAuth();
      return;
    }
    setBurst((n) => n + 1);
    if (liked) return; // double-tap only ever likes (Instagram-style)
    setLiked(true);
    try {
      await toggleLike(post.id, false);
    } catch {
      /* leave optimistic state; rail LikeButton owns the authoritative count */
    }
  }, [user, liked, post.id, requireAuth]);

  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      lastTap.current = 0;
      void likeFromTap();
    } else {
      lastTap.current = now;
      window.setTimeout(() => {
        if (lastTap.current && now === lastTap.current) {
          lastTap.current = 0;
          togglePlay();
        }
      }, 280);
    }
  }, [likeFromTap, togglePlay]);

  async function handleShare() {
    if (!shareUrl) return;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ url: shareUrl, title: "Check out this reel on MugenAnime" });
        return;
      } catch {
        /* cancelled / fall through to clipboard */
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      /* ignore */
    }
  }

  // Should never happen for the reels feed, but render a graceful placeholder.
  if (post.status !== "READY" || !post.mediaUrl) {
    return (
      <section className="relative grid h-[100dvh] w-full snap-start place-items-center bg-black text-sm text-text-main/50">
        Reel unavailable
      </section>
    );
  }

  return (
    <section className="relative h-[100dvh] w-full snap-start overflow-hidden bg-black">
      <div className="absolute inset-0" onClick={handleTap}>
        <video
          ref={videoRef}
          src={post.mediaUrl}
          poster={post.posterUrl ?? undefined}
          playsInline
          muted={muted}
          loop
          preload="metadata"
          className="h-full w-full bg-black object-contain"
        />
      </div>

      {/* Scrims for legibility */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

      {/* Double-tap heart burst */}
      <AnimatePresence>
        {burst > 0 && (
          <motion.div
            key={burst}
            initial={{ scale: 0, opacity: 0 }}
            animate={reduceMotion ? { scale: 1, opacity: 1 } : { scale: [0, 1.25, 1], opacity: [0, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.2 : 0.8 }}
            onAnimationComplete={() => setBurst(0)}
            className="pointer-events-none absolute inset-0 grid place-items-center"
          >
            <svg width="120" height="120" viewBox="0 0 24 24" fill="#d946ef" className="drop-shadow-[0_0_20px_rgba(217,70,239,0.6)]">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Center play indicator when paused */}
      {!playing && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-black/40 backdrop-blur-sm">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </div>
      )}

      {/* Mute toggle */}
      <button
        type="button"
        onClick={() => setMuted((m) => !m)}
        aria-label={muted ? "Unmute" : "Mute"}
        className="absolute right-3 top-3 z-10 grid h-11 w-11 place-items-center rounded-full glass-dark text-white"
      >
        {muted ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 5 6 9H2v6h4l5 4V5z" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 5 6 9H2v6h4l5 4V5z" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
        )}
      </button>

      {/* Bottom-left author + caption overlay */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex items-end gap-3 p-4 pb-6 pr-20">
        <div className="min-w-0 flex-1 text-white">
          <div className="mb-2 flex items-center gap-2.5">
            <UserAvatar user={post.author} size="md" ring link />
            <div className="min-w-0">
              <p className="font-headline flex items-center gap-1 font-semibold leading-tight">
                <span className="truncate">{display}</span>
                {post.author.verified && <VerifiedBadge size={14} />}
              </p>
              {username && <p className="truncate text-xs text-white/70">@{username}</p>}
            </div>
            {username && (
              <div className="ml-1 shrink-0">
                <FollowButton size="sm" username={username} following={false} onAuthRequired={requireAuth} />
              </div>
            )}
          </div>
          {post.caption && <p className="line-clamp-2 text-sm leading-snug text-white/90">{post.caption}</p>}
          {post.animeTag && (
            <Link
              href={`/social?animeTag=${encodeURIComponent(post.animeTag)}`}
              className="mt-2 inline-block rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand"
            >
              #{post.animeTag}
            </Link>
          )}
        </div>
      </div>

      {/* Right action rail */}
      <div className="absolute bottom-6 right-3 z-10 flex flex-col items-center gap-5">
        <div className="grid min-h-[44px] min-w-[44px] place-items-center rounded-full glass-dark px-3 py-2 text-white">
          <LikeButton
            postId={post.id}
            liked={post.liked}
            count={post.likesCount}
            size={26}
            onAuthRequired={requireAuth}
          />
        </div>

        <Link
          href={`/social/${post.id}`}
          aria-label="Comments"
          className="flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-1 rounded-full glass-dark px-3 py-2 text-white"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
          <span className="text-xs tabular-nums">{post.commentsCount > 0 ? post.commentsCount : ""}</span>
        </Link>

        <button
          type="button"
          onClick={handleShare}
          aria-label="Share"
          className="grid min-h-[44px] min-w-[44px] place-items-center rounded-full glass-dark px-3 py-2 text-white"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
            <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
          </svg>
        </button>
      </div>
    </section>
  );
}
