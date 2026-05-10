import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";

async function requireAuth() {
  return await requireAdmin();
}

// GET /api/admin/settings
export async function GET() {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const settings = await prisma.systemSetting.findMany();
    const config: Record<string, string> = {};
    for (const s of settings) config[s.key] = s.value;
    return NextResponse.json(config);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

// POST /api/admin/settings
export async function POST(request: Request) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    
    // Validate we're receiving an object
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Upsert all keys provided in the request body
    const promises = Object.entries(body).map(([key, value]) => {
      const val = typeof value === 'string' ? value : JSON.stringify(value);
      return prisma.systemSetting.upsert({
        where: { key },
        update: { value: val },
        create: { key, value: val }
      });
    });

    await Promise.all(promises);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
