import { NextResponse } from "next/server";

// TODO: Migration leftover. The "news" table lived only in Supabase. Add a
// Prisma model if this is needed; for now, GET returns [] and POST is 501.

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json([]);
}

export async function POST() {
  return NextResponse.json({ error: "News API not implemented" }, { status: 501 });
}
