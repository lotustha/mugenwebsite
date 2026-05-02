import MoviesContent from "./MoviesContent";
import SectionHeader from "@/components/SectionHeader";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Movies & TV Shows — Mugen",
  description: "Browse popular and top-rated movies and TV shows. Download the Mugen App to watch.",
};

export default function MoviesPage() {
  return (
    <div className="min-h-screen py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader tag="Browse" title="Movies & TV Shows" className="mb-10" />
        <MoviesContent />
      </div>
    </div>
  );
}
