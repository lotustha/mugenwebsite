import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return user;
}

// GET /api/admin/rss-feeds — list all feeds with recent log counts
export async function GET() {
  try {
    const feeds = await prisma.rssFeed.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        logs: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: { id: true, status: true, createdAt: true, errorMsg: true, itemGuid: true, postId: true },
        },
        _count: { select: { logs: true } },
      },
    });
    return NextResponse.json(feeds);
  } catch {
    return NextResponse.json({ error: "Failed to fetch feeds" }, { status: 500 });
  }
}

// POST /api/admin/rss-feeds — create feed
export async function POST(request: Request) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { name, url, scheduleMinutes = 60, isActive = true, autoPublish = false } = await request.json();
    if (!name || !url) return NextResponse.json({ error: "name and url are required" }, { status: 400 });

    const feed = await prisma.rssFeed.create({
      data: { name, url, scheduleMinutes, isActive, autoPublish },
    });
    return NextResponse.json(feed, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
