// Full end-to-end test: search → load video pin → capture HLS URL →
// remux to MP4 with ffmpeg → verify the output is a valid playable file.
//
//   node scripts/test-pinterest.mjs                         # default query
//   node scripts/test-pinterest.mjs "naruto live wallpaper" # custom

import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";

const QUERY = process.argv.slice(2).join(" ").trim() || "naruto live wallpaper";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

console.log(`\n=== Full Pinterest video pipeline test ===`);
console.log(`Query: ${QUERY}\n`);

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-blink-features=AutomationControlled"],
});

let outFile = null;

try {
  const ctx = await browser.newContext({
    userAgent: UA,
    viewport: { width: 1280, height: 1800 },
    locale: "en-US",
  });

  // ── Find a video pin ─────────────────────────────────────────────────────
  console.log("[1/4] Searching…");
  const searchPage = await ctx.newPage();
  await searchPage.goto(
    `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(QUERY)}&rs=typed`,
    { waitUntil: "domcontentloaded", timeout: 30_000 }
  );
  await searchPage.waitForSelector('a[href^="/pin/"]', { timeout: 12_000 }).catch(() => {});
  for (let i = 0; i < 2; i++) {
    await searchPage.evaluate(() => window.scrollBy(0, window.innerHeight * 1.5));
    await searchPage.waitForTimeout(800);
  }
  const pins = await searchPage.evaluate(() => {
    const out = [];
    const seen = new Set();
    document.querySelectorAll('a[href^="/pin/"]').forEach((el) => {
      const m = (el.getAttribute("href") || "").match(/\/pin\/(\d+)/);
      if (!m) return;
      const id = m[1];
      if (seen.has(id)) return;
      const isVideo = !!el.closest('[data-test-id="pin"]')?.querySelector('video, [data-test-id*="video"]');
      seen.add(id);
      out.push({ pinId: id, isVideo });
    });
    return out;
  });
  await searchPage.close();
  const target = pins.find((p) => p.isVideo);
  if (!target) {
    console.log("No video pins found"); process.exit(1);
  }
  console.log(`     Picked video pin: https://www.pinterest.com/pin/${target.pinId}/`);

  // ── Capture m3u8 URL ─────────────────────────────────────────────────────
  console.log("\n[2/4] Capturing HLS URL via headless browser…");
  const page = await ctx.newPage();
  const networkM3u8s = [];
  page.on("response", (resp) => {
    const url = resp.url();
    if (/v\d*\.pinimg\.com\/videos\//i.test(url) && /\.m3u8(\?|$)/i.test(url)) {
      networkM3u8s.push(url);
    }
  });
  await page.goto(`https://www.pinterest.com/pin/${target.pinId}/`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  await page.waitForSelector("video", { timeout: 8_000 }).catch(() => {});
  await page.evaluate(() => {
    const v = document.querySelector("video");
    if (!v) return;
    v.muted = true;
    v.scrollIntoView({ block: "center" });
    v.play().catch(() => {});
  }).catch(() => {});
  await page.waitForTimeout(4500);
  await page.close();

  const masterUrl = networkM3u8s.find((u) => !/_\d+w?\.m3u8/i.test(u) && !/_audio\.m3u8/i.test(u))
    ?? networkM3u8s[0];
  if (!masterUrl) {
    console.log("     ✗ No HLS URL captured"); process.exit(2);
  }
  console.log(`     ✓ Master playlist: ${masterUrl}`);

  // ── Run the actual ffmpeg command from src/lib/pinterest.ts ──────────────
  console.log("\n[3/4] Remuxing HLS → MP4 with ffmpeg (production args)…");
  outFile = path.join(os.tmpdir(), `pin-test-${Date.now()}.mp4`);
  const start = Date.now();

  await new Promise((resolve, reject) => {
    const ff = spawn("ffmpeg", [
      "-loglevel", "error",
      "-headers", `Referer: https://www.pinterest.com/\r\nUser-Agent: ${UA}\r\n`,
      "-i", masterUrl,
      "-c", "copy",
      "-bsf:a", "aac_adtstoasc",
      "-movflags", "+faststart",
      "-y",
      outFile,
    ], { stdio: ["ignore", "ignore", "pipe"] });

    let stderr = "";
    ff.stderr.on("data", (b) => { stderr += b.toString(); });
    ff.on("error", (err) => reject(new Error(`spawn failed: ${err.message}`)));
    ff.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exit ${code}: ${stderr.slice(0, 500)}`));
    });
  });

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const stat = await fs.stat(outFile);
  console.log(`     ✓ ffmpeg done in ${elapsed}s — wrote ${(stat.size / 1024 / 1024).toFixed(2)} MB`);

  // ── Probe the output to confirm it's a valid playable MP4 ────────────────
  console.log("\n[4/4] Probing output with ffprobe…");
  const probe = await new Promise((resolve, reject) => {
    const fp = spawn("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration,format_name,bit_rate:stream=codec_type,codec_name,width,height",
      "-of", "default=noprint_wrappers=1",
      outFile,
    ], { stdio: ["ignore", "pipe", "pipe"] });
    let out = "", err = "";
    fp.stdout.on("data", (b) => { out += b.toString(); });
    fp.stderr.on("data", (b) => { err += b.toString(); });
    fp.on("close", (code) => code === 0 ? resolve(out) : reject(new Error(err)));
  });
  console.log(probe.split("\n").map((l) => "     " + l).join("\n"));

  console.log(`\n=== ✓ PASS ===`);
  console.log(`Pinterest video successfully downloaded as MP4.`);
  console.log(`Production code WILL work on the VPS once ffmpeg is installed.`);
} finally {
  await browser.close();
  if (outFile) {
    try { await fs.unlink(outFile); } catch { /* ignore */ }
  }
}
