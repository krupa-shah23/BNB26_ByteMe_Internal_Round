/**
 * Thumbnail candidates mined on the device from real pixels: seek the reel on a canvas, score each still, keep a small JPEG.
 * Scores are plain heuristics (sharpness = edge energy, exposure = distance from mid-grey, face = share of skin-tone pixels
 * in the centre of the frame). They rank stills; they don't decide anything about the content.
 */
export interface MinedFrame { id: string; t: number; score: number; face: number; sharp: number; source: "video" | "photo"; url: string }

const SCORE_W = 128;
const OUT_W = 640;
const clamp = (v: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));

/** Score one drawn image (any size) on a small grey copy. */
function scoreImage(src: CanvasImageSource, w: number, h: number): { sharp: number; face: number; exposure: number } {
  const sw = SCORE_W, sh = Math.max(8, Math.round((SCORE_W * h) / w));
  const c = document.createElement("canvas"); c.width = sw; c.height = sh;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { sharp: 50, face: 50, exposure: 50 };
  ctx.drawImage(src, 0, 0, sw, sh);
  const d = ctx.getImageData(0, 0, sw, sh).data;
  const g = new Float32Array(sw * sh);
  let sum = 0, skin = 0, centre = 0;
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
    const i = (y * sw + x) * 4, r = d[i], gg = d[i + 1], b = d[i + 2];
    const l = 0.299 * r + 0.587 * gg + 0.114 * b;
    g[y * sw + x] = l; sum += l;
    if (x > sw * 0.2 && x < sw * 0.8 && y > sh * 0.1 && y < sh * 0.9) {
      centre++;
      const cb = 128 - 0.168736 * r - 0.331264 * gg + 0.5 * b, cr = 128 + 0.5 * r - 0.418688 * gg - 0.081312 * b;
      if (cb > 77 && cb < 127 && cr > 133 && cr < 173 && l > 40) skin++;
    }
  }
  // Laplacian variance
  let m = 0, m2 = 0, n = 0;
  for (let y = 1; y < sh - 1; y++) for (let x = 1; x < sw - 1; x++) {
    const v = 4 * g[y * sw + x] - g[y * sw + x - 1] - g[y * sw + x + 1] - g[(y - 1) * sw + x] - g[(y + 1) * sw + x];
    m += v; m2 += v * v; n++;
  }
  const variance = m2 / n - (m / n) ** 2;
  const mean = sum / (sw * sh);
  return {
    sharp: Math.round(clamp(Math.sqrt(Math.max(0, variance)) * 1.1)),
    face: Math.round(clamp(30 + (skin / Math.max(1, centre)) * 110, 0, 95)),
    exposure: Math.round(clamp(100 - Math.abs(mean - 128) * 0.9)),
  };
}

const combine = (s: { sharp: number; face: number; exposure: number }) => Math.round(s.sharp * 0.45 + s.face * 0.35 + s.exposure * 0.2);

function snapshot(src: CanvasImageSource, w: number, h: number): string {
  const c = document.createElement("canvas");
  c.width = OUT_W; c.height = Math.round((OUT_W * h) / w);
  c.getContext("2d")?.drawImage(src, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.8);
}

/** Wait for a seek; the timer guards a pane that never fires `seeked` (hidden tabs). */
function seek(v: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((res) => {
    const done = () => { v.removeEventListener("seeked", done); clearTimeout(id); res(); };
    const id = setTimeout(done, 1500);
    v.addEventListener("seeked", done);
    v.currentTime = t;
  });
}

/** Seek every `step` seconds between `from` and `to` and return the scored stills (best first). */
export async function mineVideoFrames(url: string, from: number, to: number, step = 0.5, signal?: AbortSignal): Promise<MinedFrame[]> {
  const v = document.createElement("video");
  v.muted = true; v.preload = "auto"; v.playsInline = true; v.src = url;
  await new Promise<void>((res, rej) => {
    v.onloadeddata = () => res();
    v.onerror = () => rej(new Error("video"));
    setTimeout(() => rej(new Error("timeout")), 10000);
  });
  const out: MinedFrame[] = [];
  const end = Math.min(to, v.duration || to) - 0.05;
  for (let t = Math.max(0, from) + 0.1; t < end; t += step) {
    if (signal?.aborted) break;
    await seek(v, t);
    if (!v.videoWidth) continue;
    const s = scoreImage(v, v.videoWidth, v.videoHeight);
    out.push({ id: `v_${t.toFixed(1)}`, t: +t.toFixed(1), score: combine(s), face: s.face, sharp: s.sharp, source: "video", url: snapshot(v, v.videoWidth, v.videoHeight) });
  }
  v.removeAttribute("src"); v.load();
  return out.sort((a, b) => b.score - a.score);
}

/** Score the uploaded photos (their resized copies) the same way. `url` stays the file path, no data copy. */
export async function minePhotos(urls: string[]): Promise<MinedFrame[]> {
  const rows = await Promise.all(urls.map((u, i) => new Promise<MinedFrame | null>((res) => {
    const img = new Image();
    img.onload = () => { const s = scoreImage(img, img.naturalWidth, img.naturalHeight); res({ id: `p_${i + 1}`, t: 0, score: combine(s), face: s.face, sharp: s.sharp, source: "photo", url: u }); };
    img.onerror = () => res(null);
    img.src = u;
  })));
  return rows.filter((r): r is MinedFrame => !!r).sort((a, b) => b.score - a.score);
}
