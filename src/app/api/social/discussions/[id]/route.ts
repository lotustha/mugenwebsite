import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { userSelect, withAbsoluteMedia } from "@/lib/social-serialize";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** GET a discussion thread with its replies (flat; client nests via parentId). */
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const d = await prisma.discussion.findUnique({
    where: { id },
    include: {
      author: { select: userSelect },
      replies: {
        orderBy: { createdAt: "asc" },
        take: 500,
        include: { author: { select: userSelect } },
      },
    },
  });
  if (!d) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(
    withAbsoluteMedia({
      discussion: {
        id: d.id, title: d.title, content: d.content, animeTag: d.animeTag,
        replyCount: d.replyCount, lastActiveAt: d.lastActiveAt.toISOString(),
        createdAt: d.createdAt.toISOString(), author: d.author,
      },
      replies: d.replies.map((r) => ({
        id: r.id, content: r.content, parentId: r.parentId,
        createdAt: r.createdAt.toISOString(), author: r.author,
      })),
    }),
  );
}
