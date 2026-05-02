import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

const WALLPAPERS_ALLOWED_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
];

let bucketReady = false;

export async function ensureWallpapersBucket() {
  if (bucketReady) return;
  try {
    const admin = createAdminClient();
    const { error } = await admin.storage.createBucket("wallpapers", {
      public: true,
      allowedMimeTypes: WALLPAPERS_ALLOWED_MIMES,
    });
    if (error) {
      // Bucket exists — update its mime type policy
      await admin.storage.updateBucket("wallpapers", {
        public: true,
        allowedMimeTypes: WALLPAPERS_ALLOWED_MIMES,
      });
    }
    bucketReady = true;
  } catch {
    // No service role key configured — skip, uploads may still fail
  }
}
