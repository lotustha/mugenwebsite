import ScheduleContent from "./ScheduleContent";
import SectionHeader from "@/components/SectionHeader";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Anime Schedule — Mugen Anime",
  description: "See what anime is airing and when.",
};

export default function SchedulePage() {
  return (
    <div className="min-h-screen py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader tag="Airing" title="Anime Schedule" className="mb-10" />
        <ScheduleContent />
      </div>
    </div>
  );
}
