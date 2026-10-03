"use client";
import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import { Heart, RotateCcw, Star, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import creatorsFx from "@/fixtures/creators.json";
import analytics from "@/fixtures/analytics.json";
import { Badge, Poster } from "@/components/ui/bits";
import { fireHearts } from "@/lib/hearts";
import { useStore } from "@/lib/store";

interface Creator { id: string; name: string; handle: string; niche: string; followers: number; topics: string[]; vec: number[]; bio?: string; city?: string; languages?: string[]; content?: string[]; platforms?: Record<string, string> }
const creators = creatorsFx.creators as unknown as Creator[];
const USER = { vec: [0.8, 0.3, 0.2, 0.8, 0.4, 0.7, 0.3, 0.4], topics: ["startup-india", "education", "comedy", "career"], followers: 48200 };

const cosine = (a: number[], b: number[]) => {
  const d = a.reduce((s, x, i) => s + x * b[i], 0), na = Math.hypot(...a), nb = Math.hypot(...b);
  return na && nb ? d / (na * nb) : 0;
};
const band = (f: number) => (f < 25_000 ? 0 : f < 60_000 ? 1 : f < 120_000 ? 2 : 3);

/** score = 0.5·cosine(audience) + 0.3·topicJaccard + 0.2·followerBandCloseness, against the creator's *learned* preference vector. */
export function rank(pref: number[], swiped: Record<string, string>) {
  const target = USER.vec.map((v, i) => v + (pref[i] ?? 0));
  return creators.filter((c) => !swiped[c.id]).map((c) => {
    const inter = c.topics.filter((t) => USER.topics.includes(t)).length;
    const jac = inter / (new Set([...c.topics, ...USER.topics]).size);
    const closeness = 1 - Math.abs(band(c.followers) - band(USER.followers)) / 3;
    const score = 0.5 * cosine(c.vec, target) + 0.3 * jac + 0.2 * closeness;
    return { c, score, overlap: Math.round(Math.max(0.08, Math.min(0.97, score)) * 100), shared: c.topics.filter((t) => USER.topics.includes(t)), why: [inter ? `${inter} shared topic${inter > 1 ? "s" : ""}` : "Fresh audience", band(c.followers) === band(USER.followers) ? "Similar size" : "Bigger reach", cosine(c.vec, target) > 0.9 ? "High audience overlap" : "Complementary audience"] };
  }).sort((a, b) => b.score - a.score);
}

function Card({ item, top, onSwipe }: { item: ReturnType<typeof rank>[number]; top: boolean; onSwipe: (d: "right" | "left" | "up") => void }) {
  const x = useMotionValue(0), y = useMotionValue(0);
  const rot = useTransform(x, [-220, 220], [-14, 14]);
  const yes = useTransform(x, [20, 140], [0, 1]), no = useTransform(x, [-140, -20], [1, 0]), up = useTransform(y, [-140, -20], [1, 0]);
  const { c } = item;
  return (
    <motion.div drag={top} dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }} dragElastic={0.9} style={{ x, y, rotate: rot, zIndex: top ? 2 : 1 }}
      onDragEnd={(_, i) => { if (i.offset.x > 120) onSwipe("right"); else if (i.offset.x < -120) onSwipe("left"); else if (i.offset.y < -120) onSwipe("up"); }}
      initial={{ scale: top ? 1 : 0.94, y: top ? 0 : 16, opacity: 0 }} animate={{ scale: top ? 1 : 0.94, opacity: 1, y: top ? 0 : 16 }}
      variants={{ out: (d: string) => ({ x: d === "right" ? 600 : d === "left" ? -600 : 0, y: d === "up" ? -600 : 0, opacity: 0, rotate: d === "right" ? 20 : d === "left" ? -20 : 0, transition: { duration: 0.35 } }) }} exit="out"
      className="absolute inset-0 cursor-grab touch-none overflow-hidden rounded-3xl border border-line bg-surface shadow-soft active:cursor-grabbing">
      <Poster seed={+c.id.slice(1) * 7} className="h-[42%]"><div className="absolute -bottom-10 left-6 grid h-20 w-20 place-items-center rounded-full border-4 border-surface bg-brand font-display text-3xl text-brand-ink">{c.name[0]}</div></Poster>
      <div className="p-6 pt-12">
        <div className="flex items-center justify-between"><div><h3 className="font-display text-2xl">{c.name}</h3><p className="text-sm text-muted">{c.handle} · {c.niche}</p></div><Badge tone="brand">{item.overlap}% overlap <span className="opacity-60">Est.</span></Badge></div>
        <p className="mt-3 text-sm">{(c.followers / 1000).toFixed(0)}K followers · topics: {c.topics.join(", ")}</p>
        <div className="mt-4 flex flex-wrap gap-1.5">{item.why.map((w) => <span key={w} className="chip">{w}</span>)}</div>
        <p className="mt-4 text-[11px] text-muted">Fictional demo creator. Overlap is estimated from public signals.</p>
      </div>
      <motion.div style={{ opacity: yes }} className="pointer-events-none absolute left-6 top-6 -rotate-12 rounded-xl border-4 border-ok px-3 py-1 font-display text-2xl text-ok">COLLAB 💚</motion.div>
      <motion.div style={{ opacity: no }} className="pointer-events-none absolute right-6 top-6 rotate-12 rounded-xl border-4 border-bad px-3 py-1 font-display text-2xl text-bad">PASS</motion.div>
      <motion.div style={{ opacity: up }} className="pointer-events-none absolute left-1/2 top-24 -translate-x-1/2 rounded-xl border-4 border-brand px-3 py-1 font-display text-2xl text-brand">SUPER ★</motion.div>
    </motion.div>
  );
}

