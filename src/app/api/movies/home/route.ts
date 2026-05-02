import { NextResponse } from "next/server";
import { fetchWithTimeout } from "@/lib/fetcher";

export const revalidate = 3600;

export async function GET() {
  try {
    const res = await fetchWithTimeout(`${process.env.MOVIE_API_BASE}/home`, {
      next: { revalidate: 3600 },
      timeout: 5000,
    });
    if (!res.ok) return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
    return NextResponse.json(await res.json());
  } catch (error) {
    console.error("Movie home API error:", error);
    return NextResponse.json({ error: "Internal server error or timeout" }, { status: 500 });
  }
}
