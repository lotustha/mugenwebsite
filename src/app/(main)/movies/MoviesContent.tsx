"use client";

import { useEffect, useState } from "react";
import AnimeGrid from "@/components/AnimeGrid";

function GridSkeleton() {
  return (
    <div className="space-y-12">
      {[0, 1].map((s) => (
        <section key={s}>
          <div className="h-5 w-32 bg-surface rounded animate-pulse mb-6" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i}>
                <div className="aspect-[2/3] bg-surface rounded-xl animate-pulse" />
                <div className="mt-2 h-3 bg-surface rounded animate-pulse w-3/4" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function normalize(items: any[]): any[] {
  return items.map((m) => ({
    id: m.id ?? m.mediaId,
    animeId: m.id ?? m.mediaId,
    title: m.title ?? m.name,
    image: m.poster ?? m.posterPath ?? m.image ?? m.thumbnail,
    episodes: m.episodes ?? m.episodeCount,
    status: m.type ?? m.status,
  }));
}

export default function MoviesContent() {
  const [popular, setPopular] = useState<any[]>([]);
  const [topRated, setTopRated] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/movies/category?type=movies&category=popular").then((r) => r.json()).catch(() => []),
      fetch("/api/movies/category?type=movies&category=top-rated").then((r) => r.json()).catch(() => []),
    ]).then(([p, t]) => {
      setPopular(normalize(Array.isArray(p) ? p : p?.results ?? []));
      setTopRated(normalize(Array.isArray(t) ? t : t?.results ?? []));
      setLoading(false);
    });
  }, []);

  if (loading) return <GridSkeleton />;

  if (popular.length === 0 && topRated.length === 0) {
    return (
      <div className="text-center py-24">
        <p className="font-body text-text-main/50 text-lg">No content available right now.</p>
      </div>
    );
  }

  return (
    <>
      {popular.length > 0 && (
        <section className="mb-12">
          <h2 className="font-headline text-lg font-semibold text-text-main mb-6">Popular Now</h2>
          <AnimeGrid anime={popular.slice(0, 24)} linkPrefix="/movies" />
        </section>
      )}
      {topRated.length > 0 && (
        <section className="mb-12">
          <h2 className="font-headline text-lg font-semibold text-text-main mb-6">Top Rated</h2>
          <AnimeGrid anime={topRated.slice(0, 24)} linkPrefix="/movies" />
        </section>
      )}
    </>
  );
}
