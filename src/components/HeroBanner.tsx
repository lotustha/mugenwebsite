"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import PlayStoreButton from "./PlayStoreButton";

interface HeroBannerProps {
  spotlight: any[];
}

export default function HeroBanner({ spotlight }: HeroBannerProps) {
  const featured =
    Array.isArray(spotlight) && spotlight.length > 0 ? spotlight[0] : null;

  const title = featured?.title || featured?.name || "Mugen Anime";
  const description =
    featured?.description ||
    featured?.synopsis ||
    "Your gateway to the world of anime. Watch the latest episodes in high quality.";
  const imageSrc =
    featured?.banner || featured?.image || featured?.poster || featured?.cover;

  return (
    <section className="relative min-h-[75vh] flex items-center overflow-hidden bg-background">
      {/* Background Image/Overlay */}
      <div className="absolute inset-0 z-0">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={title}
            fill
            className="object-cover opacity-60"
            priority
          />
        ) : (
          <div className="w-full h-full bg-linear-to-br from-surface-low via-surface to-surface-low" />
        )}
        {/* Gradients for depth and readability */}
        <div className="absolute inset-0 bg-linear-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-linear-to-r from-background via-background/40 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 w-full">
        <div className="max-w-2xl">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <span className="inline-block px-3 py-1 glass rounded-full font-body text-primary text-[10px] font-bold uppercase tracking-[0.2em] mb-6 border border-primary/20">
              Featured Spotlight
            </span>
            <h1 className="font-headline text-5xl md:text-7xl font-bold text-text-main mb-6 tracking-tight leading-[1.1]">
              {title}
            </h1>

            {featured?.genres && Array.isArray(featured.genres) && (
              <div className="flex flex-wrap gap-2 mb-6">
                {featured.genres.slice(0, 3).map((genre: string, i: number) => (
                  <span
                    key={i}
                    className="px-4 py-1 glass rounded-full font-body text-xs text-text-main/80 border border-white/5"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}

            <p className="font-body text-text-main/70 text-lg md:text-xl mb-10 line-clamp-3 leading-relaxed max-w-xl">
              {description}
            </p>

            <div className="flex flex-wrap gap-5">
              <PlayStoreButton
                text="Start Watching"
                source="hero_banner"
                animeId={featured?.id}
              />
              {featured?.id && (
                <Link
                  href={`/anime/${featured.id}`}
                  className="px-8 py-3 glass rounded-md font-headline font-semibold text-text-main hover:bg-surface-high border border-white/10 transition-all hover:scale-105 active:scale-95"
                >
                  View Details
                </Link>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
