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
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-12 bg-surface rounded-lg" />
      ))}
    </div>
  );
}

export default function AnimeDetailContent({ id }: { id: string }) {
  const preview = getPreview(id);

  const [anime, setAnime] = useState<any>(preview ?? null);
  const [fullLoaded, setFullLoaded] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/anime/info?id=${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) {
          if (!preview) setNotFound(true);
        } else {
          setAnime(data);
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
        <h1 className="font-headline text-2xl text-text-main">Anime not found</h1>
      </div>
    );
  }

  // No preview and still loading — full page skeleton
  if (!anime) {
    return (
      <div className="min-h-screen animate-pulse">
        <div className="relative h-[50vh] min-h-[400px] bg-surface" />
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-4">
          <div className="h-8 bg-surface rounded w-1/3" />
          <div className="h-4 bg-surface rounded w-full max-w-xl" />
          <div className="h-4 bg-surface rounded w-2/3 max-w-lg" />
          <div className="mt-6 h-24 bg-surface rounded-xl" />
        </div>
      </div>
    );
  }

  const title = anime.title ?? anime.name ?? "";
  const poster = anime.image ?? anime.poster ?? "";
  const cover = anime.cover ?? poster;
  const description = anime.description ?? anime.synopsis ?? "";
  const episodes: any[] = anime.episodes ?? [];
  const genres: string[] = anime.genres ?? [];

  return (
    <div className="min-h-screen">
      <div className="relative h-[50vh] min-h-[400px]">
        {cover && (
          <Image src={cover} alt={title} fill sizes="100vw" className="object-cover opacity-30" priority />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-background via-background/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="mx-auto max-w-7xl flex flex-col md:flex-row gap-8 items-end">
            <div className="relative w-[200px] h-[300px] flex-none rounded-lg overflow-hidden shadow-xl">
              {poster ? (
                <Image src={poster} alt={title} fill sizes="200px" className="object-cover" />
              ) : (
                <div className="w-full h-full bg-surface flex items-center justify-center">
                  <span className="text-text-main/50">No Image</span>
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
              {anime.status && (
                <span className={`inline-block px-3 py-1 rounded font-body text-sm mb-4 ${
                  anime.status === "Ongoing" || anime.status === "Releasing"
                    ? "bg-tertiary text-background neon-glow-tertiary"
                    : "bg-secondary text-background neon-glow-secondary"
                }`}>{anime.status}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {description && (
          <div className="mb-8">
            <h2 className="font-headline text-xl font-semibold text-text-main mb-3">Synopsis</h2>
            <p className="font-body text-text-main/70 leading-relaxed max-w-3xl">{description}</p>
          </div>
        )}

        <div className="mb-8 p-6 glass rounded-xl border border-primary/20">
          <p className="font-body text-text-main/80 mb-4">
            Watch <span className="text-primary font-semibold">{title}</span> in HD on the Mugen App — free, sub & dub, no ads.
          </p>
          <AnimatedButton href="/apps" text="Download Free App" />
        </div>

        {/* Episodes: skeleton until full data arrives */}
        {!fullLoaded ? (
          <EpisodeSkeleton />
        ) : (
          <AnimeEpisodeList episodes={episodes} animeTitle={title} animeId={id} />
        )}
      </div>
    </div>
  );
}
