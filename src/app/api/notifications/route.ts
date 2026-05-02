/**
 * POST /api/notifications  — register an FCM token
 * DELETE /api/notifications — remove an FCM token
 *
 * Flutter calls this on app launch / token refresh.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { token, platform = "android" } = await req.json();
    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "token is required" }, { status: 400 });
    }
    await prisma.fcmToken.upsert({
      where:  { token },
      create: { token, platform },
      update: { platform, updatedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { token } = await req.json();
    if (!token) return NextResponse.json({ error: "token is required" }, { status: 400 });
    await prisma.fcmToken.deleteMany({ where: { token } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }); // idempotent — ignore not-found
  }
}
