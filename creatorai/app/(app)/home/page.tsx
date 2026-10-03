"use client";
import { ArrowUpRight, Handshake, Library as LibraryIcon, LayoutGrid, TrendingUp, type LucideIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Poster, Skeleton, useDemoDelay } from "@/components/ui/bits";
import { motion } from "framer-motion";
import { Overlay } from "@/components/ui/Overlay";
import { Collabs } from "@/components/home/Collabs";
import { Library, Overview, Trends } from "@/components/home/HomeSections";

type CardId = "collabs" | "library" | "overview" | "trends";
const CARDS: { id: CardId; title: string; blurb: string; icon: LucideIcon; seed: number }[] = [
  { id: "collabs", title: "Collabs", blurb: "Swipe through creators who fit your audience.", icon: Handshake, seed: 2 },
  { id: "library", title: "Library", blurb: "Every clip, photo and track — and what's unused.", icon: LibraryIcon, seed: 5 },
  { id: "overview", title: "Overview", blurb: "Today's best idea, stats and what to post next.", icon: LayoutGrid, seed: 7 },
  { id: "trends", title: "Trends", blurb: "Songs, memes and topics that are moving now.", icon: TrendingUp, seed: 11 },
];

/** Accordion-gallery panel: the active panel grows wide, the rest collapse to strips with a vertical title. */
function Panel({ c, n, active, onActivate, onOpen }: { c: (typeof CARDS)[number]; n: number; active: boolean; onActivate: () => void; onOpen: () => void }) {
  const Icon = c.icon;
  return (
    <motion.button
      layout={false}
      initial={false}
      animate={{ flexGrow: active ? 5 : 1 }}
      transition={{ type: "spring", stiffness: 170, damping: 24 }}
      style={{ flexBasis: 0 }}
      onMouseEnter={onActivate} onFocus={onActivate}
      onClick={() => (active ? onOpen() : onActivate())}
      aria-expanded={active} aria-haspopup="dialog" aria-label={active ? `Open ${c.title}` : `Preview ${c.title}`}
      className="group relative min-h-0 min-w-0 overflow-hidden rounded-3xl border border-line text-left text-brand-ink"
    >
      <Poster seed={c.seed} className="h-full w-full">
        {/* collapsed strip: icon on top, title running vertically */}
        <motion.div className="absolute inset-0 z-10 flex flex-col items-center justify-between py-6" animate={{ opacity: active ? 0 : 1 }} transition={{ duration: 0.25 }} aria-hidden={active}>
          <span className="grid h-12 w-12 place-items-center rounded-full border border-brand-ink/40 bg-brand-ink/10"><Icon size={22} /></span>
          <span className="font-display text-3xl tracking-tight md:[writing-mode:vertical-rl] md:rotate-180">{c.title}</span>
          <span className="font-display text-xl opacity-70">0{n + 1}</span>
        </motion.div>

        {/* expanded content: fixed width so text never reflows while the panel animates */}
        <motion.div className="absolute inset-0 z-10 flex flex-col justify-between p-6 md:p-8" animate={{ opacity: active ? 1 : 0 }} transition={{ duration: 0.3, delay: active ? 0.2 : 0 }} aria-hidden={!active}>
          <div className="flex items-start justify-between">
            <span className="grid h-14 w-14 place-items-center rounded-full border border-brand-ink/40 bg-brand-ink/10 backdrop-blur-sm"><Icon size={26} /></span>
            <span className="font-display text-5xl opacity-70">0{n + 1}</span>
          </div>
          <div className="w-[min(30rem,60vw)]">
            <h2 className="t-h1 !text-[clamp(2.4rem,5vw,5rem)]">{c.title}</h2>
            <p className="mt-3 max-w-sm text-sm opacity-90 md:text-base">{c.blurb}</p>
            <span className="mt-6 inline-flex items-center gap-2 rounded-pill border border-brand-ink/50 px-4 py-2 text-sm font-medium transition-colors group-hover:bg-brand-ink group-hover:text-brand">
              Open <ArrowUpRight size={16} />
            </span>
          </div>
        </motion.div>
      </Poster>
    </motion.button>
  );
}

export default function Home() {
  const router = useRouter();
  const ready = useDemoDelay(350);
  const [open, setOpen] = useState<CardId | null>(null);
  const [active, setActive] = useState<CardId>("collabs");
  const close = useCallback(() => setOpen(null), []);
  const card = CARDS.find((c) => c.id === open);

  // Overview's shortcuts jump to another card (or to the calendar page)
  const go = (id: CardId | "calendar") => (id === "calendar" ? router.push("/calendar") : setOpen(id));

  if (!ready) return <Skeleton className="h-full w-full rounded-3xl" />;
  return (
    <>
      <h1 className="sr-only">Home</h1>
      <div className="flex h-full flex-col gap-3 md:flex-row md:gap-4" role="group" aria-label="Home sections">
        {CARDS.map((c, i) => <Panel key={c.id} c={c} n={i} active={active === c.id} onActivate={() => setActive(c.id)} onOpen={() => setOpen(c.id)} />)}
      </div>

      <Overlay open={open !== null} onClose={close} side="center" width="max-w-6xl" labelledBy={open === "collabs" ? "cd-title" : "home-card-h"}>
        {card && (
          <div className="p-5 pt-5 md:p-8 md:pt-5">
            {open !== "collabs" && (
              <div className="mb-6 flex items-center gap-4 pr-14">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-brand text-brand-ink"><card.icon size={22} /></span>
                <h2 id="home-card-h" className="t-h1">{card.title}</h2>
              </div>
            )}
            {open === "overview" && <Overview go={go} />}
            {open === "trends" && <Trends />}
            {open === "library" && <Library />}
            {open === "collabs" && <div className="pr-14 md:pr-0"><Collabs /></div>}
          </div>
        )}
      </Overlay>
    </>
  );
}
