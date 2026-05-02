import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const INCLUDE = {
  links: true,
  screenshots: { orderBy: { order: "asc" as const } },
  faqs: { orderBy: { order: "asc" as const } },
};

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { links, screenshots, faqs, ...fields } = body;

    // Enforce single featured app — unset others before setting this one
    if (fields.featured === true) {
      await prisma.app.updateMany({ where: { id: { not: id } }, data: { featured: false } });
    }

    const app = await (prisma.app as any).update({
      where: { id },
      data: {
        ...fields,
        ...(links !== undefined ? {
          links: {
            deleteMany: {},
            create: links.map((l: any) => ({ platform: l.platform, url: l.url })),
          },
        } : {}),
        ...(screenshots !== undefined ? {
          screenshots: {
            deleteMany: {},
            create: screenshots.map((s: any, i: number) => ({ url: s.url, caption: s.caption ?? "", order: i })),
          },
        } : {}),
        ...(faqs !== undefined ? {
          faqs: {
            deleteMany: {},
            create: faqs.map((f: any, i: number) => ({ question: f.question, answer: f.answer, order: i })),
          },
        } : {}),
      },
      include: INCLUDE,
    });
    return NextResponse.json(app);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.app.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete app" }, { status: 500 });
  }
}
