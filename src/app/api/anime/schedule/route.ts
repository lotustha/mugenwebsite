import { NextResponse } from "next/server";

// Never prerender at build time — the date below would be frozen at build,
// and an empty/failed build-time fetch would be cached as the static response.
// Upstream data still caches for 1h via next.revalidate.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // animelok serves schedule per-date (/schedule/YYYY-MM-DD); older providers use bare /schedule
    const today = new Date().toISOString().slice(0, 10);
    let res = await fetch(`${process.env.ANIME_API_BASE}/schedule/${today}`, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      res = await fetch(`${process.env.ANIME_API_BASE}/schedule`, {
        next: { revalidate: 3600 },
      });
    }

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch schedule" }, { status: 500 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
