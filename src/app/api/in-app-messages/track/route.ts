/**
 * POST /api/in-app-messages/track
 *
 * Body: { messageId: string, event: "impression" | "click", deviceId?: string }
 * Flutter calls this to record when a message is shown or its button clicked.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { messageId, event, deviceId } = await req.json();

    if (!messageId || !["impression", "click"].includes(event)) {
      return NextResponse.json({ error: "messageId and event required" }, { status: 400 });
    }

    if (event === "impression") {
      await prisma.inAppImpression.create({
        data: { messageId, deviceId: deviceId ?? null },
      });
    } else {
      await prisma.inAppClick.create({
        data: { messageId, deviceId: deviceId ?? null },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    // Don't crash Flutter over a tracking failure
    return NextResponse.json({ ok: true });
  }
}
