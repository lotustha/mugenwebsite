import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, requireUser } from "@/lib/auth-helpers";
import { saveBuffer } from "@/lib/storage";
import { processSocialVideo } from "@/lib/video";
import { serializePost, userSelect, withAbsoluteMedia } from "@/lib/social-serialize";

export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 12 * 1024 * 1024; // 12 MB
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-m4v"];
const PAGE_SIZE = 12;

/**
 * GET /api/social/posts — public discovery feed ("For You" + reels), ranked
 * Facebook-style: a time-decayed engagement score (likes + comments, fresher =
 * higher) with a boost for authors the viewer follows. Anonymous/new users (who
 * follow no one) simply get the most engaging recent posts — which is what
 * surfaces popular reels to brand-new users.
 *
 * Query: ?tab=recent|reels  ?animeTag=  ?cursor=<offset>  ?limit=
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const tab = url.searchParams.get("tab") ?? "recent";
  const animeTag = url.searchParams.get("animeTag")?.trim() || undefined;
  const offset = Math.max(Number(url.searchParams.get("cursor")) || 0, 0);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || PAGE_SIZE, 1), 30);

  const viewer = await getSessionUser(req);

  // Rank candidate posts in SQL: HN-style gravity decay over engagement, plus a
  // strong boost for followed authors. We only need ordered ids here; relations
  // are hydrated with Prisma below.
  const params: unknown[] = [];
  const conds = ["status = 'READY'"];
  if (tab === "reels") conds.push("type = 'REEL'");
  if (animeTag) {
    params.push(animeTag);
    conds.push(`lower(anime_tag) = lower($${params.length})`);
  }
  let followBoost = "0";
  if (viewer) {
    params.push(viewer.id);
    followBoost = `(CASE WHEN author_id IN (SELECT following_id FROM follows WHERE follower_id = $${params.length}::uuid) THEN 5 ELSE 0 END)`;
  }
  params.push(limit + 1);
  const limIdx = params.length;
  params.push(offset);
  const offIdx = params.length;

  const sql = `
    SELECT id FROM social_posts
    WHERE ${conds.join(" AND ")}
    ORDER BY (
      (likes_count + 2 * comments_count + 1)
      / power(EXTRACT(EPOCH FROM (now() - created_at)) / 3600 + 2, 1.5)
      + ${followBoost}
    ) DESC, created_at DESC
    LIMIT $${limIdx} OFFSET $${offIdx}
  `;
  const ranked = await prisma.$queryRawUnsafe<{ id: string }[]>(sql, ...params);

  const hasMore = ranked.length > limit;
  const pageIds = (hasMore ? ranked.slice(0, limit) : ranked).map((r) => r.id);

  const rows = await prisma.socialPost.findMany({
    where: { id: { in: pageIds } },
    include: {
      author: { select: userSelect },
      likes: viewer ? { where: { userId: viewer.id }, select: { userId: true } } : false,
      repostOf: { include: { author: { select: userSelect } } },
    },
  });
  // Preserve the ranked order (findMany doesn't guarantee it).
  const byId = new Map(rows.map((p) => [p.id, p]));
  const items = pageIds
    .map((id) => byId.get(id))
    .filter((p): p is (typeof rows)[number] => !!p)
    .map((p) => serializePost(p as never, viewer?.id));
  const nextCursor = hasMore ? String(offset + limit) : null;

  return NextResponse.json(withAbsoluteMedia({ items, nextCursor }));
}

/**
 * POST /api/social/posts — create an image post (READY) or video/reel
 * (PROCESSING; transcoded in the background). multipart/form-data:
 *   file, caption?, animeTag?
 */
export async function POST(req: Request) {
  const gate = await requireUser(req);
  if ("error" in gate) return gate.error;
  const { user } = gate;

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });

  const file = form.get("file");
  const caption = (form.get("caption") as string | null)?.slice(0, 2200) || null;
  const animeTag = (form.get("animeTag") as string | null)?.trim().slice(0, 80) || null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A media file is required" }, { status: 400 });
  }

  const isImage = IMAGE_TYPES.includes(file.type);
  const isVideo = VIDEO_TYPES.includes(file.type) || file.type.startsWith("video/");
  if (!isImage && !isVideo) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
  }
  const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > maxBytes) {
    return NextResponse.json({ error: "File too large" }, { status: 413 });
  }

  const ext = file.name.split(".").pop() || (isVideo ? "mp4" : "jpg");
  const buffer = Buffer.from(await file.arrayBuffer());
  const saved = await saveBuffer({ buffer, folder: "social", ext });

  if (isImage) {
    const post = await prisma.socialPost.create({
      data: {
        authorId: user.id,
        type: "IMAGE",
        status: "READY",
        caption,
        animeTag,
        mediaUrl: saved.url,
      },
      include: { author: { select: userSelect } },
    });
    return NextResponse.json(withAbsoluteMedia({ post: serializePost(post as never, user.id) }), { status: 201 });
  }

  // Video → create PROCESSING, then transcode in the background.
  const post = await prisma.socialPost.create({
    data: {
      authorId: user.id,
      type: "REEL",
      status: "PROCESSING",
      caption,
      animeTag,
      mediaUrl: saved.url, // original plays until transcode swaps it
    },
    include: { author: { select: userSelect } },
  });

  // Fire-and-forget; processSocialVideo flips status to READY/FAILED.
  void processSocialVideo(post.id, saved.path);

  return NextResponse.json(withAbsoluteMedia({ post: serializePost(post as never, user.id) }), { status: 202 });
}
