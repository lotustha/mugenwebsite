"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toggleLike } from "@/lib/social-client";
import { useCurrentUser } from "./SocialProvider";

/** Heart like-button with burst animation and optimistic toggle. */
export default function LikeButton({
  postId,
  liked: initialLiked,
  count: initialCount,
  onAuthRequired,
  size = 22,
}: {
  postId: string;
  liked: boolean;
  count: number;
  onAuthRequired?: () => void;
  size?: number;
}) {
  const { user } = useCurrentUser();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);

  async function handle() {
    if (!user) {
      onAuthRequired?.();
      return;
    }
    if (busy) return;
    const next = !liked;
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));
    setBusy(true);
    try {
      const res = await toggleLike(postId, liked);
      setLiked(res.liked);
      setCount(res.likesCount);
    } catch {
      setLiked(liked); // revert
      setCount(initialCount);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handle}
      aria-pressed={liked}
      aria-label={liked ? "Unlike" : "Like"}
      className="group flex items-center gap-1.5 text-sm text-text-main/70 transition-colors hover:text-[#d946ef]"
    >
      <span className="relative grid place-items-center">
        <AnimatePresence>
          {liked && (
            <motion.span
              key="burst"
              initial={{ scale: 0, opacity: 0.7 }}
              animate={{ scale: 1.8, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 rounded-full"
              style={{ background: "radial-gradient(circle, rgba(217,70,239,0.5), transparent 70%)" }}
            />
          )}
        </AnimatePresence>
        <motion.svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          animate={liked ? { scale: [1, 1.3, 1] } : { scale: 1 }}
          transition={{ duration: 0.3 }}
          fill={liked ? "#d946ef" : "none"}
          stroke={liked ? "#d946ef" : "currentColor"}
          strokeWidth="2"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
        </motion.svg>
      </span>
      <span className="tabular-nums">{count > 0 ? count : ""}</span>
    </button>
  );
}
