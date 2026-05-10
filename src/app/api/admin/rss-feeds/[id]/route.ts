import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";

async function requireAuth() {
  return await requireAdmin();
}

// GET /api/admin/rss-feeds/[id]
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const feed = await prisma.rssFeed.findUnique({
    where: { id },
    include: {
      logs: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { id: true, status: true, createdAt: true, errorMsg: true, itemGuid: true, postId: true },
      },
    },
  });
  if (!feed) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(feed);
}

// PATCH /api/admin/rss-feeds/[id]
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const body = await request.json();
    const feed = await prisma.rssFeed.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.url !== undefined && { url: body.url }),
        ...(body.scheduleMinutes !== undefined && { scheduleMinutes: body.scheduleMinutes }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.autoPublish !== undefined && { autoPublish: body.autoPublish }),
      },
    });
    return NextResponse.json(feed);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

// DELETE /api/admin/rss-feeds/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.rssFeed.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
