"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import type { SocialPost } from "@/lib/social-client";
import RelativeTime from "./RelativeTime";
import type { ProfileData } from "./ProfileHeader";

type TabKey = "posts" | "reels" | "discussions";

interface DiscussionItem {
  id: string;
  title: string;
  animeTag: string | null;
  replyCount: number;
  lastActiveAt: string;
  createdAt: string;
}

type TabItem = SocialPost | DiscussionItem;

/** Posts / Reels / Discussions tabs with per-tab refetch and tailored layouts. */
export default function ProfileTabs({
  username,
  profile,
  initialItems,
  initialTab = "posts",
}: {
  username: string;
  profile: ProfileData;
  initialItems: TabItem[];
  initialTab?: TabKey;
}) {
  const [tab, setTab] = useState<TabKey>(initialTab);
  const [loading, setLoading] = useState(false);
  // Per-tab item cache, seeded with the server-rendered initial tab.
  const [cache, setCache] = useState<Partial<Record<TabKey, TabItem[]>>>({ [initialTab]: initialItems });
  const items = cache[tab] ?? [];

  const load = useCallback(
    async (next: TabKey) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/social/users/${username}?tab=${next}`, { cache: "no-store" });
        const data = await res.json();
        setCache((c) => ({ ...c, [next]: Array.isArray(data.items) ? data.items : [] }));
      } catch {
        setCache((c) => ({ ...c, [next]: [] }));
      } finally {
        setLoading(false);
      }
    },
    [username],
  );

  const selectTab = useCallback(
    (next: TabKey) => {
      if (next === tab) return;
      setTab(next);
      if (!cache[next]) void load(next);
    },
    [tab, cache, load],
  );

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "posts", label: "Posts", count: profile.counts.posts },
    { key: "reels", label: "Reels", count: 0 },
    { key: "discussions", label: "Discussions", count: profile.counts.discussions },
  ];

  return (
    <section className="mt-6">
      <div className="glass-panel flex rounded-2xl p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => selectTab(t.key)}
            className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
              tab === t.key ? "bg-brand text-white" : "text-text-main/60 hover:text-text-main"
            }`}
          >
            {t.label}
            {t.key !== "reels" && t.count > 0 && <span className="ml-1.5 text-xs opacity-80">{t.count}</span>}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="grid place-items-center py-16">
            <span className="bg-brand h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState tab={tab} />
        ) : tab === "discussions" ? (
          <DiscussionList items={items as DiscussionItem[]} />
        ) : (
          <MediaGrid posts={items as SocialPost[]} reels={tab === "reels"} />
        )}
      </div>
    </section>
  );
}

function MediaGrid({ posts, reels }: { posts: SocialPost[]; reels: boolean }) {
  return (
    <div className="grid grid-cols-3 gap-1">
      {posts.map((p) => {
        const media = p.repostOf ?? p;
        const thumb = media.type === "IMAGE" ? media.mediaUrl : media.posterUrl;
        const isVideo = media.type === "VIDEO" || media.type === "REEL";
        return (
          <Link
            key={p.id}
            href={`/social/${p.id}`}
            className={`group relative block overflow-hidden bg-surface-low ${reels ? "aspect-[9/16]" : "aspect-square"}`}
          >
            {thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumb}
                alt={media.caption || "Post"}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : media.type === "TEXT" ? (
              <span className="bg-brand-soft flex h-full w-full items-center justify-center p-2.5 text-center text-[11px] font-medium leading-snug text-text-main/85 line-clamp-5">
                {media.caption || "Text"}
              </span>
            ) : (
              <span className="grid h-full w-full place-items-center text-xs text-text-main/30">No media</span>
            )}
            {isVideo && (
              <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-black/50 backdrop-blur-sm">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

function DiscussionList({ items }: { items: DiscussionItem[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((d) => (
        <li key={d.id}>
          <Link
            href={`/discuss/${d.id}`}
            className="glass-panel flex items-center justify-between gap-3 rounded-2xl px-4 py-3 transition-colors hover:border-brand"
          >
            <div className="min-w-0">
              <p className="font-headline truncate font-semibold text-text-main">{d.title}</p>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-text-main/55">
                {d.animeTag && <span className="text-brand">#{d.animeTag}</span>}
                <span>·</span>
                <RelativeTime iso={d.lastActiveAt} />
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand">
              {d.replyCount} {d.replyCount === 1 ? "reply" : "replies"}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function EmptyState({ tab }: { tab: TabKey }) {
  const msg =
    tab === "posts" ? "No posts yet." : tab === "reels" ? "No reels yet." : "No discussions yet.";
  return <p className="py-16 text-center text-sm text-text-main/50">{msg}</p>;
}
