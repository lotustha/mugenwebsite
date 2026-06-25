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
  req: NextRequest,
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

  let stats;
  try {
    stats = await fs.stat(file);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
  if (!stats.isFile()) return new NextResponse("Not found", { status: 404 });

  const ext = parts[parts.length - 1].split(".").pop()?.toLowerCase() ?? "";
  const contentType = MIME[ext] ?? "application/octet-stream";
  const size = stats.size;

  // Always advertise range support so video players (ExoPlayer / mpv / browsers)
  // can stream and seek instead of downloading the whole file up front.
  const baseHeaders: Record<string, string> = {
    "Content-Type": contentType,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
  };

  const range = req.headers.get("range");
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (m) {
      let start = m[1] === "" ? 0 : parseInt(m[1], 10);
      let end = m[2] === "" ? size - 1 : parseInt(m[2], 10);
      if (Number.isNaN(start)) start = 0;
      if (Number.isNaN(end) || end >= size) end = size - 1;
      // Suffix range "bytes=-N" → last N bytes
      if (m[1] === "" && m[2] !== "") {
        start = Math.max(0, size - parseInt(m[2], 10));
        end = size - 1;
      }
      if (start > end || start >= size) {
        return new NextResponse("Range Not Satisfiable", {
          status: 416,
          headers: { "Content-Range": `bytes */${size}`, "Accept-Ranges": "bytes" },
        });
      }
      const chunkSize = end - start + 1;
      const fh = await fs.open(file, "r");
      try {
        const buffer = Buffer.alloc(chunkSize);
        await fh.read(buffer, 0, chunkSize, start);
        return new NextResponse(buffer, {
          status: 206,
          headers: {
            ...baseHeaders,
            "Content-Range": `bytes ${start}-${end}/${size}`,
            "Content-Length": String(chunkSize),
          },
        });
      } finally {
        await fh.close();
      }
    }
  }

  // No (or unparseable) range — return the whole file.
  const data = await fs.readFile(file);
  return new NextResponse(data, {
    status: 200,
    headers: { ...baseHeaders, "Content-Length": String(size) },
  });
}
