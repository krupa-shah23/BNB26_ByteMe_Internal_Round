// Prepares the "Photo Dump → Reel" demo from a folder holding p1…p18 (.jpg/.jpeg/.png) and ONE finished reel video:
//   npm run prep-demo -- "D:/Downloads/random reel"
//  1. probes the video (pure JS); it is copied UNCHANGED to public/demo/photo-reel/reel.mp4 when the browser can play it
//     (H.264); only a non-playable codec is transcoded, and only if ffmpeg is installed
//  2. resizes the photos to ≤1920 px long edge (JPEG q82) into public/demo/photo-reel/photos/ (+ 360 px thumbs);
//     uses `sharp` if installed, else Python/Pillow, else copies as-is. Originals go to demo-originals/ (gitignored)
//  3. extracts poster.jpg at 1 s when ffmpeg is on PATH (otherwise keeps the poster that is already there)
//  4. fingerprints the ORIGINALS and rewrites the "photo-reel" group in fixtures/groups.json
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join, basename } from "node:path";
import { REEL_DIR, ROOT, buildPhotoReelGroup, findPhotos, findVideo, writeGroup } from "./lib/photoReelFixture.mjs";
import { browserPlayable, probeMp4 } from "./lib/mp4probe.mjs";

const folder = process.argv.slice(2).find((a) => !a.startsWith("-"));
if (!folder || !existsSync(folder)) { console.error('Usage: npm run prep-demo -- "<folder with p1…p18 and the reel>"'); process.exit(1); }

const photos = findPhotos(folder);
const video = findVideo(folder);
if (photos.length === 0) { console.error("No p1…p18 images found."); process.exit(1); }
if (!video) { console.error("No .mp4 found in the folder."); process.exit(1); }
if (photos.length < 18) console.warn(`WARNING: only ${photos.length} of 18 photos found (${[...Array(18).keys()].map((i) => i + 1).filter((n) => !photos.some((p) => p.n === n)).map((n) => `p${n}`).join(", ")} missing).`);

const hasFfmpeg = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" }).status === 0;
const photoDir = join(REEL_DIR, "photos");
mkdirSync(join(photoDir, "thumbs"), { recursive: true });
mkdirSync(join(ROOT, "demo-originals", "photo-reel"), { recursive: true });

// 1) video
const src = join(folder, video);
const probe = probeMp4(src);
const dest = join(REEL_DIR, "reel.mp4");
if (browserPlayable(probe.codec)) {
  copyFileSync(src, dest);
  console.log(`reel.mp4: copied unchanged (${probe.codec}, ${probe.width}x${probe.height}, ${probe.fps} fps, ${probe.durationSec}s${probe.hasAudio ? ", has an audio track (played muted)" : ""}).`);
} else if (hasFfmpeg) {
  const r = spawnSync("ffmpeg", ["-y", "-i", src, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-c:a", "aac", dest], { stdio: "inherit" });
  if (r.status !== 0) process.exit(1);
  console.log(`reel.mp4: transcoded ${probe.codec} → H.264 (yuv420p, +faststart).`);
} else {
  console.error(`The video codec is ${probe.codec}; browsers can't play it and ffmpeg isn't installed. Convert it to H.264 MP4 and re-run.`);
  process.exit(1);
}

// 2) photos
let sharp = null;
try { sharp = (await import("sharp")).default; } catch { /* optional */ }
const py = `
import sys, os
from PIL import Image, ImageOps
src, big, small = sys.argv[1:4]
im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
a = im.copy(); a.thumbnail((1920, 1920)); a.save(big, "JPEG", quality=82, optimize=True)
b = im.copy(); b.thumbnail((360, 360)); b.save(small, "JPEG", quality=76, optimize=True)
`;
let how = "";
for (const p of photos) {
  copyFileSync(p.path, join(ROOT, "demo-originals", "photo-reel", p.file));
  const big = join(photoDir, `p${p.n}.jpg`), small = join(photoDir, "thumbs", `p${p.n}.jpg`);
  if (sharp) {
    await sharp(p.path).rotate().resize(1920, 1920, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82 }).toFile(big);
    await sharp(p.path).rotate().resize(360, 360, { fit: "inside" }).jpeg({ quality: 76 }).toFile(small);
    how = "sharp";
  } else if (spawnSync("python", ["-c", py, p.path, big, small]).status === 0) {
    how = "Pillow";
  } else { copyFileSync(p.path, big); copyFileSync(p.path, small); how = "plain copy (no resizer found)"; }
}
console.log(`photos: ${photos.length} written to public/demo/photo-reel/photos/ via ${how}; originals kept in demo-originals/ (gitignored).`);

// 3) poster
if (hasFfmpeg) {
  spawnSync("ffmpeg", ["-y", "-ss", "1", "-i", dest, "-frames:v", "1", "-q:v", "3", join(REEL_DIR, "poster.jpg")], { stdio: "ignore" });
  console.log("poster.jpg: frame at 1 s.");
} else console.log(existsSync(join(REEL_DIR, "poster.jpg")) ? "poster.jpg: kept the existing file (ffmpeg not installed)." : "poster.jpg: MISSING (install ffmpeg or add one by hand).");

// 4) fixture
writeGroup(buildPhotoReelGroup(photos, probe));
console.log(`groups.json: photo-reel updated (${photos.length} fingerprints). Source folder: ${basename(folder)}`);
