"use client";
import { motion, useAnimationFrame, useReducedMotion } from "framer-motion";
import { Heart, Share2 } from "lucide-react";
import { useRef } from "react";
import { AuthSwitch } from "@/components/landing/AuthSwitch";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

/* Social tiles. Brand marks are simplified, hand-drawn shapes (no logo files). */
const INK = "#0E1A17", GREEN = "#0B5D4F", LIME = "#D9E56B", TEAL = "#B5D9D6", TAN = "#A89B6B", CREAM = "#F8F5EE";
type Icon = { id: string; tile: string; draw: React.ReactNode; label: string };

const ICONS: Icon[] = [
  { id: "like", label: "Like", tile: LIME, draw: <Heart size="52%" fill={INK} stroke={INK} /> },
  { id: "instagram", label: "Instagram", tile: INK, draw: (<svg viewBox="0 0 32 32" width="56%" height="56%" fill="none" stroke={CREAM} strokeWidth="2.4"><rect x="5" y="5" width="22" height="22" rx="7" /><circle cx="16" cy="16" r="5.2" /><circle cx="22.4" cy="9.6" r="1.4" fill={CREAM} stroke="none" /></svg>) },
  { id: "youtube", label: "YouTube", tile: GREEN, draw: (<svg viewBox="0 0 32 32" width="62%" height="62%"><rect x="3" y="7.5" width="26" height="17" rx="5.5" fill={CREAM} /><path d="M13.2 12.2v7.6l6.6-3.8z" fill={GREEN} /></svg>) },
  { id: "share", label: "Share", tile: TEAL, draw: <Share2 size="50%" stroke={INK} strokeWidth={2.2} /> },
  { id: "x", label: "X", tile: TAN, draw: (<svg viewBox="0 0 32 32" width="52%" height="52%" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round"><path d="M7 6l18 20M25 6L7 26" /></svg>) },
  { id: "facebook", label: "Facebook", tile: TEAL, draw: (<svg viewBox="0 0 32 32" width="62%" height="62%"><circle cx="16" cy="16" r="12" fill={GREEN} /><path d="M17.4 26v-8.2h2.8l.5-3.3h-3.3v-2c0-1 .5-1.8 1.9-1.8h1.5V7.8c-.3 0-1.3-.2-2.4-.2-2.6 0-4.2 1.6-4.2 4.4v2.5h-2.8v3.3h2.8V26z" fill={CREAM} /></svg>) },
  { id: "linkedin", label: "LinkedIn", tile: LIME, draw: (<svg viewBox="0 0 32 32" width="58%" height="58%" fill={INK}><rect x="5" y="12" width="4.6" height="14" rx="1" /><circle cx="7.3" cy="7.6" r="2.7" /><path d="M13 12h4.4v2c.7-1.3 2.2-2.3 4.3-2.3 4 0 4.9 2.6 4.9 6V26H22v-7c0-1.7-.1-3.2-2-3.2s-2.4 1.5-2.4 3.1V26H13z" /></svg>) },
  { id: "comment", label: "Comment", tile: INK, draw: (<svg viewBox="0 0 32 32" width="56%" height="56%" fill="none" stroke={LIME} strokeWidth="2.6" strokeLinejoin="round"><path d="M6 7h20a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H15l-6 5v-5H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" /></svg>) },
  { id: "bookmark", label: "Save", tile: TAN, draw: (<svg viewBox="0 0 32 32" width="48%" height="48%" fill={INK}><path d="M9 4h14a1 1 0 0 1 1 1v23l-8-5.5L8 28V5a1 1 0 0 1 1-1z" /></svg>) },
  { id: "play", label: "Play", tile: GREEN, draw: (<svg viewBox="0 0 32 32" width="46%" height="46%" fill={LIME}><path d="M10 6v20l17-10z" /></svg>) },
];

/** The orbit is a wide ellipse that runs off the bottom of the screen, centred slightly right of the headline. Values are % of the stage. */
const CX = 53.5, CY = 53, RX = 30, RY = 39;
const TILT = [-8, 6, 0, 10, -6, 4, -10, 8, -4, 6];
const SPEED = 46; // px per second along the ellipse, clockwise
const SAMPLES = 720;

/** Ellipse sampled by arc length (in px) so tiles can be spaced evenly along the path, whatever the screen shape. */
function buildPath(w: number, h: number) {
  const a = (RX / 100) * w, b = (RY / 100) * h;
  const pts: { x: number; y: number; s: number }[] = [];
  let len = 0, px = 0, py = 0;
  for (let i = 0; i <= SAMPLES; i++) {
    const t = (i / SAMPLES) * Math.PI * 2;
    const x = (CX / 100) * w + a * Math.cos(t), y = (CY / 100) * h + b * Math.sin(t);
    if (i) len += Math.hypot(x - px, y - py);
    pts.push({ x, y, s: len }); px = x; py = y;
  }
  return { pts, len };
}
function at(path: ReturnType<typeof buildPath>, s: number) {
  const target = ((s % path.len) + path.len) % path.len;
  let lo = 0, hi = path.pts.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (path.pts[mid].s <= target) lo = mid; else hi = mid; }
  const p0 = path.pts[lo], p1 = path.pts[hi], k = (target - p0.s) / Math.max(1e-6, p1.s - p0.s);
  return { x: p0.x + (p1.x - p0.x) * k, y: p0.y + (p1.y - p0.y) * k };
}

function Orbit({ reduced }: { reduced: boolean }) {
  const stage = useRef<HTMLDivElement>(null);
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const cache = useRef<{ w: number; h: number; path: ReturnType<typeof buildPath> } | null>(null);
  useAnimationFrame((t) => {
    const el = stage.current; if (!el) return;
    const box = el.getBoundingClientRect();
    if (!box.width) return;
    if (!cache.current || cache.current.w !== box.width || cache.current.h !== box.height) cache.current = { w: box.width, h: box.height, path: buildPath(box.width, box.height) };
    const { path } = cache.current;
    // the text blocks the tiles should fade behind
    const avoid = Array.from(document.querySelectorAll<HTMLElement>("[data-avoid]")).map((n) => n.getBoundingClientRect());
    const fadeZone = Math.max(46, box.width * 0.054) * 1.1;
    const gap = path.len / ICONS.length;
    refs.current.forEach((node, i) => {
      if (!node) return;
      const pos = at(path, i * gap + (reduced ? 0 : (t / 1000) * SPEED));
      node.style.left = `${pos.x}px`; node.style.top = `${pos.y}px`;
      const cx = pos.x + box.left, cy = pos.y + box.top;
      let d = Infinity;
      for (const r of avoid) d = Math.min(d, Math.hypot(Math.max(r.left - cx, 0, cx - r.right), Math.max(r.top - cy, 0, cy - r.bottom)));
      node.style.opacity = String(Math.max(0, Math.min(1, d / fadeZone)));
    });
  });
  return (
    <div ref={stage} className="absolute inset-0">
      {ICONS.map((ic, i) => (
        <div key={ic.id} ref={(n) => { refs.current[i] = n; }} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: "50%", top: "50%", opacity: 0 }}>
          <motion.div initial={{ opacity: 0, scale: 0.4, rotate: TILT[i] - 24 }} animate={{ opacity: 1, scale: 1, rotate: TILT[i] }} transition={{ delay: 1.5 + i * 0.1, type: "spring", stiffness: 150, damping: 14 }}>
            <div role="img" aria-label={ic.label} className="grid place-items-center rounded-[22%] shadow-[0_8px_22px_-10px_rgba(14,26,23,0.55)]" style={{ background: ic.tile, width: "clamp(46px, 5.4vw, 92px)", height: "clamp(46px, 5.4vw, 92px)" }}>{ic.draw}</div>
          </motion.div>
        </div>
      ))}
    </div>
  );
}

