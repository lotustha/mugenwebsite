import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const INCLUDE = {
  links: true,
  screenshots: { orderBy: { order: "asc" as const } },
  faqs: { orderBy: { order: "asc" as const } },
};

export async function GET() {
  try {
    const apps = await (prisma.app as any).findMany({ include: INCLUDE, orderBy: { createdAt: "desc" } });
    return NextResponse.json(apps);
  } catch {
    const apps = await prisma.app.findMany({ include: { links: true }, orderBy: { createdAt: "desc" } });
    return NextResponse.json(apps.map(a => ({ ...a, screenshots: [], faqs: [] })));
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, tagline, description, category, version, size, packageName,
            iconUrl, bannerUrl, videoUrl, privacyPolicy, published,
            links = [], screenshots = [], faqs = [] } = body;

    if (!name || !version) return NextResponse.json({ error: "name and version required" }, { status: 400 });

    const slug = body.slug?.trim() ? body.slug.trim() : slugify(name);

    const app = await (prisma.app as any).create({
      data: {
        slug, name, tagline, description, category, version,
        size, packageName, iconUrl, bannerUrl, videoUrl, privacyPolicy,
        published: published ?? true,
        links: { create: links.map((l: any) => ({ platform: l.platform, url: l.url })) },
        screenshots: { create: screenshots.map((s: any, i: number) => ({ url: s.url, caption: s.caption, order: i })) },
        faqs: { create: faqs.map((f: any, i: number) => ({ question: f.question, answer: f.answer, order: i })) },
      },
      include: INCLUDE,
    });
    return NextResponse.json(app, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}
