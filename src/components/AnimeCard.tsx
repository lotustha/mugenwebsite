"use client";

import Image from "next/image";
import Link from "next/link";
import { setPreview } from "@/lib/preview-store";

interface AnimeCardProps {
  anime: {
    id?: string;
    animeId?: string;
    image?: string;
    poster?: string;
    thumbnail?: string;
    title?: string;
    name?: string;
    episodes?: number;
    status?: string;
    description?: string;
    synopsis?: string;
    genres?: string[];
    cover?: string;
    backdrop?: string;
    overview?: string;
    year?: string | number;
    rating?: string | number;
    type?: string;
  };
  linkPrefix?: string;
}

export default function AnimeCard({ anime, linkPrefix = "/anime" }: AnimeCardProps) {
  const id = anime.id || anime.animeId;
  const image = anime.image || anime.poster || anime.thumbnail;
  const title = anime.title || anime.name || "";

  if (!id) return null;

  const href = `${linkPrefix}/${id}?t=${encodeURIComponent(title)}`;

  return (
    <Link
      href={href}
      className="group block"
      onClick={() => setPreview(id, anime)}
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-surface transition-all duration-300 hover:scale-105 hover:bg-surface-high ambient-shadow">
        {image ? (
          <Image
            src={image}
            alt={title || "Anime"}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <span className="font-body text-text-main/50">No Image</span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="absolute bottom-0 left-0 right-0 p-4">
            {anime.status && (
              <span className={`inline-block px-2 py-1 text-xs font-body rounded mb-2 ${
                anime.status === "Ongoing"
                  ? "bg-tertiary text-background neon-glow-tertiary"
                  : "bg-secondary text-background neon-glow-secondary"
              }`}>
                {anime.status}
              </span>
            )}
            {anime.episodes && (
              <p className="font-body text-xs text-text-main/80">{anime.episodes} episodes</p>
            )}
          </div>
        </div>
      </div>

      <h3 className="mt-3 font-body text-text-main text-sm line-clamp-2 group-hover:text-primary transition-colors">
        {title}
      </h3>
    </Link>
  );
}
