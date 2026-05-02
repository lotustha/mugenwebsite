"use client";

import { useEffect, useState } from "react";
import AnimeCarousel from "@/components/AnimeCarousel";

function CarouselSkeleton() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="h-6 w-40 bg-surface rounded animate-pulse mb-4" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex-none w-36">
            <div className="aspect-[2/3] bg-surface rounded-xl animate-pulse" />
            <div className="mt-2 h-3 bg-surface rounded animate-pulse w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HomeAnimeSection() {
  const [recent, setRecent] = useState<any[]>([]);
  const [newReleases, setNewReleases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/anime/recent").then((r) => r.json()).catch(() => []),
      fetch("/api/anime/new").then((r) => r.json()).catch(() => []),
    ]).then(([r, n]) => {
      setRecent(Array.isArray(r) ? r : r?.results ?? []);
      setNewReleases(Array.isArray(n) ? n : n?.results ?? []);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <>
        <section className="py-16">
          <CarouselSkeleton />
        </section>
        <section className="py-12 bg-surface/50">
          <CarouselSkeleton />
        </section>
      </>
    );
  }

  return (
    <>
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
          <p className="font-body text-xs text-tertiary/70 uppercase tracking-widest font-semibold mb-2">Available on the App</p>
          <h2 className="font-headline text-2xl md:text-3xl font-bold text-text-main">Thousands of Titles</h2>
        </div>
        <AnimeCarousel title="Recently Added" anime={recent} />
      </section>
      <section className="py-12 bg-surface/50">
        <AnimeCarousel title="New Releases" anime={newReleases} />
      </section>
    </>
  );
}
