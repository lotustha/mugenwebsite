import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { userSelect, withAbsoluteMedia } from "@/lib/social-serialize";

export const dynamic = "force-dynamic";

/** GET discussion threads (most recently active first). Query: ?animeTag= ?cursor= */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const animeTag = url.searchParams.get("animeTag")?.trim() || undefined;
  const cursor = url.searchParams.get("cursor") || undefined;
  const limit = 20;

  const items = await prisma.discussion.findMany({
    where: animeTag ? { animeTag: { equals: animeTag, mode: "insensitive" } } : {},
    orderBy: { lastActiveAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { author: { select: userSelect } },
  });

  const hasMore = items.length > limit;
  const page = hasMore ? items.slice(0, limit) : items;
  return NextResponse.json(
    withAbsoluteMedia({
      items: page.map((d) => ({
        id: d.id,
        title: d.title,
        excerpt: d.content.slice(0, 180),
        animeTag: d.animeTag,
        replyCount: d.replyCount,
        lastActiveAt: d.lastActiveAt.toISOString(),
        createdAt: d.createdAt.toISOString(),
        author: d.author,
      })),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    }),
  );
}

/** POST a new discussion thread. Body: { title, content, animeTag? } */
export async function POST(req: Request) {
  const gate = await requireUser(req);
  if ("error" in gate) return gate.error;
  const { user } = gate;

  let body: { title?: string; content?: string; animeTag?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const title = body.title?.trim().slice(0, 200);
  const content = body.content?.trim().slice(0, 10000);
  const animeTag = body.animeTag?.trim().slice(0, 80) || null;
  if (!title || !content) {
    return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
  }

  const d = await prisma.discussion.create({
    data: { authorId: user.id, title, content, animeTag },
    include: { author: { select: userSelect } },
  });
  return NextResponse.json(
    withAbsoluteMedia({
      discussion: {
        id: d.id, title: d.title, content: d.content, animeTag: d.animeTag,
        replyCount: 0, lastActiveAt: d.lastActiveAt.toISOString(), createdAt: d.createdAt.toISOString(),
        author: d.author,
      },
    }),
    { status: 201 },
  );
}
