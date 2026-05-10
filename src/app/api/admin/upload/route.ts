import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { saveBuffer } from "@/lib/storage";

// POST /api/admin/upload  — upload image to UPLOAD_DIR (default /www/wwwroot/mugenstream.fun/uploads)
// Body: FormData { file: File, folder?: string }
// Returns: { url: string }
export async function POST(request: Request) {
  try {
    const user = await requireAdmin();
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

    const buffer = Buffer.from(await file.arrayBuffer());
    const { url } = await saveBuffer({ buffer, folder, ext });

    return NextResponse.json({ url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Upload failed" }, { status: 500 });
  }
}
