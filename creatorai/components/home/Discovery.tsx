"use client";
import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import creatorsFx from "@/fixtures/creators.json";
import { RubberSegment } from "@/components/ui/RubberSegment";
import { rank } from "./Collabs";
import { useStore } from "@/lib/store";

type Item = ReturnType<typeof rank>[number];
const TONES = ["bg-accent text-black", "bg-brand-2 text-black", "bg-tan/40 text-text", "bg-brand text-brand-ink"];
const toneOf = (id: string) => TONES[(+id.replace(/\D/g, "") || 0) % TONES.length];
const bio = (c: Item["c"]) => `${c.niche} creator · ${(c.followers / 1000).toFixed(0)}K followers`;
const POS = [{ x: 0, scale: 1, rotateY: 0, opacity: 1 }, { x: 150, scale: 0.88, rotateY: -12, opacity: 0.95 }, { x: -150, scale: 0.88, rotateY: 12, opacity: 0.95 }];

function CreatorCard({ item, depth, onDecide }: { item: Item; depth: number; onDecide: (d: "right" | "left") => void }) {
  const x = useMotionValue(0);
  const rot = useTransform(x, [-200, 200], [-12, 12]);
  const yes = useTransform(x, [20, 130], [0, 1]), no = useTransform(x, [-130, -20], [1, 0]);
  const { c } = item;
  const top = depth === 0;
  const p = POS[depth] ?? POS[2];
  return (
    <motion.div
      drag={top ? "x" : false} dragConstraints={{ left: 0, right: 0 }} dragElastic={0.8}
      onDragEnd={(_, i) => { if (i.offset.x > 110) onDecide("right"); else if (i.offset.x < -110) onDecide("left"); }}
      style={top ? { x, rotate: rot, zIndex: 10 } : { zIndex: 10 - depth }}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={top ? { scale: 1, opacity: 1, rotateY: 0 } : { x: p.x, scale: p.scale, rotateY: p.rotateY, opacity: p.opacity }}
      exit={{ opacity: 0, transition: { duration: 0.25 } }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      className={clsx("absolute inset-y-0 left-1/2 -ml-[180px] w-[360px] touch-pan-y select-none overflow-hidden rounded-[28px] border border-text/10 p-6", toneOf(c.id), top && "cursor-grab active:cursor-grabbing")}
      aria-hidden={!top}>
      <div className="flex h-full flex-col">
        <div className="grid h-16 w-16 place-items-center rounded-full border-2 border-current font-display text-3xl">{c.name[0]}</div>
        <h3 className="mt-4 font-display text-3xl leading-none tracking-tight">{c.name}</h3>
        <p className="mt-1 text-sm opacity-70">{c.handle}</p>
        <p className="mt-4 text-sm">{bio(c)}</p>
        <div className="mt-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] opacity-60">Interests</p>
          <div className="mt-2 flex flex-wrap gap-1.5">{c.topics.map((t) => <span key={t} className="rounded-pill border border-current/30 px-2.5 py-1 text-xs">{t}</span>)}</div>
          <p className="mt-4 text-[10px] opacity-60">Fictional demo creator · {item.overlap}% audience overlap (est.)</p>
        </div>
      </div>
      {top && <>
        <motion.div style={{ opacity: yes }} className="pointer-events-none absolute left-5 top-5 -rotate-12 rounded-xl border-4 border-current px-3 py-1 font-display text-xl">COLLAB</motion.div>
        <motion.div style={{ opacity: no }} className="pointer-events-none absolute right-5 top-5 rotate-12 rounded-xl border-4 border-current px-3 py-1 font-display text-xl">PASS</motion.div>
      </>}
    </motion.div>
  );
}

function Discover() {
  const { pref, swiped, requested, swipe, request, toast } = useStore();
  const queue = useMemo(() => rank(pref, swiped), [pref, swiped]);
  const stack = queue.slice(0, 3);
  // the deck never runs dry: when few creators remain, everyone comes back (ranked by what you have learned)
  useEffect(() => { if (queue.length < 3) useStore.setState({ swiped: {} }); }, [queue.length]);

  const decide = (d: "right" | "left") => {
    const t = queue[0]; if (!t) return;
    swipe(t.c.id, d, t.c.vec);
    if (d === "right") {
      request(t.c.id);
      toast(`✓ Collaboration message sent to ${t.c.handle}`, undefined, 20_000);
    }
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName; if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (document.querySelector("[role=dialog]")) return;
      if (e.key === "ArrowRight") decide("right"); if (e.key === "ArrowLeft") decide("left");
    };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  });

  if (queue.length === 0) {
    return (
      <div className="grid h-full min-h-[300px] place-items-center text-center">
        <div><p className="font-display text-3xl tracking-tight">You’ve seen everyone</p><p className="mt-2 text-sm text-muted">Your choices already shaped who comes next.</p>
          <button className="btn-primary mt-5" onClick={() => useStore.setState((s) => ({ swiped: Object.fromEntries(Object.entries(s.swiped).filter(([id]) => s.requested.includes(id))) as typeof s.swiped }))}><RotateCcw size={16} />Show passed creators again</button></div>
      </div>
    );
  }
  void requested;
  return (
    <div className="flex h-full items-center justify-center gap-4 md:gap-8">
      <button onClick={() => decide("left")} className="hidden shrink-0 items-center gap-2 rounded-pill border border-line bg-surface px-5 py-3 text-sm font-medium transition-transform hover:-translate-x-1 hover:bg-sunken md:inline-flex" aria-label="Pass"><ArrowLeft size={16} />Pass</button>
      <div className="relative h-full min-h-[320px] max-h-[440px] w-full max-w-[720px] [perspective:1200px]" aria-live="polite">
        <AnimatePresence initial={false}>{[...stack].reverse().map((it) => <CreatorCard key={it.c.id} item={it} depth={stack.indexOf(it)} onDecide={decide} />)}</AnimatePresence>
      </div>
      <button onClick={() => decide("right")} className="hidden shrink-0 items-center gap-2 rounded-pill bg-brand px-5 py-3 text-sm font-medium text-brand-ink transition-transform hover:translate-x-1 md:inline-flex" aria-label="Collaborate">Collaborate<ArrowRight size={16} /></button>
    </div>
  );
}