export function Collabs({ compact = false }: { compact?: boolean }) {
  const { pref, swiped, swipe, calendar, addCal, toast } = useStore();
  const [sub, setSub] = useState<"discover" | "tracker">("discover");
  const [last, setLast] = useState<"right" | "left" | "up">("right");
  const queue = useMemo(() => rank(pref, swiped), [pref, swiped]);
  const stack = queue.slice(0, 3);
  const act = (d: "right" | "left" | "up") => {
    const t = queue[0]; if (!t) return;
    setLast(d); swipe(t.c.id, d, t.c.vec);
    if (d !== "left") { fireHearts({ count: 22, origin: { x: innerWidth / 2, y: innerHeight * 0.55 } }); }
    if (d === "up" || (d === "right" && t.overlap > 70)) toast(`It's a match with ${t.c.handle}!`, "Added to your Collab tracker");
    if (d !== "left") addCal({ type: "collab", title: `Collab idea with ${t.c.handle}`, startsAt: new Date(Date.now() + 7 * 86_400_000).toISOString(), withHandle: t.c.handle, stage: "Idea" });
  };
  useEffect(() => {
    if (sub !== "discover" || compact) return;
    const k = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName; if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowRight") act("right"); if (e.key === "ArrowLeft") act("left"); if (e.key === "ArrowUp") act("up");
    };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  });

  const rows = [...analytics.collabLog.map((c) => ({ id: c.id, what: c.what, when: c.when, who: c.withWhom, platform: c.platform, views: c.views, reach: c.reach, gained: c.gained, lost: c.lost })),
    ...calendar.filter((c) => c.type === "collab").map((c) => ({ id: c.id, what: c.title, when: c.startsAt, who: c.withHandle ?? "—", platform: c.platform ?? "—", views: null, reach: null, gained: null, lost: null }))];

  return (
    <div>
      {!compact && <div className="mb-6 flex gap-2" role="tablist">{(["discover", "tracker"] as const).map((s) => <button key={s} role="tab" aria-selected={sub === s} onClick={() => setSub(s)} className={clsx("chip px-5 py-2 text-sm capitalize", sub === s && "border-brand bg-brand text-brand-ink")}>{s}</button>)}</div>}
      {sub === "discover" ? (
        <div className="mx-auto max-w-sm">
          <div className="relative h-[480px]" aria-live="polite">
            {queue.length === 0 ? (
              <div className="card grid h-full place-items-center p-8 text-center"><div><p className="font-display text-3xl">You've seen everyone</p><p className="mt-2 text-sm text-muted">Your swipes already re-ranked the deck.</p>
                <button className="btn-primary mt-5" onClick={() => useStore.setState({ swiped: {} })}><RotateCcw size={16} />Reshuffle</button></div></div>
            ) : (
              <AnimatePresence custom={last}>{[...stack].reverse().map((it, i, arr) => <Card key={it.c.id} item={it} top={i === arr.length - 1} onSwipe={act} />)}</AnimatePresence>
            )}
          </div>
          <div className="mt-5 flex items-center justify-center gap-4">
            <button onClick={() => act("left")} aria-label="Pass" className="grid h-14 w-14 place-items-center rounded-full border border-line bg-surface text-bad hover:bg-sunken"><X /></button>
            <button onClick={() => act("up")} aria-label="Super interest" className="grid h-12 w-12 place-items-center rounded-full border border-line bg-surface text-brand hover:bg-sunken"><Star size={20} /></button>
            <button onClick={() => act("right")} aria-label="Collab" className="grid h-14 w-14 place-items-center rounded-full bg-ok text-bg hover:opacity-90"><Heart fill="currentColor" /></button>
          </div>
          <p className="mt-3 text-center text-xs text-muted">Drag or use ← → ↑. Each swipe updates a preference vector and re-ranks the rest, in your browser, for real.</p>
        </div>
      ) : (
        <div className="card overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="t-label text-muted"><tr className="border-b border-line">{["What", "When", "With whom", "Platform", "Views / Reach", "Followers +/−"].map((h) => <th scope="col" key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
          <tbody>{rows.map((r) => (<tr key={r.id} className="border-b border-line last:border-0"><td className="px-4 py-4 font-medium">{r.what}</td><td className="px-4">{new Date(r.when).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</td><td className="px-4">{r.who}</td><td className="px-4">{r.platform}</td>
            <td className="px-4">{r.views ? `${r.views.toLocaleString("en-IN")} / ${r.reach ? r.reach.toLocaleString("en-IN") : "n/a"}` : <span className="text-muted">Upcoming</span>}</td>
            <td className="px-4">{r.gained != null ? <><span className="text-ok">+{r.gained}</span> / <span className="text-bad">−{r.lost}</span></> : "—"}</td></tr>))}</tbody></table></div>
      )}
    </div>
  );
}
