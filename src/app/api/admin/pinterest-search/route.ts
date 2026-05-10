import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { searchPins } from "@/lib/pinterest";

// POST /api/admin/pinterest-search
// Body: { query: string, limit?: number }
// Returns: { results: PinSearchResult[] }
export async function POST(request: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { query?: unknown; limit?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (!query) return NextResponse.json({ error: "query required" }, { status: 400 });

  const limit = typeof body.limit === "number" && Number.isFinite(body.limit) ? body.limit : 25;

  try {
    const results = await searchPins(query, limit);
    return NextResponse.json({ results });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Search failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
