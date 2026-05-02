import { NextResponse } from "next/server";
import { fetchWithTimeout } from "@/lib/fetcher";

export const revalidate = 3600;

export async function GET() {
  try {
    const res = await fetchWithTimeout(`${process.env.ANIME_API_BASE}/recent-added`, {
      next: { revalidate: 3600 },
      timeout: 5000,
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch recent added" }, { status: 500 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Recent added API error:", error);
    return NextResponse.json({ error: "Internal server error or timeout" }, { status: 500 });
  }
}
