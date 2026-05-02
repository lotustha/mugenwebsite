import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  try {
    const { name, email, subject, message } = await request.json();
    
    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }
    
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("support_tickets")
      .insert([{
        name,
        email,
        subject,
        message,
        status: "open",
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();
    
    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: "Failed to create ticket" }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error creating ticket:", error);
    return NextResponse.json({ error: "Failed to create ticket" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    
    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: "Failed to fetch tickets" }, { status: 500 });
    }
    
    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Error fetching tickets:", error);
    return NextResponse.json({ error: "Failed to fetch tickets" }, { status: 500 });
  }
}
