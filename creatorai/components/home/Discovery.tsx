"use client";
import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { rank } from "./Collabs";
import { Overlay } from "@/components/ui/Overlay";
import { useStore } from "@/lib/store";

type Item = ReturnType<typeof rank>[number];
// every tone is a solid, opaque palette colour (no translucent beige)
const TONES = ["bg-accent text-black", "bg-brand-2 text-black", "bg-sage text-text", "bg-brand text-brand-ink"];
const toneOf = (id: string) => TONES[(+id.replace(/\D/g, "") || 0) % TONES.length];
const bio = (c: Item["c"]) => `${c.niche} creator · ${(c.followers / 1000).toFixed(0)}K followers`;
const POS = [{ x: 0, scale: 1, rotateY: 0, opacity: 1 }, { x: 150, scale: 0.88, rotateY: -12, opacity: 1 }, { x: -150, scale: 0.88, rotateY: 12, opacity: 1 }];
const NET: Record<string, string> = { instagram: "Instagram", youtube: "YouTube", x: "X", linkedin: "LinkedIn", facebook: "Facebook" };

const shuffle = <T,>(a: T[]) => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };

function CreatorCard({ item, depth, onDecide, onOpen }: { item: Item; depth: number; onDecide: (d: "right" | "left") => void; onOpen: () => void }) {
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
      onTap={top ? onOpen : undefined}
      style={top ? { x, rotate: rot, zIndex: 10 } : { zIndex: 10 - depth }}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={top ? { scale: 1, opacity: 1, rotateY: 0 } : { x: p.x, scale: p.scale, rotateY: p.rotateY, opacity: p.opacity }}
      exit={{ opacity: 0, transition: { duration: 0.25 } }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      className={clsx("absolute inset-y-0 left-1/2 -ml-[180px] w-[360px] touch-pan-y select-none overflow-hidden rounded-[28px] border border-text/10 p-6", toneOf(c.id), top && "cursor-grab active:cursor-grabbing")}
      aria-hidden={!top} role={top ? "button" : undefined} aria-label={top ? `View ${c.name}'s profile` : undefined}>
      <div className="flex h-full flex-col">
        <div className="grid h-16 w-16 place-items-center rounded-full border-2 border-current font-display text-3xl">{c.name[0]}</div>
        <h3 className="mt-4 font-display text-3xl leading-none tracking-tight">{c.name}</h3>
        <p className="mt-1 text-sm opacity-70">{c.handle}</p>
        <p className="mt-4 text-sm">{bio(c)}</p>
        <div className="mt-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] opacity-60">Interests</p>
          <div className="mt-2 flex flex-wrap gap-1.5">{c.topics.map((t) => <span key={t} className="rounded-pill border border-current/30 px-2.5 py-1 text-xs">{t}</span>)}</div>
          <p className="mt-4 text-[10px] opacity-60">Tap for profile · {item.overlap}% audience overlap (est.)</p>
        </div>
      </div>
      {top && <>
        <motion.div style={{ opacity: yes }} className="pointer-events-none absolute left-5 top-5 -rotate-12 rounded-xl border-4 border-current px-3 py-1 font-display text-xl">COLLAB</motion.div>
        <motion.div style={{ opacity: no }} className="pointer-events-none absolute right-5 top-5 rotate-12 rounded-xl border-4 border-current px-3 py-1 font-display text-xl">PASS</motion.div>
      </>}
    </motion.div>
  );
}

