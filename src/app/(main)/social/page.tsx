"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { fetchFeed, type SocialPost } from "@/lib/social-client";
import { useCurrentUser } from "@/components/social/SocialProvider";
import PostCard from "@/components/social/PostCard";
import FeedSkeleton from "@/components/social/FeedSkeleton";
import ComposerFab from "@/components/social/ComposerFab";
import PostComposer from "@/components/social/PostComposer";
import UserAvatar from "@/components/social/UserAvatar";

type Tab = "forYou" | "following";

function SocialFeedInner() {
  const { user, loading: authLoading } = useCurrentUser();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const animeTag = searchParams.get("animeTag")?.trim() || undefined;

  const [tab, setTab] = useState<Tab>("forYou");
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);

  const inFlight = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const requireAuth = useCallback(() => {
    router.push(`/auth/login?next=${encodeURIComponent(pathname)}`);
  }, [router, pathname]);

  // Whether the Following tab can actually load (must be logged in).
  // When viewing an anime's discussion (animeTag filter), tabs don't apply.
  const followingBlocked = !animeTag && tab === "following" && !authLoading && !user;

  const load = useCallback(
    async (reset: boolean) => {
      if (inFlight.current) return;
      if (!reset && cursor === null && posts.length > 0) return; // no more pages
      inFlight.current = true;
      if (reset) {
        setInitialLoading(true);
        setPosts([]);
        setCursor(null);
      } else {
        setLoadingMore(true);
      }
      setError(null);
      try {
        const res = await fetchFeed({
          following: !animeTag && tab === "following",
          animeTag,
          cursor: reset ? null : cursor,
        });
        setPosts((prev) => (reset ? res.items : [...prev, ...res.items]));
        setCursor(res.nextCursor);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't load the feed.");
      } finally {
        inFlight.current = false;
        setInitialLoading(false);
        setLoadingMore(false);
      }
    },
    // posts.length intentionally excluded — guarded via ref; reload keyed on tab/tag
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tab, cursor, animeTag],
  );

  // Reset + load whenever the tab changes (and auth resolves for Following).
  useEffect(() => {
    let cancelled = false;
    // Defer all setState off the synchronous effect body to avoid cascading renders.
    void Promise.resolve().then(() => {
      if (cancelled) return;
      if (followingBlocked) {
        setPosts([]);
        setCursor(null);
        setInitialLoading(false);
        return;
      }
      void load(true);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, followingBlocked, animeTag]);

  // Infinite scroll sentinel.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || initialLoading || followingBlocked) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && cursor !== null && !inFlight.current) {
          void load(false);
        }
      },
      { rootMargin: "600px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [cursor, initialLoading, followingBlocked, load]);

  function handleCreated(post: SocialPost) {
    setPosts((prev) => [post, ...prev]);
  }

  function openComposer() {
    if (authLoading) return;
    if (!user) {
      requireAuth();
      return;
    }
    setComposerOpen(true);
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "forYou", label: "For You" },
    { key: "following", label: "Following" },
  ];

  return (
    <div className="mx-auto max-w-xl px-3 pb-28 pt-3 md:pb-12">
      {/* Anime discussion banner OR feed tabs */}
      {animeTag ? (
        <div className="glass-panel mb-4 flex items-center gap-3 rounded-2xl px-4 py-3">
          <span className="bg-brand-soft text-brand grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg">#</span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-text-main/50">Discussion</p>
            <h1 className="font-headline truncate text-lg font-bold text-text-main">{animeTag}</h1>
          </div>
          <Link
            href="/social"
            className="shrink-0 rounded-full p-2 text-text-main/50 transition-colors hover:bg-white/10 hover:text-text-main"
            aria-label="Clear filter"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </Link>
        </div>
      ) : (
        <div className="glass-panel sticky top-2 z-40 mb-4 flex items-center gap-1 rounded-full p-1 md:top-24">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`relative flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                tab === t.key ? "bg-brand text-white" : "text-text-main/60 hover:text-text-main"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Inline composer trigger */}
      <button
        type="button"
        onClick={openComposer}
        className="glass-panel mb-4 flex w-full items-center gap-3 rounded-2xl p-3.5 text-left transition-colors hover:border-primary/40"
      >
        {user ? (
          <UserAvatar user={user} size="md" link={false} />
        ) : (
          <span className="bg-brand grid h-10 w-10 place-items-center rounded-full text-white">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
        )}
        <span className="text-text-main/50">
          {animeTag ? `Start a discussion about ${animeTag}…` : "What's on your mind?"}
        </span>
      </button>

      {/* Body */}
      {followingBlocked ? (
        <div className="glass-panel mt-6 flex flex-col items-center gap-4 rounded-2xl px-6 py-14 text-center">
          <span className="bg-brand-soft grid h-16 w-16 place-items-center rounded-full">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-primary">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 11h-6M19 8v6" />
            </svg>
          </span>
          <div>
            <h2 className="font-headline text-lg font-semibold text-text-main">Follow your favorite creators</h2>
            <p className="mt-1 text-sm text-text-main/60">Sign in to see posts from people you follow.</p>
          </div>
          <Link href={`/auth/login?next=${encodeURIComponent(pathname)}`} className="bg-brand rounded-full px-6 py-2.5 text-sm font-semibold text-white">
            Sign in
          </Link>
        </div>
      ) : initialLoading ? (
        <FeedSkeleton count={3} />
      ) : error && posts.length === 0 ? (
        <div className="glass-panel mt-6 flex flex-col items-center gap-4 rounded-2xl px-6 py-14 text-center">
          <p className="text-sm text-text-main/70">{error}</p>
          <button type="button" onClick={() => load(true)} className="bg-brand rounded-full px-6 py-2.5 text-sm font-semibold text-white">
            Try again
          </button>
        </div>
      ) : posts.length === 0 ? (
        <div className="glass-panel mt-6 flex flex-col items-center gap-4 rounded-2xl px-6 py-16 text-center">
          <span className="text-5xl" aria-hidden>
            ✨
          </span>
          <div>
            <h2 className="font-headline text-lg font-semibold text-text-main">
              {animeTag
                ? `No posts about ${animeTag} yet`
                : tab === "following"
                  ? "Your timeline is quiet"
                  : "The feed awaits its first hero"}
            </h2>
            <p className="mt-1 text-sm text-text-main/60">
              {animeTag
                ? "Be the first to start the discussion."
                : tab === "following"
                  ? "Follow some creators or post something yourself."
                  : "Be the first to share a moment with the community."}
            </p>
          </div>
          <button type="button" onClick={openComposer} className="bg-brand rounded-full px-6 py-2.5 text-sm font-semibold text-white">
            Create your first post
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {posts.map((post, i) => (
              <PostCard
                key={post.id}
                post={post}
                priority={i === 0}
                onAuthRequired={requireAuth}
                onUpdated={(p) => setPosts((prev) => prev.map((x) => (x.id === p.id ? p : x)))}
                onDeleted={(id) => setPosts((prev) => prev.filter((x) => x.id !== id))}
              />
            ))}
          </div>

          {/* Sentinel + load-more state */}
          <div ref={sentinelRef} className="h-10" />
          {loadingMore && (
            <div className="flex justify-center py-6">
              <span className="bg-brand h-7 w-7 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            </div>
          )}
          {cursor === null && posts.length > 0 && (
            <p className="py-8 text-center text-xs text-text-main/40">You&apos;re all caught up.</p>
          )}
        </>
      )}

      {/* Floating composer + inline composer modal */}
      <ComposerFab onCreated={handleCreated} initialAnimeTag={animeTag} />
      <PostComposer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        onCreated={handleCreated}
        initialAnimeTag={animeTag}
      />
    </div>
  );
}

export default function SocialFeedPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" />}>
      <SocialFeedInner />
    </Suspense>
  );
}
