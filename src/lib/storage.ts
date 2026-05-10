import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

const DEFAULT_DIR = path.join(process.cwd(), "uploads");

export function uploadDir(): string {
  return process.env.UPLOAD_DIR || DEFAULT_DIR;
}

export interface SaveResult {
  /** Absolute path on disk where the file was written. */
  path: string;
  /** Relative URL ("/uploads/folder/filename.ext") to store in the DB and serve via /uploads/[...path]. */
  url: string;
}

export async function saveBuffer(opts: {
  buffer: Buffer | Uint8Array | ArrayBuffer;
  folder: string;
  ext: string;
}): Promise<SaveResult> {
  const folder = opts.folder.replace(/[^a-zA-Z0-9_-]/g, "") || "misc";
  const ext = (opts.ext.replace(/^\./, "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) || "bin").toLowerCase();
  const filename = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;

  const dir = path.join(uploadDir(), folder);
  await fs.mkdir(dir, { recursive: true });

  const fullPath = path.join(dir, filename);
  const data =
    opts.buffer instanceof Buffer
      ? opts.buffer
      : opts.buffer instanceof ArrayBuffer
      ? Buffer.from(opts.buffer)
      : Buffer.from(opts.buffer);
  await fs.writeFile(fullPath, data);

  return { path: fullPath, url: `/uploads/${folder}/${filename}` };
}
