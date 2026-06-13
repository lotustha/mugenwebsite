"use client";

/** Shimmer placeholder cards shown while the feed is loading. Matches PostCard dimensions. */
export default function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-4" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-panel overflow-hidden rounded-2xl">
          {/* header */}
          <div className="flex items-center gap-3 p-3.5">
            <span className="h-10 w-10 animate-pulse rounded-full bg-white/10" />
            <div className="flex-1 space-y-2">
              <span className="block h-3.5 w-32 animate-pulse rounded-full bg-white/10" />
              <span className="block h-2.5 w-20 animate-pulse rounded-full bg-white/[0.06]" />
            </div>
          </div>
          {/* caption line */}
          <div className="px-3.5 pb-3">
            <span className="block h-3 w-3/4 animate-pulse rounded-full bg-white/[0.06]" />
          </div>
          {/* media */}
          <div className="aspect-[4/5] w-full animate-pulse bg-white/[0.05]" />
          {/* action bar */}
          <div className="flex items-center gap-5 px-3.5 py-3.5">
            <span className="h-5 w-10 animate-pulse rounded-full bg-white/10" />
            <span className="h-5 w-10 animate-pulse rounded-full bg-white/10" />
            <span className="ml-auto h-5 w-5 animate-pulse rounded-full bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  );
}
