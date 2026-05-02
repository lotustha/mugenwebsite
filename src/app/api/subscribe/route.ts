import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    
    const supabase = await createClient();
    
    const { data: existing } = await supabase
      .from("subscribers")
      .select("email")
      .eq("email", email.toLowerCase())
      .maybeSingle();
    
    if (existing) {
      return NextResponse.json({ message: "Already subscribed" }, { status: 200 });
    }
    
    const { error } = await supabase
      .from("subscribers")
      .insert([{
        email: email.toLowerCase(),
        created_at: new Date().toISOString(),
      }]);
    
    if (error) {
      console.error("Supabase error:", error);
      if (error.code === "23505") {
        return NextResponse.json({ message: "Already subscribed" }, { status: 200 });
      }
      return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error subscribing:", error);
    return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
  }
}
