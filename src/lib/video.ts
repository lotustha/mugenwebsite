// Server-side video optimization for social reels/posts.
//
// Runs ffmpeg/ffprobe as child processes (same approach proven in pinterest.ts).
// MUST be invoked async/fire-and-forget AFTER the post row is created with
// status PROCESSING — transcoding far exceeds any request timeout. When done it
// flips the row to READY (or FAILED) and fills in mediaUrl/posterUrl/dimensions.

import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { saveBuffer } from "@/lib/storage";
import { prisma } from "@/lib/prisma";

const MAX_HEIGHT = 1920; // cap reels at 1080x1920-ish
const MAX_WIDTH = 1080;
const REEL_MAX_SECONDS = 90; // hard trim guard

function run(cmd: string, args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args);
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (d) => (stdout += d.toString()));
    child.stderr?.on("data", (d) => (stderr += d.toString()));
    child.on("error", () => resolve({ code: -1, stdout, stderr: stderr || "spawn-error" }));
    child.on("close", (code) => resolve({ code: code ?? -1, stdout, stderr }));
  });
}

export interface ProbeResult {
  durationSec: number | null;
  width: number | null;
  height: number | null;
}

export async function probeVideo(inputPath: string): Promise<ProbeResult> {
  const { code, stdout } = await run("ffprobe", [
    "-v", "error",
    "-select_streams", "v:0",
    "-show_entries", "stream=width,height:format=duration",
    "-of", "json",
    inputPath,
  ]);
  if (code !== 0) return { durationSec: null, width: null, height: null };
  try {
    const json = JSON.parse(stdout);
    const stream = json.streams?.[0] ?? {};
    const duration = json.format?.duration ? Math.round(parseFloat(json.format.duration)) : null;
    return {
      durationSec: Number.isFinite(duration as number) ? (duration as number) : null,
      width: stream.width ?? null,
      height: stream.height ?? null,
    };
  } catch {
    return { durationSec: null, width: null, height: null };
  }
}

async function tmp(ext: string): Promise<string> {
  return path.join(os.tmpdir(), `social-${Date.now()}-${crypto.randomBytes(5).toString("hex")}.${ext}`);
}

/**
 * Background job: optimize an uploaded video and finalize the post row.
 * - Transcodes to H.264/AAC, +faststart, capped resolution, ≤90s.
 * - Extracts a poster frame.
 * - Updates the SocialPost to READY with the new media, or FAILED on error.
 */
export async function processSocialVideo(postId: string, originalDiskPath: string): Promise<void> {
  const outPath = await tmp("mp4");
  const posterPath = await tmp("jpg");
  try {
    const probe = await probeVideo(originalDiskPath);

    // Scale down only if larger than caps; keep aspect ratio; even dimensions.
    const scale = `scale='min(${MAX_WIDTH},iw)':'min(${MAX_HEIGHT},ih)':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2`;

    const transcode = await run("ffmpeg", [
      "-loglevel", "error",
      "-i", originalDiskPath,
      "-t", String(REEL_MAX_SECONDS),
      "-vf", scale,
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-crf", "24",
      "-c:a", "aac",
      "-b:a", "128k",
      "-movflags", "+faststart",
      "-y", outPath,
    ]);
    if (transcode.code !== 0) throw new Error(`ffmpeg transcode failed: ${transcode.stderr.slice(0, 300)}`);

    // Poster from ~1s in (or start for very short clips).
    await run("ffmpeg", [
      "-loglevel", "error",
      "-ss", "1",
      "-i", outPath,
      "-frames:v", "1",
      "-q:v", "3",
      "-y", posterPath,
    ]);

    const outProbe = await probeVideo(outPath);
    const videoBuf = await fs.readFile(outPath);
    const saved = await saveBuffer({ buffer: videoBuf, folder: "social", ext: "mp4" });

    let posterUrl: string | null = null;
    try {
      const posterBuf = await fs.readFile(posterPath);
      const savedPoster = await saveBuffer({ buffer: posterBuf, folder: "social", ext: "jpg" });
      posterUrl = savedPoster.url;
    } catch {
      posterUrl = null; // poster is best-effort
    }

    await prisma.socialPost.update({
      where: { id: postId },
      data: {
        status: "READY",
        mediaUrl: saved.url,
        posterUrl,
        durationSec: outProbe.durationSec ?? probe.durationSec,
        width: outProbe.width ?? probe.width,
        height: outProbe.height ?? probe.height,
      },
    });
  } catch (err) {
    console.error("[video] processing failed for post", postId, err);
    await prisma.socialPost
      .update({ where: { id: postId }, data: { status: "FAILED" } })
      .catch(() => {});
  } finally {
    await fs.unlink(outPath).catch(() => {});
    await fs.unlink(posterPath).catch(() => {});
    await fs.unlink(originalDiskPath).catch(() => {});
  }
}
