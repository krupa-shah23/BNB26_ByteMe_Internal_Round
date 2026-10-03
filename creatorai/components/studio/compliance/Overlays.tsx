"use client";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import type { Box, Compliance } from "@/lib/compliance/types";

const pos = (b: Box) => ({ left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%` });
const within = (t: number, at: number, dur: number) => t >= at && t < at + dur;

/**
 * Everything drawn on top of the preview (percent coordinates, so it follows any aspect ratio).
 * Detected content is simulated here because the demo footage is a placeholder; blur layers use backdrop-filter
 * so they really do obscure whatever is underneath.
 */
export function PlayerOverlay({ c, now }: { c: Compliance; now: number }) {
  const cue = c.cues.find((q) => within(now, q.at, q.dur));
  const bleep = c.bleeps.find((b) => within(now, b.at, b.dur + 0.15));
  const pii = c.pii.filter((p) => within(now, p.at, p.dur));
  const people = c.people.flatMap((p) => p.appearances.filter((a) => within(now, a.at, a.dur)).map((a) => ({ p, a })));
  const blurs = c.blurs.filter((b) => within(now, b.start, b.end - b.start));
  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden="true">
      {/* simulated on-screen content */}
      {people.map(({ p, a }) => (
        <div key={p.id + a.at} className="absolute grid place-items-end justify-items-center" style={pos(a.box)}>
          <div className="h-[92%] w-[70%] rounded-t-full bg-text/20" />
          {blurs.every((b) => b.refId !== p.id) && (
            <span className={clsx("absolute -top-4 whitespace-nowrap rounded px-1 text-[9px] font-semibold", p.status === "consented" ? "bg-ok text-bg" : p.status === "unknown" ? "bg-warn text-bg" : "bg-muted text-bg")}>{p.name || p.label} · {p.status === "opted_out" ? "Opted out" : p.status === "unknown" ? "Unknown" : "Consented"}</span>
          )}
        </div>
      ))}
      {pii.map((p) => <div key={p.id + "t"} className="absolute grid place-items-center rounded bg-surface/90 px-1 text-center font-mono text-[10px] text-text" style={pos(p.box)}><span className="truncate">{p.text}</span></div>)}

      {/* blur / mask overlays */}
      <AnimatePresence>
        {blurs.map((b) => <motion.div key={b.id} className="absolute rounded-lg bg-text/10 backdrop-blur-xl" style={pos(b.box)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />)}
      </AnimatePresence>

      {/* detection: dotted box + label (only while still unresolved) */}
      {pii.filter((p) => p.status === "open").map((p) => (
        <motion.div key={p.id + "d"} className="absolute rounded border-2 border-dashed border-bad" style={pos(p.box)} initial={{ opacity: 0, scale: 1.08 }} animate={{ opacity: 1, scale: 1 }}>
          <span className="absolute left-1/2 top-full mt-0.5 -translate-x-1/2 whitespace-nowrap rounded bg-bad px-1.5 py-px text-[9px] font-semibold text-bg">{p.label}</span>
        </motion.div>
      ))}

      <AnimatePresence mode="wait">
        {cue && <motion.div key={cue.id + cue.text} className="absolute inset-x-3 bottom-2 text-center" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><span className="inline-block max-w-full rounded bg-text/80 px-2 py-0.5 text-[11px] leading-snug text-bg">{cue.text}</span></motion.div>}
      </AnimatePresence>
      {bleep && <motion.span className="absolute right-2 top-2 rounded-full bg-bad px-2 py-0.5 text-[10px] font-bold text-bg" animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 0.4 }}>BEEP</motion.span>}
    </div>
  );
}
