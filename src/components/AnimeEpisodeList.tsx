"use client";

import { useState } from "react";
import EpisodeModal from "./EpisodeModal";

interface Episode {
  number?: number | string;
  title?: string;
  episodeId?: string;
  id?: string;
}

interface Props {
  episodes: Episode[];
  animeTitle: string;
  animeId: string;
}

export default function AnimeEpisodeList({ episodes, animeTitle, animeId }: Props) {
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);

  if (!episodes || episodes.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="font-headline text-xl font-semibold text-text-main mb-4">
        Episodes <span className="text-text-main/40 text-base font-normal">({episodes.length})</span>
      </h2>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {episodes.map((ep, i) => (
          <button
            key={ep.episodeId || ep.id || i}
            onClick={() => setSelectedEpisode(ep)}
            className="flex items-center gap-3 p-3 glass rounded-lg border border-outline-variant/10 hover:border-primary/30 hover:bg-surface-high/50 transition-all text-left group"
          >
            <span className="flex-none w-8 h-8 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center font-headline text-xs font-bold text-primary group-hover:bg-primary/20 transition-colors">
              {ep.number ?? i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-body text-text-main text-sm truncate">
                {ep.title ? ep.title : `Episode ${ep.number ?? i + 1}`}
              </p>
            </div>
            <svg className="flex-none w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        ))}
      </div>

      <EpisodeModal
        episode={selectedEpisode}
        mediaTitle={animeTitle}
        onClose={() => setSelectedEpisode(null)}
      />
    </div>
  );
}
