"use client";

import { motion } from "framer-motion";
import AnimeCard from "./AnimeCard";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

export default function AnimeGrid({ anime, linkPrefix }: { anime: any[]; linkPrefix?: string }) {
  if (!Array.isArray(anime) || !anime.length) {
    return (
      <div className="text-center py-20">
        <p className="font-body text-text-main/60">No content found.</p>
      </div>
    );
  }

  return (
    <motion.div
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {anime.map((item, index) => (
        <motion.div key={item.id || item.animeId || index} variants={cardVariants}>
          <AnimeCard anime={item} linkPrefix={linkPrefix} />
        </motion.div>
      ))}
    </motion.div>
  );
}
