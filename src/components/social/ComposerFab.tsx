"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import type { SocialPost } from "@/lib/social-client";
import { useCurrentUser } from "./SocialProvider";
import PostComposer from "./PostComposer";

/** Floating action button that opens the post composer (or redirects to login). */
export default function ComposerFab({ onCreated }: { onCreated: (post: SocialPost) => void }) {
  const { user, loading } = useCurrentUser();
  const router = useRouter();
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);

  function handleClick() {
    if (loading) return;
    if (!user) {
      router.push(`/auth/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    setOpen(true);
  }

  return (
    <>
      <motion.button
        type="button"
        onClick={handleClick}
        aria-label="Create post"
        whileHover={reduce ? undefined : { scale: 1.06 }}
        whileTap={reduce ? undefined : { scale: 0.94 }}
        className="bg-brand neon-glow-primary fixed bottom-24 right-4 z-[90] grid h-14 w-14 place-items-center rounded-full text-white shadow-lg md:bottom-8 md:right-8"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </motion.button>

      <PostComposer open={open} onClose={() => setOpen(false)} onCreated={onCreated} />
    </>
  );
}