function ProfileSheet({ item, onClose, onDecide }: { item: Item | null; onClose: () => void; onDecide: (d: "right" | "left") => void }) {
  const c = item?.c;
  return (
    <Overlay open={!!item} onClose={onClose} side="center" width="max-w-lg" labelledBy="creator-h">
      {c && item && (
        <div className="p-6 pt-14 md:p-8 md:pt-14">
          <div className="flex items-center gap-4 pr-10">
            <span className={clsx("grid h-16 w-16 shrink-0 place-items-center rounded-full font-display text-3xl", toneOf(c.id))}>{c.name[0]}</span>
            <div className="min-w-0"><h2 id="creator-h" className="truncate font-display text-3xl leading-none tracking-tight">{c.name}</h2><p className="mt-1 text-sm text-muted">{c.handle} · {c.niche}</p></div>
          </div>
          <p className="mt-4 text-sm">{c.bio ?? bio(c)}</p>
          <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
            <div><dt className="t-label text-muted">Followers</dt><dd className="mt-1 font-medium">{(c.followers / 1000).toFixed(0)}K</dd></div>
            <div><dt className="t-label text-muted">Based in</dt><dd className="mt-1 font-medium">{c.city ?? "India"}</dd></div>
            <div><dt className="t-label text-muted">Languages</dt><dd className="mt-1 font-medium">{(c.languages ?? ["English"]).join(", ")}</dd></div>
          </dl>
          <h3 className="t-label mt-6 text-muted">Find them on</h3>
          <ul className="mt-2 grid gap-1.5 text-sm">
            {Object.entries(c.platforms ?? { instagram: c.handle }).map(([k, v]) => (
              <li key={k} className="flex items-center justify-between rounded-xl border border-line px-3 py-2"><span className="text-muted">{NET[k] ?? k}</span><span className="font-medium">{v}</span></li>
            ))}
          </ul>
          <h3 className="t-label mt-6 text-muted">Content they create</h3>
          <div className="mt-2 flex flex-wrap gap-1.5">{(c.content ?? [c.niche]).map((t) => <span key={t} className="chip">{t}</span>)}</div>
          <h3 className="t-label mt-6 text-muted">Interests <span className="normal-case">· {item.overlap}% audience overlap (est.)</span></h3>
          <div className="mt-2 flex flex-wrap gap-1.5">{c.topics.map((t) => <span key={t} className={clsx("chip", item.shared.includes(t) && "border-brand text-brand")}>{t}</span>)}</div>
          <p className="mt-4 text-[11px] text-muted">Fictional demo creator.</p>
          <div className="mt-6 flex gap-3">
            <button onClick={() => { onClose(); onDecide("left"); }} className="btn-ghost flex-1"><ArrowLeft size={16} />Pass</button>
            <button onClick={() => { onClose(); onDecide("right"); }} className="btn-brand flex-1">Collaborate<ArrowRight size={16} /></button>
          </div>
        </div>
      )}
    </Overlay>
  );
}

function Discover() {
  const { pref, swiped, requested, swipe, request, toast } = useStore();
  const [order, setOrder] = useState<string[]>(() => shuffle(rank(pref, {}).map((i) => i.c.id)));
  const [open, setOpen] = useState<Item | null>(null);
  // every visit starts with all 40 profiles again, in a fresh random order; within a visit nobody comes back after a decision
  useEffect(() => { useStore.setState({ swiped: {} }); }, []);
  const queue = useMemo(() => rank(pref, swiped).sort((a, b) => order.indexOf(a.c.id) - order.indexOf(b.c.id)), [pref, swiped, order]);
  const stack = queue.slice(0, 3);

  const decide = (d: "right" | "left") => {
    const t = queue[0]; if (!t) return;
    swipe(t.c.id, d, t.c.vec);
    if (d === "right") {
      if (requested.includes(t.c.id)) toast(`Already requested ${t.c.handle}`, "Check Messages for replies");
      else { request(t.c.id); toast(`Collaboration message sent to ${t.c.handle}`, "Track it in Messages"); }
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
        <div><p className="font-display text-3xl tracking-tight">You’ve seen everyone</p><p className="mt-2 text-sm text-muted">Refresh the page, or shuffle all {order.length} creators again.</p>
          <button className="btn-primary mt-5" onClick={() => { useStore.setState({ swiped: {} }); setOrder(shuffle(order)); }}><RotateCcw size={16} />Shuffle again</button></div>
      </div>
    );
  }
  return (
    <div className="flex h-full items-center justify-center gap-4 md:gap-8">
      <button onClick={() => decide("left")} className="hidden shrink-0 items-center gap-2 rounded-pill border border-line bg-surface px-5 py-3 text-sm font-medium transition-transform hover:-translate-x-1 hover:bg-sunken md:inline-flex" aria-label="Pass"><ArrowLeft size={16} />Pass</button>
      <div className="relative h-full min-h-[320px] max-h-[440px] w-full max-w-[720px] [perspective:1200px]" aria-live="polite">
        <AnimatePresence initial={false}>{[...stack].reverse().map((it) => <CreatorCard key={it.c.id} item={it} depth={stack.indexOf(it)} onDecide={decide} onOpen={() => setOpen(it)} />)}</AnimatePresence>
      </div>
      <button onClick={() => decide("right")} className="hidden shrink-0 items-center gap-2 rounded-pill bg-brand px-5 py-3 text-sm font-medium text-brand-ink transition-transform hover:translate-x-1 md:inline-flex" aria-label="Collaborate">Collaborate<ArrowRight size={16} /></button>
      <ProfileSheet item={open} onClose={() => setOpen(null)} onDecide={decide} />
    </div>
  );
}

export function Discovery() {
  return (
    <section className="flex min-h-0 flex-1 flex-col" aria-labelledby="disc-h">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h1 id="disc-h" className="font-display text-3xl tracking-tight md:text-4xl">Creator Discovery</h1>
      </div>
      <div className="min-h-0 flex-1"><Discover /></div>
    </section>
  );
}
