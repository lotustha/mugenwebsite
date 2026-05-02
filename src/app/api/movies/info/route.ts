import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  try {
    const res = await fetch(`${process.env.MOVIE_API_BASE}/media/${encodeURIComponent(id)}`);
    if (!res.ok) return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
