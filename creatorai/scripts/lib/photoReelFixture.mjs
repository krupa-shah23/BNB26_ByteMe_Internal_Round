// Shared by prep-demo.mjs and hash-demo.mjs: fingerprints the ORIGINAL photos and (re)builds the "photo-reel" group in fixtures/groups.json.
import { createHash } from "node:crypto";
import { closeSync, existsSync, openSync, readFileSync, readSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = fileURLToPath(new URL("../..", import.meta.url));
export const GROUPS_FILE = join(ROOT, "fixtures", "groups.json");
export const REEL_DIR = join(ROOT, "public", "demo", "photo-reel");
export const COUNT = 18;
const EXT = /\.(jpe?g|png|webp)$/i;

export function sha256First1Mb(path) {
  const fd = openSync(path, "r");
  const buf = Buffer.alloc(1024 * 1024);
  const n = readSync(fd, buf, 0, buf.length, 0);
  closeSync(fd);
  return createHash("sha256").update(buf.subarray(0, n)).digest("hex");
}

/** Pixel size of a JPEG (SOF marker) or PNG (IHDR) without any image library. */
export function imageSize(path) {
  const b = readFileSync(path);
  if (b.readUInt32BE(0) === 0x89504e47) return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xff) { i++; continue; }
    const m = b[i + 1];
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) };
    i += 2 + b.readUInt16BE(i + 2);
  }
  return { width: 0, height: 0 };
}

/** p1…p18 files in a folder (any case, p01 accepted); returns [{ n, file, path }]. */
export function findPhotos(dir) {
  const out = new Map();
  for (const f of readdirSync(dir)) {
    const m = /^p0*([1-9]\d?)\.[a-z]+$/i.exec(f);
    if (m && EXT.test(f) && +m[1] >= 1 && +m[1] <= COUNT) out.set(+m[1], { n: +m[1], file: f, path: join(dir, f) });
  }
  return [...out.values()].sort((a, b) => a.n - b.n);
}

export const findVideo = (dir) => readdirSync(dir).find((f) => /\.(mp4|m4v|mov)$/i.test(f) && statSync(join(dir, f)).isFile());

/** probe = result of probeMp4() or null when the reel isn't in the project yet. */
export function buildPhotoReelGroup(photos, probe) {
  const dur = probe?.durationSec ?? 16.5;
  return {
    id: "photo-reel", title: "Photo dump reel", topic: "lifestyle", format: "short", type: "Reel", preset: "Vlog/travel", media: true, hue: 6,
    kind: "photo-reel",
    inputs: photos.map((p) => ({
      role: `p${p.n}`, filenames: [p.file], sha256_first_1mb: sha256First1Mb(p.path), durationSec: 0, kind: "image",
      size: statSync(p.path).size, ...imageSize(p.path),
    })),
    photos: [],
    audio: { id: "none", src: "", risk: "low" },
    timeline: [{ at: 0, dur, src: "reel", in: 0, out: dur, kind: "reel", url: "/demo/photo-reel/reel.mp4" }],
    hashtags: ["#photodump", "#reel", "#memories"],
    chapters: [],
    output: {
      video: "/demo/photo-reel/reel.mp4", poster: "/demo/photo-reel/poster.jpg", durationSec: dur,
      width: probe?.width ?? 1080, height: probe?.height ?? 1920, fps: probe?.fps, codec: probe?.codec, hasAudio: probe?.hasAudio,
    },
  };
}

export function writeGroup(group) {
  const data = JSON.parse(readFileSync(GROUPS_FILE, "utf8"));
  const i = data.groups.findIndex((g) => g.id === "photo-reel");
  if (i >= 0) data.groups[i] = group; else data.groups.push(group);
  writeFileSync(GROUPS_FILE, JSON.stringify(data, null, 2) + "\n");
}

export const hasReel = () => existsSync(join(REEL_DIR, "reel.mp4"));
