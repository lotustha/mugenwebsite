import AnimeContent from "./AnimeContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse Anime — MugenAnime",
  description: "Discover recently added and new anime releases. Filter by status and search thousands of titles.",
};

export default function AnimePage() {
  return (
    <div className="min-h-screen py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <AnimeContent />
      </div>
    </div>
  );
}
