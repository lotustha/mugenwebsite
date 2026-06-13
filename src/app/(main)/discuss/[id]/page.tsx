"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { SocialComment, SocialUser } from "@/lib/social-client";
import UserAvatar from "@/components/social/UserAvatar";
import RelativeTime from "@/components/social/RelativeTime";
import ThreadView from "@/components/social/ThreadView";

interface DiscussionDetail {
  id: string;
  title: string;
  content: string;
  animeTag: string | null;
  replyCount: number;
  lastActiveAt: string;
  createdAt: string;
  author: SocialUser;
}

export default function DiscussionDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [discussion, setDiscussion] = useState<DiscussionDetail | null>(null);
  const [replies, setReplies] = useState<SocialComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const res = await fetch(`/api/social/discussions/${id}`, { cache: "no-store" });
        if (!res.ok) {
          if (active) setNotFound(true);
          return;
        }
        const data = await res.json();
        if (!active) return;
        setDiscussion(data.discussion as DiscussionDetail);
        setReplies((data.replies ?? []) as SocialComment[]);
      } catch {
        if (active) setNotFound(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <div className="mx-auto max-w-2xl px-3 pb-8 pt-4 sm:pt-6">
      <Link
        href="/discuss"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-main/60 transition-colors hover:text-text-main"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="m15 18-6-6 6-6" />
        </svg>
        Discussions
      </Link>

      {loading ? (
        <DetailSkeleton />
      ) : notFound || !discussion ? (
        <div className="glass-panel rounded-2xl p-10 text-center">
          <p className="font-headline text-lg text-text-main">Discussion not found</p>
          <Link href="/discuss" className="text-brand mt-3 inline-block text-sm font-medium">
            Back to discussions
          </Link>
        </div>
      ) : (
        <>
          <article className="glass-panel rounded-2xl p-5 sm:p-6">
            <h1 className="font-headline text-xl font-bold leading-tight text-text-main sm:text-2xl">
              {discussion.title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-text-main/55">
              <UserAvatar user={discussion.author} size="sm" />
              <span className="font-medium text-text-main/85">
                {discussion.author.displayName || discussion.author.username || "Anonymous"}
              </span>
              <span aria-hidden>·</span>
              <RelativeTime iso={discussion.createdAt} />
              {discussion.animeTag && (
                <span className="bg-brand-soft text-brand ml-1 shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium">
                  #{discussion.animeTag}
                </span>
              )}
            </div>

            <div className="article-body mt-4">
              {discussion.content.split(/\n{2,}/).map((para, i) => (
                <p key={i} className="whitespace-pre-wrap">
                  {para}
                </p>
              ))}
            </div>
          </article>

          <ThreadView discussionId={discussion.id} replies={replies} />
        </>
      )}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="glass-panel rounded-2xl p-5 sm:p-6">
      <div className="h-6 w-3/4 animate-pulse rounded bg-white/10" />
      <div className="mt-3 flex items-center gap-2">
        <div className="h-8 w-8 animate-pulse rounded-full bg-white/10" />
        <div className="h-3 w-32 animate-pulse rounded bg-white/5" />
      </div>
      <div className="mt-5 space-y-2.5">
        <div className="h-3.5 w-full animate-pulse rounded bg-white/5" />
        <div className="h-3.5 w-full animate-pulse rounded bg-white/5" />
        <div className="h-3.5 w-2/3 animate-pulse rounded bg-white/5" />
      </div>
    </div>
  );
}
