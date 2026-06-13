import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { saveBuffer } from "@/lib/storage";
import { absolutizeUrl } from "@/lib/url";

export const dynamic = "force-dynamic";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Authenticated image upload for any signed-in user (avatars, inline images).
 * multipart/form-data: file, folder? (defaults to "social"). Returns an
 * absolute URL so the mobile app can use it directly.
 */
export async function POST(req: Request) {
  const gate = await requireUser(req);
  if ("error" in gate) return gate.error;

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });

  const file = form.get("file");
  const folder = (form.get("folder") as string | null)?.replace(/[^a-z0-9_-]/gi, "") || "social";
  if (!(file instanceof File)) return NextResponse.json({ error: "file is required" }, { status: 400 });
  if (!IMAGE_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Unsupported image type" }, { status: 415 });
  }
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Image too large (max 8MB)" }, { status: 413 });

  const ext = file.name.split(".").pop() || "jpg";
  const buffer = Buffer.from(await file.arrayBuffer());
  const saved = await saveBuffer({ buffer, folder, ext });

  return NextResponse.json({ url: absolutizeUrl(saved.url), path: saved.url });
}
