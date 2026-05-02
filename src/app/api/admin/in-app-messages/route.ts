import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

const INCLUDE = {
  _count: { select: { impressions: true, clicks: true } },
};

// GET — list all messages with stats
export async function GET() {
  try {
    const messages = await prisma.inAppMessage.findMany({
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      include: INCLUDE,
    });
    return NextResponse.json(messages.map(({ _count, ...m }) => ({
      ...m,
      impressionCount: _count.impressions,
      clickCount:      _count.clicks,
      ctr: _count.impressions > 0
        ? Math.round((_count.clicks / _count.impressions) * 100)
        : 0,
    })));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

// POST — create message
export async function POST(req: Request) {
  if (!await requireAuth()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const msg = await prisma.inAppMessage.create({
      data: {
        title:      body.title,
        body:       body.body,
        imageUrl:   body.imageUrl   ?? null,
        buttonText: body.buttonText ?? null,
        buttonUrl:  body.buttonUrl  ?? null,
        style:      body.style      ?? "info",
        targetApp:  body.targetApp  ?? null,
        persistent: body.persistent ?? false,
        cancelable: body.cancelable ?? true,
        active:     body.active     ?? true,
        priority:   body.priority   ?? 0,
        startsAt:   body.startsAt   ? new Date(body.startsAt) : null,
        endsAt:     body.endsAt     ? new Date(body.endsAt)   : null,
      },
      include: INCLUDE,
    });
    return NextResponse.json({ ...msg, impressionCount: 0, clickCount: 0, ctr: 0 }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
