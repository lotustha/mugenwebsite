/**
 * POST /api/posts/[slug]/view — record one unique view.
 *
 * Public on purpose: the Flutter app calls this too (pass {"deviceId": "...",
 * "source": "app"}). Counting happens here rather than in the server component
 * so link prefetches and crawlers don't inflate the numbers.
 *
 * The resulting PostView rows are the raw signal the AI autopilot uses to decide
 * which kinds of posts to write more of, so keeping bots out of them matters more
 * than catching every last real reader.
 */

import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Substrings that appear in the UA of crawlers, previewers and link-unfurlers.
// These generate a LOT of traffic on a news site and would otherwise dominate
// the engagement signal entirely.
const BOT_UA =
  /bot|crawl|spider|slurp|bing|yandex|baidu|duckduck|facebookexternalhit|whatsapp|telegram|discord|slack|twitter|embedly|quora|pinterest|redditbot|linkedin|headless|phantom|puppeteer|playwright|lighthouse|gtmetrix|pingdom|uptime|curl|wget|python-requests|axios|go-http|java\/|okhttp|scrapy/i;

function visitorHash(raw: string): string {
  return createHash("sha256")
    .update(`${raw}::${process.env.AUTH_SECRET ?? "mugen-view-salt"}`)
    .digest("hex")
    .slice(0, 40);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  try {
    const ua = request.headers.get("user-agent") ?? "";
    if (!ua || BOT_UA.test(ua)) {
      return NextResponse.json({ ok: true, counted: false, reason: "bot" });
    }

    const body = await request.json().catch(() => ({}) as Record<string, unknown>);
    const clientId = typeof body.visitorId === "string" ? body.visitorId
                   : typeof body.deviceId === "string" ? body.deviceId
                   : null;
    const source = body.source === "app" ? "app" : "web";

    // Prefer the client-supplied stable id. Fall back to IP+UA so a client that
    // blocks localStorage still counts once, rather than once per page load.
    const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim()
      || request.headers.get("x-real-ip")
      || "unknown";
    const visitorKey = visitorHash(clientId ?? `${ip}|${ua}`);

    const post = await prisma.post.findFirst({
      where: { slug, published: true },
      select: { id: true },
    });
    if (!post) return NextResponse.json({ ok: false }, { status: 404 });

    // The [postId, visitorKey] unique constraint makes this idempotent — a repeat
    // view throws P2002, which we swallow. viewsCount is only bumped when a row
    // was genuinely inserted, so the counter always equals the unique-visitor count.
    try {
      await prisma.postView.create({
        data: { postId: post.id, visitorKey, source },
      });
      await prisma.post.update({
        where: { id: post.id },
        data: { viewsCount: { increment: 1 } },
      });
      return NextResponse.json({ ok: true, counted: true });
    } catch {
      return NextResponse.json({ ok: true, counted: false, reason: "duplicate" });
    }
  } catch {
    // Never surface tracking failures to the reader.
    return NextResponse.json({ ok: true, counted: false });
  }
}
