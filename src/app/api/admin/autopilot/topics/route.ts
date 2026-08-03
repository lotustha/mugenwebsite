/** Topic CRUD for the AI autopilot. */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { slugify } from "@/lib/post-creator";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { name, promptHint, category } = await request.json();
    if (!name?.trim() || !promptHint?.trim()) {
      return NextResponse.json({ error: "name and promptHint are required" }, { status: 400 });
    }

    const topic = await prisma.aiTopic.create({
      data: {
        name: name.trim(),
        slug: slugify(name),
        promptHint: promptHint.trim(),
        category: category?.trim() || "Anime News",
      },
    });
    return NextResponse.json(topic);
  } catch (e) {
    const msg = e instanceof Error && e.message.includes("Unique") ? "A topic with that name already exists" : "Failed to create topic";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id, ...fields } = await request.json();
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const topic = await prisma.aiTopic.update({
      where: { id },
      data: {
        ...(fields.name !== undefined && { name: fields.name.trim(), slug: slugify(fields.name) }),
        ...(fields.promptHint !== undefined && { promptHint: fields.promptHint.trim() }),
        ...(fields.category !== undefined && { category: fields.category.trim() }),
        ...(fields.isActive !== undefined && { isActive: !!fields.isActive }),
        // Manual override on top of the measured score: 0.5 halves a topic's odds,
        // 2 doubles them, without touching the engagement data behind it.
        ...(fields.boost !== undefined && { boost: Math.max(0.1, Math.min(5, Number(fields.boost) || 1)) }),
      },
    });
    return NextResponse.json(topic);
  } catch {
    return NextResponse.json({ error: "Failed to update topic" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  try {
    // Posts and runs keep their history; the FK is SetNull, so deleting a topic
    // never deletes published content.
    await prisma.aiTopic.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete topic" }, { status: 400 });
  }
}