function Tracker() {
  const requested = useStore((s) => s.requested);
  const list = requested.map((id) => creatorsFx.creators.find((c) => c.id === id)).filter(Boolean) as typeof creatorsFx.creators;
  return (
    <div className="no-scrollbar mx-auto h-full max-w-xl overflow-y-auto">
      <h3 className="mb-3 font-display text-xl tracking-tight">Tracker</h3>
      {list.length === 0 ? (
        <p className="rounded-[24px] border border-dashed border-line p-8 text-center text-sm text-muted">No requests yet. Swipe right on a creator (or press Collaborate) and they’ll show up here.</p>
      ) : (
        <ul className="grid gap-3">
          <AnimatePresence initial>
            {list.map((c, i) => (
              <motion.li key={c.id} layout initial={{ opacity: 0, y: 24, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: -30 }} transition={{ type: "spring", stiffness: 300, damping: 24, delay: i * 0.06 }}
                className="flex items-center gap-4 rounded-[24px] border border-text/10 bg-surface p-4">
                <span className={clsx("grid h-12 w-12 shrink-0 place-items-center rounded-full font-display text-xl", toneOf(c.id))}>{c.name[0]}</span>
                <div className="min-w-0"><div className="truncate font-display text-xl tracking-tight">{c.handle}</div><div className="text-sm text-muted">Collaboration Requested</div></div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}

export function Discovery({ sub, onSub: setSub }: { sub: "discover" | "tracker"; onSub: (s: "discover" | "tracker") => void }) {
  return (
    <section className="flex min-h-0 flex-1 flex-col" aria-labelledby="disc-h">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h1 id="disc-h" className="font-display text-3xl tracking-tight md:text-4xl">Creator Discovery</h1>
        <RubberSegment label="Creator discovery view" items={[{ id: "discover", label: "Discover" }, { id: "tracker", label: "Tracker" }]} value={sub} onChange={setSub} />
      </div>
      <div className="min-h-0 flex-1">
        {sub === "discover" ? <Discover /> : <Tracker />}
      </div>
    </section>
  );
}
