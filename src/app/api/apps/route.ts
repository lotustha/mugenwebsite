import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const INCLUDE = {
  links: true,
  screenshots: { orderBy: { order: "asc" as const } },
  faqs: { orderBy: { order: "asc" as const } },
};

export async function GET() {
  try {
    const apps = await (prisma.app as any).findMany({
      where: { published: true },
      include: INCLUDE,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(apps);
  } catch {
    // Pre-migration fallback
    try {
      const apps = await prisma.app.findMany({
        include: { links: true },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(apps.map(a => ({ ...a, screenshots: [], faqs: [] })));
    } catch {
      return NextResponse.json([], { status: 200 });
    }
  }
}
