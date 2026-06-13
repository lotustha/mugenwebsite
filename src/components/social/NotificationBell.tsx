"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import UserAvatar from "@/components/social/UserAvatar";
import RelativeTime from "@/components/social/RelativeTime";
import { useCurrentUser } from "@/components/social/SocialProvider";

type NotificationType = "FOLLOW" | "LIKE" | "COMMENT" | "REPLY" | "REPOST" | "MENTION";

interface NotificationItem {
  id: string;
  type: NotificationType;
  entityId: string | null;
  read: boolean;
  createdAt: string;
  actor: { username: string | null; displayName: string | null; avatar: string | null };
}

const VERB: Record<NotificationType, string> = {
  FOLLOW: "started following you",
  LIKE: "liked your post",
  COMMENT: "commented on your post",
  REPLY: "replied to your comment",
  REPOST: "reposted your post",
  MENTION: "mentioned you",
};

/** Bell with unread badge + dropdown list of recent notifications. */
export default function NotificationBell() {
  const { user } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/social/notifications", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        setItems(Array.isArray(data.items) ? data.items : []);
        setUnread(typeof data.unread === "number" ? data.unread : 0);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      setUnread(0);
      setItems((prev) => prev.map((i) => ({ ...i, read: true })));
      try {
        await fetch("/api/social/notifications", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({}),
        });
      } catch {
        /* ignore */
      }
    }
  }

  if (!user) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleToggle}
        aria-label="Notifications"
        aria-expanded={open}
        className="relative grid h-9 w-9 place-items-center rounded-full text-text-main/70 transition hover:bg-white/5 hover:text-text-main"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
          />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[0.625rem] font-bold leading-none text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="glass-dark absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-white/10"
          >
            <div className="border-b border-outline-variant px-4 py-3">
              <p className="font-headline text-sm font-semibold text-text-main">Notifications</p>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-text-main/50">No notifications yet.</p>
              ) : (
                items.map((n) => (
                  <div key={n.id} className="flex items-start gap-3 px-4 py-3 transition hover:bg-white/5">
                    <UserAvatar
                      user={{
                        username: n.actor.username,
                        displayName: n.actor.displayName,
                        avatar: n.actor.avatar,
                      }}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1 text-sm text-text-main/80">
                      <span className="font-medium text-text-main">
                        {n.actor.displayName || n.actor.username || "Someone"}
                      </span>{" "}
                      {VERB[n.type]}
                      <span className="ml-1 text-text-main/40">
                        <RelativeTime iso={n.createdAt} />
                      </span>
                    </div>
                    {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
