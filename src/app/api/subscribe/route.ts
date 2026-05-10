import { NextResponse } from "next/server";

// TODO: Migration leftover. The "subscribers" table lived only in Supabase.
// Stubbed to succeed silently so the Footer subscribe form doesn't break.

export async function POST() {
  return NextResponse.json({ success: true });
}
