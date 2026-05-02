"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import AnimatedButton from "@/components/AnimatedButton";
import AnimeEpisodeList from "@/components/AnimeEpisodeList";
import { getPreview } from "@/lib/preview-store";

function EpisodeSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      <div className="h-5 bg-surface rounded w-32 mb-4" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-12 bg-surface rounded-lg" />
      ))}
    </div>
  );
}

export default function MovieDetailContent({ id }: { id: string }) {
  const preview = getPreview(id);

  const [media, setMedia] = useState<any>(preview ?? null);
  const [fullLoaded, setFullLoaded] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/movies/info?id=${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) {
          if (!preview) setNotFound(true);
        } else {
          setMedia(data);
        }
        setFullLoaded(true);
      })
      .catch(() => {
        if (!preview) setNotFound(true);
        setFullLoaded(true);
      });
  }, [id, preview]);

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <h1 className="font-headline text-2xl text-text-main">Content not found</h1>
      </div>
    );
  }

  if (!media) {
    return (
      <div className="min-h-screen animate-pulse">
        <div className="relative h-[50vh] min-h-[400px] bg-surface" />
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-4">
          <div className="h-8 bg-surface rounded w-1/3" />
          <div className="h-4 bg-surface rounded w-full max-w-xl" />
          <div className="mt-6 h-24 bg-surface rounded-xl" />
        </div>
      </div>
    );
  }

  const title = media.title ?? media.name ?? "";
  const poster = media.poster ?? media.posterPath ?? media.image;
  const backdrop = media.backdrop ?? media.backdropPath ?? media.cover ?? poster;
  const genres: string[] = media.genres ?? [];
  const overview = media.overview ?? media.synopsis ?? media.description ?? "";
  const episodes: any[] = media.episodes ?? media.seasons ?? [];

  return (
    <div className="min-h-screen">
      <div className="relative h-[50vh] min-h-[400px]">
        {backdrop && (
          <Image src={backdrop} alt={title} fill sizes="100vw" className="object-cover" priority />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="mx-auto max-w-7xl flex flex-col md:flex-row gap-8 items-end">
            <div className="relative w-[160px] h-[240px] flex-none rounded-lg overflow-hidden shadow-xl">
              {poster ? (
                <Image src={poster} alt={title} fill sizes="160px" className="object-cover" />
              ) : (
                <div className="w-full h-full bg-surface flex items-center justify-center">
                  <span className="text-text-main/50 text-sm">No Image</span>
                </div>
              )}
            </div>
            <div className="flex-1">
              <h1 className="font-headline text-4xl font-bold text-text-main tracking-tight mb-4">{title}</h1>
              {genres.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {genres.map((g, i) => (
                    <span key={i} className="px-3 py-1 bg-surface-high/80 rounded-full font-body text-xs text-text-main/80">{g}</span>
                  ))}
                </div>
              )}
              <div className="flex gap-3 flex-wrap">
                {media.type && <span className="px-3 py-1 bg-secondary text-background rounded font-body text-sm neon-glow-secondary">{media.type}</span>}
                {media.year && <span className="px-3 py-1 bg-surface-high rounded font-body text-sm text-text-main/70">{media.year}</span>}
                {media.rating && <span className="px-3 py-1 bg-surface-high rounded font-body text-sm text-tertiary">★ {media.rating}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {overview && (
          <div className="mb-8">
            <h2 className="font-headline text-xl font-semibold text-text-main mb-3">Overview</h2>
            <p className="font-body text-text-main/70 leading-relaxed max-w-3xl">{overview}</p>
          </div>
        )}
        <div className="mb-8 p-6 glass rounded-xl border border-primary/20">
          <p className="font-body text-text-main/80 mb-4">
            Watch <span className="text-primary font-semibold">{title}</span> and thousands of other titles on the Mugen App — free, fast, and always updated.
          </p>
          <AnimatedButton href="/apps" text="Download Free App" />
        </div>

        {!fullLoaded ? (
          <EpisodeSkeleton />
        ) : episodes.length > 0 ? (
          <AnimeEpisodeList episodes={episodes} animeTitle={title} animeId={id} />
        ) : null}
      </div>
    </div>
  );
}
