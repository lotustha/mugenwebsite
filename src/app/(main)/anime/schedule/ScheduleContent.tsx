"use client";

import { useEffect, useState } from "react";
import AnimeGrid from "@/components/AnimeGrid";

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i}>
          <div className="aspect-[2/3] bg-surface rounded-xl animate-pulse" />
          <div className="mt-2 h-3 bg-surface rounded animate-pulse w-3/4" />
        </div>
      ))}
    </div>
  );
}

export default function ScheduleContent() {
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/anime/schedule")
      .then((r) => r.json())
      .then((data) => {
        setSchedule(Array.isArray(data) ? data : data?.results ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <GridSkeleton />;

  if (schedule.length === 0) {
    return (
      <div className="text-center py-20 bg-surface rounded-lg">
        <p className="font-body text-text-main/60">Schedule unavailable right now.</p>
        <p className="font-body text-text-main/40 text-sm mt-2">Check back soon.</p>
      </div>
    );
  }

  return <AnimeGrid anime={schedule} />;
}
