"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";

function GoogleIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.15-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.85 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.67-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.67 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

/** Small modal prompting an anonymous visitor to sign in to participate. */
export default function AuthPrompt({
  open,
  onClose,
  message,
}: {
  open: boolean;
  onClose: () => void;
  message?: string;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div
            className="glass-dark relative w-full max-w-sm rounded-t-3xl border border-white/10 p-6 sm:rounded-3xl"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-headline text-xl font-bold text-text-main">Join the conversation</h3>
            <p className="mt-1 text-sm text-text-main/60">
              {message || "Sign in to like, comment, and follow your favorite creators."}
            </p>

            <button
              onClick={() => signIn("google", { callbackUrl: "/social" })}
              className="glass-panel mt-5 flex w-full items-center justify-center gap-3 rounded-full px-4 py-3 font-medium text-text-main transition hover:border-brand"
            >
              <GoogleIcon />
              Continue with Google
            </button>

            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-text-main/60">
              <Link href="/auth/login" onClick={onClose} className="text-brand hover:underline">
                Log in
              </Link>
              <span className="text-text-main/30">·</span>
              <Link href="/auth/signup" onClick={onClose} className="text-brand hover:underline">
                Sign up
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
