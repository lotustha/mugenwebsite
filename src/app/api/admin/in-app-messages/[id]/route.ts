import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// PUT — update message
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAuth()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const body = await req.json();
    const msg = await prisma.inAppMessage.update({
      where: { id },
      data: {
        ...(body.title      !== undefined && { title:      body.title }),
        ...(body.body       !== undefined && { body:       body.body }),
        ...(body.imageUrl   !== undefined && { imageUrl:   body.imageUrl   ?? null }),
        ...(body.buttonText !== undefined && { buttonText: body.buttonText ?? null }),
        ...(body.buttonUrl  !== undefined && { buttonUrl:  body.buttonUrl  ?? null }),
        ...(body.style      !== undefined && { style:      body.style }),
        ...(body.targetApp  !== undefined && { targetApp:  body.targetApp  ?? null }),
        ...(body.persistent !== undefined && { persistent: body.persistent }),
        ...(body.cancelable !== undefined && { cancelable: body.cancelable }),
        ...(body.active     !== undefined && { active:     body.active }),
        ...(body.priority   !== undefined && { priority:   body.priority }),
        ...(body.startsAt   !== undefined && { startsAt:   body.startsAt ? new Date(body.startsAt) : null }),
        ...(body.endsAt     !== undefined && { endsAt:     body.endsAt   ? new Date(body.endsAt)   : null }),
      },
      include: { _count: { select: { impressions: true, clicks: true } } },
    });
    return NextResponse.json({
      ...msg,
      impressionCount: msg._count.impressions,
      clickCount:      msg._count.clicks,
      ctr: msg._count.impressions > 0
        ? Math.round((msg._count.clicks / msg._count.impressions) * 100) : 0,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

// DELETE — remove message and all tracking data
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAuth()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.inAppMessage.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
