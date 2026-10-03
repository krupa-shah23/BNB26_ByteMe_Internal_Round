"use client";
import { animate, motion, useInView, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";

/** Hue-shifted gradient built only from tokens; `seed` varies the angle/mix so every project looks distinct. */
export function gradientFor(seed: number) {
  const a = (seed * 67) % 360;
  const mix = 30 + ((seed * 13) % 40);
  return `linear-gradient(${a}deg, rgb(var(--brand) / 0.9) 0%, rgb(var(--accent) / ${mix / 100}) 100%), rgb(var(--sunken))`;
}

export function Poster({ seed, label, className, children }: { seed: number; label?: string; className?: string; children?: React.ReactNode }) {
  return (
    <div className={clsx("grain relative overflow-hidden", className)} style={{ background: gradientFor(seed) }} role="img" aria-label={label ? `Poster: ${label}` : "Poster placeholder"}>
      {children}
    </div>
  );
}

export function Count({ to, decimals = 0, suffix = "", prefix = "" }: { to: number; decimals?: number; suffix?: string; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const mv = useMotionValue(0);
  const txt = useTransform(mv, (v) => `${prefix}${v.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`);
  useEffect(() => {
    if (!inView) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { mv.set(to); return; }
    const c = animate(mv, to, { duration: 1.4, ease: [0.22, 1, 0.36, 1] });
    return () => c.stop();
  }, [inView, to, mv]);
  return <motion.span ref={ref}>{txt}</motion.span>;
}

export function Reveal({ children, delay = 0, className, y = 24, as: Tag = "div" }: { children: React.ReactNode; delay?: number; className?: string; y?: number; as?: "div" | "section" | "li" }) {
  const M = motion[Tag];
  return (
    <M className={className} initial={{ opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-8% 0px" }} transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </M>
  );
}

/** Line-by-line masked word reveal for display type. */
export function SplitReveal({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  return (
    <span className={className} aria-label={text}>
      {text.split(" ").map((w, i) => (
        <span key={i} aria-hidden="true" className="inline-block overflow-hidden align-bottom pb-[0.08em] -mb-[0.08em]">
          <motion.span className="inline-block" initial={{ y: "110%" }} animate={{ y: 0 }} transition={{ duration: 0.8, delay: delay + i * 0.045, ease: [0.22, 1, 0.36, 1] }}>
            {w}&nbsp;
          </motion.span>
        </span>
      ))}
    </span>
  );
}

export function SlidingNav<T extends string>({ items, value, onChange, id }: { items: { id: T; label: string }[]; value: T; onChange: (v: T) => void; id: string }) {
  return (
    <div role="tablist" className="no-scrollbar flex gap-1 overflow-x-auto rounded-pill border border-line bg-surface p-1">
      {items.map((it) => {
        const on = it.id === value;
        return (
          <button key={it.id} role="tab" aria-selected={on} onClick={() => onChange(it.id)}
            className={clsx("relative whitespace-nowrap rounded-pill px-4 py-2 text-sm font-medium transition-colors", on ? "text-white dark:text-brand-ink" : "text-muted hover:text-text")}>
            {on && <motion.span layoutId={`pill-${id}`} className="absolute inset-0 rounded-pill bg-brand" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
            <span className="relative">{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Ring({ value, size = 120, label }: { value: number; size?: number; label: string }) {
  const r = size / 2 - 8, c = 2 * Math.PI * r;
  const tone = value >= 80 ? "ok" : value >= 55 ? "warn" : "bad";
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }} role="img" aria-label={`${label}: ${value} out of 100`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--line))" strokeWidth="8" />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`rgb(var(--${tone}))`} strokeWidth="8" strokeLinecap="round" strokeDasharray={c}
          initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - value / 100) }} transition={{ duration: 1, ease: "easeOut" }} />
      </svg>
      <div className="absolute text-center"><div className="font-display text-3xl">{value}</div><div className="t-label text-muted">{label}</div></div>
    </div>
  );
}

export function Sparkline({ data, w = 120, h = 36 }: { data: number[]; w?: number; h?: number }) {
  const max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((d, i) => `${(i / (data.length - 1)) * w},${h - 4 - ((d - min) / (max - min || 1)) * (h - 8)}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <motion.polyline points={pts} fill="none" stroke="rgb(var(--accent))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1 }} />
    </svg>
  );
}

export function Badge({ tone, children }: { tone: "ok" | "warn" | "bad" | "brand" | "muted"; children: React.ReactNode }) {
  const map = { ok: "text-ok border-ok/40 bg-ok/10", warn: "text-warn border-warn/40 bg-warn/10", bad: "text-bad border-bad/40 bg-bad/10", brand: "text-brand border-brand/40 bg-brand/10", muted: "text-muted border-line" };
  return <span className={clsx("chip", map[tone])}>{children}</span>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("skeleton rounded-xl", className)} aria-hidden="true" />;
}

/** Minimum-delay loading so skeletons are visible in demo mode. */
export function useDemoDelay(ms = 500) {
  const [ready, setReady] = useState(false);
  useEffect(() => { const t = setTimeout(() => setReady(true), ms); return () => clearTimeout(t); }, [ms]);
  return ready;
}

export function Empty({ title, hint, action }: { title: string; hint: string; action?: React.ReactNode }) {
  return (
    <div className="card grid place-items-center gap-3 px-6 py-14 text-center">
      <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }} className="h-14 w-14 rounded-2xl bg-brand/15" aria-hidden="true" />
      <div className="font-display text-2xl">{title}</div>
      <p className="max-w-sm text-sm text-muted">{hint}</p>
      {action}
    </div>
  );
}
