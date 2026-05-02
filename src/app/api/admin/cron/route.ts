import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

const KEYS = ["cron_enabled", "cron_last_tick", "cron_last_run"] as const;

// GET /api/admin/cron — returns scheduler status
export async function GET() {
  try {
    const rows = await prisma.systemSetting.findMany({ where: { key: { in: [...KEYS] } } });
    const m = Object.fromEntries(rows.map(r => [r.key, r.value]));
    return NextResponse.json({
      enabled:   m.cron_enabled  === "true",
      lastTick:  m.cron_last_tick  ?? null,
      lastRun:   m.cron_last_run   ?? null,
    });
  } catch {
    return NextResponse.json({ enabled: false, lastTick: null, lastRun: null });
  }
}

// PATCH /api/admin/cron — enable or disable scheduler
export async function PATCH(req: Request) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { enabled } = await req.json();
  const value = enabled ? "true" : "false";

  await prisma.systemSetting.upsert({
    where:  { key: "cron_enabled" },
    create: { key: "cron_enabled", value },
    update: { value },
  });

  return NextResponse.json({ ok: true, enabled });
}
