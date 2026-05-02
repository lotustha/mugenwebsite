import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

// POST /api/admin/upload  — upload image to Supabase Storage
// Body: FormData { file: File, folder?: string }
// Returns: { url: string }
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
    if (!allowed.includes(file.type))
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });

    if (file.size > 10 * 1024 * 1024)
      return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 400 });

    const folder = (formData.get("folder") as string | null) ?? "misc";
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    await supabase.storage.createBucket("media", { public: true }).catch(() => {});

    const { error: uploadError } = await supabase.storage
      .from("media")
      .upload(filename, file, { contentType: file.type, upsert: false });

    if (uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 });

    const { data: { publicUrl } } = supabase.storage.from("media").getPublicUrl(filename);
    return NextResponse.json({ url: publicUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Upload failed" }, { status: 500 });
  }
}
