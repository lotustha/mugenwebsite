import { NextResponse } from "next/server";
import { fetchWithTimeout } from "@/lib/fetcher";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");
  
  if (!query) {
    return NextResponse.json({ error: "Query parameter required" }, { status: 400 });
  }
  
  try {
    const res = await fetchWithTimeout(`${process.env.ANIME_API_BASE}/suggestions/${encodeURIComponent(query)}`, {
      timeout: 5000,
    });
    
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch suggestions" }, { status: 500 });
    }
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Anime search API error:", error);
    return NextResponse.json({ error: "Internal server error or timeout" }, { status: 500 });
  }
}