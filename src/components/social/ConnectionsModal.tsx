"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { fetchConnections, type Connection } from "@/lib/social-client";
import UserAvatar from "./UserAvatar";
import VerifiedBadge from "./VerifiedBadge";
import FollowButton from "./FollowButton";

/** Modal listing a user's followers or following, with inline follow buttons. */
export default function ConnectionsModal({
  username,
  kind,
  open,
  onClose,
  onAuthRequired,
}: {
  username: string;
  kind: "followers" | "following" | null;
  open: boolean;
  onClose: () => void;
  onAuthRequired?: () => void;
}) {
  const [items, setItems] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !kind) return;
    let alive = true;
    // Defer state updates off the synchronous effect body (avoids cascading renders).
    void Promise.resolve().then(async () => {
      if (!alive) return;
      setLoading(true);
      setItems([]);
      try {
        const list = await fetchConnections(username, kind);
        if (alive) setItems(list);
      } catch {
        if (alive) setItems([]);
      } finally {
        if (alive) setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, [open, kind, username]);

  // Lock scroll + Escape to close.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && kind && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[130] grid place-items-end bg-black/70 backdrop-blur-sm sm:place-items-center sm:p-4"
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            role="dialog"
            aria-modal="true"
            aria-label={kind === "followers" ? "Followers" : "Following"}
            className="glass-dark flex max-h-[75vh] w-full max-w-md flex-col rounded-t-3xl border border-outline-variant sm:rounded-3xl"
          >
            <div className="flex items-center justify-between border-b border-outline-variant px-5 py-4">
              <h2 className="font-headline text-lg font-semibold text-text-main capitalize">{kind}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid h-9 w-9 place-items-center rounded-full text-text-main/60 transition-colors hover:bg-white/10 hover:text-text-main"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
              {loading ? (
                <div className="grid place-items-center py-16">
                  <span className="bg-brand h-7 w-7 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                </div>
              ) : items.length === 0 ? (
                <p className="py-16 text-center text-sm text-text-main/50">
                  {kind === "followers" ? "No followers yet." : "Not following anyone yet."}
                </p>
              ) : (
                <ul className="flex flex-col">
                  {items.map((u) => (
                    <li key={u.id} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-white/5">
                      <UserAvatar user={u} size="md" />
                      <Link
                        href={u.username ? `/u/${u.username}` : "#"}
                        onClick={onClose}
                        className="min-w-0 flex-1"
                      >
                        <span className="flex items-center gap-1">
                          <span className="font-headline truncate font-semibold text-text-main">
                            {u.displayName || u.username || "Anonymous"}
                          </span>
                          {u.verified && <VerifiedBadge size={13} />}
                        </span>
                        {u.username && <span className="block truncate text-xs text-text-main/50">@{u.username}</span>}
                      </Link>
                      {!u.isSelf && u.username && (
                        <FollowButton
                          size="sm"
                          username={u.username}
                          following={u.isFollowing}
                          onAuthRequired={onAuthRequired}
                        />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
