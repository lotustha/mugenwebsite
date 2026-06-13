"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { SocialPost } from "@/lib/social-client";
import { fetchFeed } from "@/lib/social-client";
import ReelPlayer from "@/components/social/ReelPlayer";

/** Full-screen vertical reels feed. One video plays at a time; infinite-append on scroll. */
export default function ReelsPage() {
  const [items, setItems] = useState<SocialPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const reelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const loadingMore = useRef(false);
  const hasMore = useRef(true);

  // Initial load.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { items: first, nextCursor } = await fetchFeed({ tab: "reels" });
        if (!alive) return;
        setItems(first);
        setCursor(nextCursor);
        hasMore.current = !!nextCursor;
      } catch {
        if (alive) hasMore.current = false;
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore.current || !hasMore.current || !cursor) return;
    loadingMore.current = true;
    try {
      const { items: more, nextCursor } = await fetchFeed({ tab: "reels", cursor });
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...more.filter((p) => !seen.has(p.id))];
      });
      setCursor(nextCursor);
      hasMore.current = !!nextCursor;
    } catch {
      hasMore.current = false;
    } finally {
      loadingMore.current = false;
    }
  }, [cursor]);

  // Active-reel detection — observer rooted on the scroll container.
  useEffect(() => {
    const root = scrollRef.current;
    if (!root || items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.index);
            if (!Number.isNaN(idx)) {
              setActiveIndex(idx);
              if (idx >= items.length - 2) void loadMore();
            }
          }
        }
      },
      { root, threshold: 0.6 },
    );

    const nodes = reelRefs.current.slice(0, items.length).filter(Boolean) as HTMLDivElement[];
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [items.length, loadMore]);

  if (loading) {
    return (
      <div className="grid h-[100dvh] w-full place-items-center bg-black">
        <span className="bg-brand h-12 w-12 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="grid h-[100dvh] w-full place-items-center bg-black px-6 text-center">
        <div className="flex flex-col items-center gap-4">
          <p className="font-headline text-xl font-semibold text-text-main">No reels yet</p>
          <p className="text-sm text-text-main/60">Be the first to post one.</p>
          <Link href="/social" className="bg-brand ring-brand rounded-full px-6 py-2.5 text-sm font-semibold text-white">
            Go to Social
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="reel-snap h-[100dvh] w-full overflow-y-scroll overscroll-contain bg-black">
      {items.map((post, i) => (
        <div
          key={post.id}
          data-index={i}
          ref={(el) => {
            reelRefs.current[i] = el;
          }}
          className="h-[100dvh] w-full snap-start"
        >
          <ReelPlayer post={post} active={i === activeIndex} />
        </div>
      ))}
    </div>
  );
}
