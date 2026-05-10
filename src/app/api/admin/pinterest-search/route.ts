import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { searchPins } from "@/lib/pinterest";

// POST /api/admin/pinterest-search
// Body: { query, limit?, excludeIds?, scrollDepth? }
// Returns: { results, hasMore }
export async function POST(request: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    query?: unknown;
    limit?: unknown;
    excludeIds?: unknown;
    scrollDepth?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (!query) return NextResponse.json({ error: "query required" }, { status: 400 });

  const limit = typeof body.limit === "number" && Number.isFinite(body.limit) ? body.limit : 25;
  const excludeIds = Array.isArray(body.excludeIds)
    ? body.excludeIds.filter((s): s is string => typeof s === "string")
    : [];
  const scrollDepth =
    typeof body.scrollDepth === "number" && Number.isFinite(body.scrollDepth)
      ? body.scrollDepth
      : undefined;

  try {
    const result = await searchPins(query, { limit, excludeIds, scrollDepth });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Search failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
