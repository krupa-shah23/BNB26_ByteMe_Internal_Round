"use client";

interface Heart { x: number; y: number; vx: number; vy: number; size: number; rot: number; vr: number; wob: number; ph: number; born: number; life: number; color: string; popped: boolean }
let counter = 0;
let heartCache: Path2D | null = null;
const heartPathGet = () => (heartCache ??= new Path2D("M0.5 0.9 C0.1 0.6 -0.2 0.3 0.1 0.05 C0.3 -0.12 0.5 0.02 0.5 0.15 C0.5 0.02 0.7 -0.12 0.9 0.05 C1.2 0.3 0.9 0.6 0.5 0.9Z"));

const cssColor = (v: string) => `rgb(${getComputedStyle(document.documentElement).getPropertyValue(v).trim().split(" ").join(" ")})`;

/** Reusable heart burst: fireHearts({ origin, count }). Colours come from CSS tokens. */
export function fireHearts({ origin, count = 90, onCount }: { origin?: { x: number; y: number }; count?: number; onCount?: (n: number) => void } = {}) {
  if (typeof document === "undefined") return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return; // caller shows a gentle pulse instead
  const low = (navigator.hardwareConcurrency ?? 8) <= 4;
  const n = Math.min(count, low ? 50 : 120);
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483000;";
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);
  const colors = [cssColor("--brand"), cssColor("--brand-2"), cssColor("--accent"), cssColor("--brand-2")];
  const W = innerWidth, H = innerHeight, now = performance.now();
  const spawns = origin ? [origin] : [{ x: W / 2, y: H + 10 }, { x: W * 0.08, y: H + 10 }, { x: W * 0.92, y: H + 10 }];
  const hearts: Heart[] = Array.from({ length: n }, (_, i) => {
    const o = spawns[i % spawns.length];
    return { x: o.x + (Math.random() - 0.5) * 80, y: o.y, vx: (Math.random() - 0.5) * 2.2, vy: -(2.2 + Math.random() * 3.6), size: 14 + Math.random() * 26, rot: (Math.random() - 0.5) * 0.6, vr: (Math.random() - 0.5) * 0.02, wob: 0.6 + Math.random() * 1.4, ph: Math.random() * 6, born: now + Math.random() * 500, life: 2000 + Math.random() * 500, color: colors[i % colors.length], popped: false };
  });
  const rings: { x: number; y: number; t: number; color: string }[] = [];
  let cheered = 0, raf = 0, stopped = false;

  const pop = (h: Heart, t: number) => { h.popped = true; h.born = t - h.life + 260; rings.push({ x: h.x, y: h.y, t, color: h.color }); cheered++; onCount?.(cheered); };
  // canvas never blocks the UI; taps are hit-tested against hearts from a window listener
  const tap = (e: PointerEvent) => {
    const hit = hearts.find((h) => !h.popped && performance.now() > h.born && Math.abs(e.clientX - h.x) < h.size && Math.abs(e.clientY - h.y) < h.size);
    if (hit) pop(hit, performance.now());
  };
  window.addEventListener("pointerdown", tap);

  const end = () => { stopped = true; cancelAnimationFrame(raf); canvas.remove(); window.removeEventListener("pointerdown", tap); document.removeEventListener("visibilitychange", vis); };
  const vis = () => { if (document.hidden) end(); };
  document.addEventListener("visibilitychange", vis);

  const frame = (t: number) => {
    if (stopped) return;
    ctx.clearRect(0, 0, W, H);
    let alive = 0;
    for (const h of hearts) {
      if (t < h.born) { alive++; continue; }
      const age = t - h.born;
      if (age > h.life) continue;
      alive++;
      h.x += h.vx + Math.sin(h.ph + age / 300) * h.wob * 0.5;
      h.y += h.vy;
      h.vy *= 0.994;
      h.rot += h.vr;
      const k = age / h.life;
      let scale = 1, alpha = 1;
      if (k > 0.75) { const q = (k - 0.75) / 0.25; scale = q < 0.4 ? 1 + 0.25 * (q / 0.4) : 1.25 * (1 - (q - 0.4) / 0.6); alpha = 1 - q * 0.3; }
      if (k > 0.97 && !h.popped) { rings.push({ x: h.x, y: h.y, t, color: h.color }); h.popped = true; }
      ctx.save();
      ctx.translate(h.x, h.y); ctx.rotate(h.rot); ctx.scale(h.size * scale, h.size * scale); ctx.translate(-0.5, -0.5);
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle = h.color; ctx.fill(heartPathGet());
      ctx.restore();
    }
    for (const r of rings) {
      const k = (t - r.t) / 380;
      if (k > 1) continue;
      alive++;
      ctx.save(); ctx.globalAlpha = 1 - k; ctx.strokeStyle = r.color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(r.x, r.y, 8 + k * 26, 0, 7); ctx.stroke(); ctx.restore();
    }
    if (alive === 0) return end();
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  setTimeout(end, 6500);
}
