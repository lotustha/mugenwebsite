import WallpapersContent from "./WallpapersContent";
import SectionHeader from "@/components/SectionHeader";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Anime Wallpapers — Mugen",
  description: "Download free high-quality anime wallpapers and live wallpapers.",
};

export default function WallpapersPage() {
  return (
    <div className="min-h-screen py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader tag="Free" title="Anime Wallpapers" className="mb-10" />
        <WallpapersContent />
      </div>
    </div>
  );
}
