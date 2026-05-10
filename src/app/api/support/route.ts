import { NextResponse } from "next/server";

// TODO: Migration leftover. The "support_tickets" table lived only in Supabase
// and was never modeled in Prisma. Add a Prisma model + DB push if this feature
// is needed; until then, both endpoints respond with 501 so callers fail loudly.

export async function POST() {
  return NextResponse.json({ error: "Support tickets not implemented" }, { status: 501 });
}

export async function GET() {
  return NextResponse.json([]);
}
