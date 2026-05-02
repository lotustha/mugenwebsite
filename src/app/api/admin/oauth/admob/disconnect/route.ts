/**
 * POST /api/admin/oauth/admob/disconnect
 * Clears the stored AdMob tokens from SystemSetting.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.systemSetting.deleteMany({
    where: { key: { in: ["admob_refresh_token", "admob_account_id", "admob_connected_email"] } },
  });

  return NextResponse.json({ ok: true });
}
