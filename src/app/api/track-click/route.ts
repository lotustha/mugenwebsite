import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  try {
    const { source, animeId } = await request.json();
    
    if (!source) {
      return NextResponse.json({ error: "Source is required" }, { status: 400 });
    }
    
    const supabase = await createClient();
    
    const { error } = await supabase
      .from("click_events")
      .insert([{
        source,
        anime_id: animeId || null,
        created_at: new Date().toISOString(),
      }]);
    
    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: "Failed to track click" }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error tracking click:", error);
    return NextResponse.json({ error: "Failed to track click" }, { status: 500 });
  }
}
