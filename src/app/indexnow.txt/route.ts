/**
 * Serves the IndexNow verification key as plain text at /indexnow.txt.
 *
 * Search engines fetch this to confirm whoever submitted the URLs actually
 * controls the domain. Referenced as `keyLocation` in every submission.
 */

import { indexNowKey } from "@/lib/indexnow";

export const dynamic = "force-dynamic";

export async function GET() {
  const key = indexNowKey();
  if (!key) return new Response("Not found", { status: 404 });

  return new Response(key, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
