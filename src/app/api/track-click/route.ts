import { NextResponse } from "next/server";

// TODO: Migration leftover. The "click_events" table lived only in Supabase.
// Stubbed to succeed so PlayStoreButton tracking calls don't surface as errors.

export async function POST() {
  return NextResponse.json({ success: true });
}
