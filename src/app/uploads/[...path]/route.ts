import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { uploadDir } from "@/lib/storage";

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  svg: "image/svg+xml",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  m4v: "video/x-m4v",
};

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> }
) {
  const { path: parts } = await ctx.params;
  if (!parts?.length) return new NextResponse("Not found", { status: 404 });

  for (const p of parts) {
    if (!p || p === "." || p === ".." || p.includes("\\") || p.includes("/") || p.includes("\0")) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  const root = path.resolve(uploadDir());
  const file = path.resolve(path.join(root, ...parts));
  if (!file.startsWith(root + path.sep) && file !== root) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const data = await fs.readFile(file);
    const ext = parts[parts.length - 1].split(".").pop()?.toLowerCase() ?? "";
    const contentType = MIME[ext] ?? "application/octet-stream";
    return new NextResponse(data, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
