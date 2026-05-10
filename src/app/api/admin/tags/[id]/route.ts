import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";

async function requireAuth() {
  return await requireAdmin();
}

// PUT /api/admin/tags/[id]
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const { name } = await request.json();
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const tag = await prisma.tag.update({ where: { id }, data: { name, slug } });
    return NextResponse.json(tag);
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// DELETE /api/admin/tags/[id]
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    await prisma.tag.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
