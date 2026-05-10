/**
 * POST /api/admin/oauth/admob/disconnect
 * Clears the stored AdMob tokens from SystemSetting.
 */
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.systemSetting.deleteMany({
    where: { key: { in: ["admob_refresh_token", "admob_account_id", "admob_connected_email"] } },
  });

  return NextResponse.json({ ok: true });
}
