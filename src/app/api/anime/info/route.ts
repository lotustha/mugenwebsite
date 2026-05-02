import { NextResponse } from "next/server";
import { fetchWithTimeout } from "@/lib/fetcher";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  
  if (!id) {
    return NextResponse.json({ error: "ID parameter required" }, { status: 400 });
  }
  
  try {
    const res = await fetchWithTimeout(`${process.env.ANIME_API_BASE}/info/${encodeURIComponent(id)}`, {
      timeout: 5000,
    });
    
    if (!res.ok) {
      console.error(`Failed to fetch anime info for ID: ${id}, status: ${res.status}`);
      return NextResponse.json({ error: "Failed to fetch anime info" }, { status: 500 });
    }
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Anime info API error:", error);
    return NextResponse.json({ error: "Internal server error or timeout" }, { status: 500 });
  }
}