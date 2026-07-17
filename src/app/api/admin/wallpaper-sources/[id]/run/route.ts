/**
 * POST /api/admin/wallpaper-sources/[id]/run
 * Manual "Run Now" — Pinterest scrape needs no AI, so this just forces the
 * importer for one source and returns the result.
 */

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { processWallpaperSources } from "@/lib/wallpaper-importer";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const results = await processWallpaperSources({
      sourceId: id,
      force: true,
      invokingUser: { id: user.id, email: user.email },
    });
    return NextResponse.json({ ok: true, results });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
