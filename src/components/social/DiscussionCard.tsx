"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import type { SocialUser } from "@/lib/social-client";
import UserAvatar from "./UserAvatar";
import RelativeTime from "./RelativeTime";

export interface DiscussionListItem {
  id: string;
  title: string;
  excerpt: string;
  animeTag: string | null;
  replyCount: number;
  lastActiveAt: string;
  createdAt: string;
  author: SocialUser;
}

/** A discussion thread row: title, excerpt, author + activity meta, reply count and anime-tag chip. */
export default function DiscussionCard({ discussion }: { discussion: DiscussionListItem }) {
  const reduce = useReducedMotion();
  const display = discussion.author.displayName || discussion.author.username || "Anonymous";

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
    >
      <Link
        href={`/discuss/${discussion.id}`}
        className="glass-panel group block rounded-2xl border border-outline-variant/60 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40"
      >
        <h3 className="font-headline line-clamp-2 text-base font-semibold leading-snug text-text-main sm:text-lg">
          {discussion.title}
        </h3>

        {discussion.excerpt && (
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-text-main/70">{discussion.excerpt}</p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-text-main/55">
          <UserAvatar user={discussion.author} size="sm" link={false} />
          <span className="truncate font-medium text-text-main/80">{display}</span>
          <span aria-hidden>·</span>
          <RelativeTime iso={discussion.lastActiveAt} />

          <span className="ml-auto flex items-center gap-1 text-text-main/70" aria-label={`${discussion.replyCount} replies`}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
            <span className="tabular-nums">{discussion.replyCount}</span>
          </span>

          {discussion.animeTag && (
            <span className="bg-brand-soft text-brand shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium">
              #{discussion.animeTag}
            </span>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
