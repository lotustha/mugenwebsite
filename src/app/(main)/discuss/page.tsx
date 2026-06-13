"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import DiscussionCard, { type DiscussionListItem } from "@/components/social/DiscussionCard";
import NewDiscussion from "@/components/social/NewDiscussion";

export default function DiscussPage() {
  return (
    <Suspense fallback={<IndexSkeleton />}>
      <DiscussIndex />
    </Suspense>
  );
}

function DiscussIndex() {
  const searchParams = useSearchParams();
  const tag = searchParams.get("tag")?.trim() || "";

  const [items, setItems] = useState<DiscussionListItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingMoreRef = useRef(false);

  // Pure fetcher — no setState, so it's safe to call synchronously from an effect.
  const fetchPage = useCallback(
    async (nextCursor: string | null) => {
      const params = new URLSearchParams();
      if (tag) params.set("animeTag", tag);
      if (nextCursor) params.set("cursor", nextCursor);
      const res = await fetch(`/api/social/discussions?${params}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load discussions");
      return data as { items: DiscussionListItem[]; nextCursor: string | null };
    },
    [tag],
  );

  // Reset + initial load when the tag filter changes (state set inside the inline async IIFE).
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchPage(null);
        if (!active) return;
        setItems(data.items ?? []);
        setCursor(data.nextCursor ?? null);
        setHasMore(Boolean(data.nextCursor));
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Failed to load discussions");
        setHasMore(false);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [fetchPage]);

  // Append the next page (used by the infinite-scroll observer). Runs async, never during an effect tick.
  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !cursor) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const data = await fetchPage(cursor);
      setItems((prev) => [...prev, ...data.items]);
      setCursor(data.nextCursor ?? null);
      setHasMore(Boolean(data.nextCursor));
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  }, [cursor, fetchPage]);

  // Retry handler for the error state.
  const retry = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPage(null);
      setItems(data.items ?? []);
      setCursor(data.nextCursor ?? null);
      setHasMore(Boolean(data.nextCursor));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load discussions");
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [fetchPage]);

  // Infinite scroll.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loadingMoreRef.current && cursor) {
          void loadMore();
        }
      },
      { rootMargin: "400px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [cursor, hasMore, loadMore]);

  return (
    <div className="mx-auto max-w-2xl px-3 pb-8 pt-4 sm:pt-6">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-headline text-brand text-2xl font-bold sm:text-3xl">Discussions</h1>
          <p className="mt-1 text-sm text-text-main/60">Talk anime &amp; manga with the community</p>
        </div>
        <button
          type="button"
          onClick={() => setComposerOpen(true)}
          className="bg-brand shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-white"
        >
          <span className="hidden sm:inline">New discussion</span>
          <span className="sm:hidden">New</span>
        </button>
      </header>

      {tag && (
        <div className="mb-4">
          <span className="bg-brand-soft text-brand inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium">
            #{tag}
            <Link href="/discuss" aria-label="Clear filter" className="text-brand/80 hover:text-brand">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </Link>
          </span>
        </div>
      )}

      {loading ? (
        <IndexSkeleton />
      ) : error ? (
        <div className="glass-panel rounded-2xl p-8 text-center text-sm text-text-main/70">
          {error}
          <button
            type="button"
            onClick={() => retry()}
            className="text-brand mt-3 block w-full text-sm font-medium"
          >
            Try again
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="glass-panel rounded-2xl p-10 text-center">
          <p className="text-text-main/70">No discussions yet — start one!</p>
          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            className="bg-brand mt-4 rounded-full px-5 py-2 text-sm font-semibold text-white"
          >
            New discussion
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((d) => (
            <DiscussionCard key={d.id} discussion={d} />
          ))}
        </div>
      )}

      {!loading && hasMore && <div ref={sentinelRef} className="h-8" />}
      {loadingMore && (
        <div className="flex justify-center py-4">
          <span className="bg-brand h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        </div>
      )}

      <NewDiscussion
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        onCreated={(d) => setItems((prev) => [d, ...prev])}
      />
    </div>
  );
}

function IndexSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="glass-panel rounded-2xl p-4">
          <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
          <div className="mt-2.5 h-3 w-full animate-pulse rounded bg-white/5" />
          <div className="mt-1.5 h-3 w-2/3 animate-pulse rounded bg-white/5" />
          <div className="mt-3 flex items-center gap-2">
            <div className="h-8 w-8 animate-pulse rounded-full bg-white/10" />
            <div className="h-3 w-24 animate-pulse rounded bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
