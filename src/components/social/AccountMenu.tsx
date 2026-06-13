"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import UserAvatar from "@/components/social/UserAvatar";
import { useCurrentUser } from "@/components/social/SocialProvider";

/** Avatar trigger that opens an account dropdown; shows a Log in pill when signed out. */
export default function AccountMenu() {
  const router = useRouter();
  const { user, refresh } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!user) {
    return (
      <Link
        href="/auth/login"
        className="bg-brand rounded-full px-4 py-1.5 font-headline text-sm font-semibold text-white transition hover:brightness-110"
      >
        Log in
      </Link>
    );
  }

  async function handleLogout() {
    setOpen(false);
    await signOut({ redirect: false });
    await refresh();
    router.push("/");
  }

  const links = [
    { href: `/u/${user.username}`, label: "My profile" },
    { href: "/social", label: "Create post" },
    { href: "/auth/complete-profile", label: "Settings" },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-expanded={open}
        className="flex items-center rounded-full transition active:scale-95"
      >
        <UserAvatar user={user} size="sm" link={false} ring />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="glass-dark absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-white/10 p-2"
          >
            <div className="flex items-center gap-3 px-2 py-2">
              <UserAvatar user={user} size="sm" link={false} />
              <div className="min-w-0">
                <p className="font-headline truncate text-sm font-semibold text-text-main">
                  {user.displayName || user.username}
                </p>
                {user.username && <p className="truncate text-xs text-text-main/50">@{user.username}</p>}
              </div>
            </div>

            <div className="my-1 h-px bg-outline-variant" />

            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block rounded-xl px-3 py-2 text-sm text-text-main/80 transition hover:bg-white/5 hover:text-text-main"
              >
                {l.label}
              </Link>
            ))}

            <div className="my-1 h-px bg-outline-variant" />

            <button
              onClick={handleLogout}
              className="block w-full rounded-xl px-3 py-2 text-left text-sm text-red-400 transition hover:bg-red-500/10"
            >
              Log out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
