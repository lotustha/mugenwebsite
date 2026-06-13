"use client";

/** Compact relative timestamp (e.g. "3h", "2d"). Falls back to a date for old items. */
export default function RelativeTime({ iso, className }: { iso: string; className?: string }) {
  return (
    <time dateTime={iso} className={className} title={new Date(iso).toLocaleString()}>
      {format(iso)}
    </time>
  );
}

function format(iso: string): string {
  const then = new Date(iso).getTime();
  const sec = Math.max(1, Math.floor((Date.now() - then) / 1000));
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return `${wk}w`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
