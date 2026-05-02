import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const tags = await prisma.tag.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
      take: 30,
    });
    return NextResponse.json(tags);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
