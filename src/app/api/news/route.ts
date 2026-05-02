import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("news")
      .select("*")
      .lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false })
      .limit(50);
    
    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 });
    }
    
    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Error fetching news:", error);
    return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { title, slug, content, imageUrl } = await request.json();
    
    if (!title || !slug || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from("news")
      .insert([{
        title,
        slug,
        content,
        image_url: imageUrl || null,
        published_at: new Date().toISOString(),
      }])
      .select()
      .single();
    
    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: "Failed to create news" }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error creating news:", error);
    return NextResponse.json({ error: "Failed to create news" }, { status: 500 });
  }
}
