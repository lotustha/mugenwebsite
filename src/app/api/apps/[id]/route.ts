import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const INCLUDE = {
  links: true,
  screenshots: { orderBy: { order: "asc" as const } },
  faqs: { orderBy: { order: "asc" as const } },
};

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isUuid = UUID_RE.test(id);
  const where = isUuid
    ? { OR: [{ id }, { slug: id }], published: true }
    : { slug: id, published: true };
  try {
    const app = await (prisma.app as any).findFirst({ where, include: INCLUDE });
    if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(app);
  } catch {
    if (!isUuid) return NextResponse.json({ error: "Not found" }, { status: 404 });
    try {
      const app = await prisma.app.findFirst({ where: { id }, include: { links: true } });
      if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ ...app, screenshots: [], faqs: [] });
    } catch {
      return NextResponse.json({ error: "Failed" }, { status: 500 });
    }
  }
}