const rise = (delay: number) => ({ initial: { opacity: 0, y: 40 }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 1, ease: [0.22, 1, 0.36, 1] as const } });
const fade = (delay: number) => ({ initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay, duration: 0.9 } });

export function WelcomeHero() {
  const reduced = !!useReducedMotion();

  return (
    <div className="sv-theme relative h-dvh min-h-[600px] w-full overflow-hidden bg-bg text-text">
      {/* nav: wordmark left, actions right */}
      <header className="absolute inset-x-0 top-0 z-20 flex h-[72px] items-center justify-between px-[6.5%]">
        <span className="font-display text-[clamp(1.4rem,2vw,1.9rem)] font-semibold tracking-tight">Creator<span className="text-brand">Ai</span></span>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <AuthSwitch active="signup" />
        </div>
      </header>

      {/* orbit */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <motion.ellipse cx={CX} cy={CY} rx={RX} ry={RY} fill="none" stroke="rgb(var(--text))" strokeOpacity="0.6" strokeWidth="1.2" strokeDasharray="1.2 5" strokeLinecap="round" vectorEffect="non-scaling-stroke"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9, duration: 1.2, ease: "easeInOut" }} />
      </svg>
      <div className="absolute inset-0" aria-hidden="true"><Orbit reduced={reduced} /></div>

      {/* headline, laid out as in the reference */}
      <h1 className="sr-only">Creating and publishing, made simple.</h1>
      <div data-avoid className="absolute z-10" style={{ left: "15%", top: "41%" }} aria-hidden="true">
        <motion.div {...rise(0.1)} className="font-serif text-[clamp(2.6rem,7.2vw,8.5rem)] leading-[0.9] tracking-[-0.02em]">Creating</motion.div>
        <motion.p {...fade(0.9)} className="mt-[0.6vw] text-[clamp(0.8rem,1.15vw,1.15rem)]">From raw footage to a finished cut.</motion.p>
      </div>
      <motion.div data-avoid {...rise(0.6)} className="absolute z-10 font-display font-semibold leading-none" style={{ left: "48.6%", top: "44.5%", fontSize: "clamp(2rem,4.6vw,5rem)" }} aria-hidden="true">&amp;</motion.div>
      <div data-avoid className="absolute z-10 text-right" style={{ right: "15%", top: "55%" }} aria-hidden="true">
        <motion.div {...rise(0.3)} className="font-serif text-[clamp(2.6rem,7.2vw,8.5rem)] leading-[0.9] tracking-[-0.02em]">Publishing</motion.div>
        <motion.p {...fade(1.1)} className="mt-[0.6vw] text-[clamp(0.8rem,1.15vw,1.15rem)]">to every platform that matters.</motion.p>
      </div>
    </div>
  );
}
