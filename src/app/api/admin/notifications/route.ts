/**
 * POST /api/admin/notifications — send a manual broadcast or test notification
 *
 * Body:
 *   topic:    "new_posts" | "new_wallpapers" | "all"   (default: "all")
 *   title:    string
 *   body:     string
 *   imageUrl: string (optional)
 *   data:     Record<string, string> (optional deep-link data)
 *   testToken: string (optional — send to single device instead of topic)
 */
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { sendBroadcast, sendToToken } from "@/lib/push-notifications";

export async function POST(req: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { topic = "all", title, body, imageUrl, data, testToken } = await req.json();

  if (!title || !body) {
    return NextResponse.json({ error: "title and body are required" }, { status: 400 });
  }

  const result = testToken
    ? await sendToToken(testToken, { title, body, imageUrl, data })
    : await sendBroadcast({ topic, title, body, imageUrl, data });

  return NextResponse.json(result, { status: result.success ? 200 : 502 });
}
