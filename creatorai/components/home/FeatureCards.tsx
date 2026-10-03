"use client";
import { ArrowUpRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import home from "@/fixtures/home.json";
import analytics from "@/fixtures/analytics.json";
import { Glyph, type GlyphName } from "@/components/short/Glyphs";
import { SongSearch } from "@/components/audio/SongSearch";
import { Overlay } from "@/components/ui/Overlay";
import { useStore } from "@/lib/store";
import { DemandCompact } from "@/components/audience/DemandEngine";

type Id = "collabs" | "library" | "overview" | "trends";
const CARDS: { id: Id; title: string; blurb: string; glyph: GlyphName; tone: string }[] = [
  { id: "overview", title: "Overview", blurb: "Your channel at a glance", glyph: "orb", tone: "bg-sage text-text" },
  { id: "library", title: "Library", blurb: "Your files and unused clips", glyph: "shorts", tone: "bg-brand-2 text-black" },
  { id: "collabs", title: "Collabs", blurb: "Who you’ve reached out to", glyph: "stories", tone: "bg-accent text-black" },
  { id: "trends", title: "Trends", blurb: "What’s rising right now", glyph: "diamond", tone: "bg-brand text-brand-ink" },
];

const Stat = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="rounded-2xl border border-line bg-surface p-4"><div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</div><div className="mt-2 font-display text-3xl tracking-tight">{value}</div></div>
);

function Panel({ id, close }: { id: Id; close: () => void }) {
  const router = useRouter();
  const { swiped, requested } = useStore();
  if (id === "collabs") {
    const passed = Object.values(swiped).filter((d) => d === "left").length;
    return (
      <>
        <div className="grid grid-cols-3 gap-3"><Stat label="Requests sent" value={requested.length} /><Stat label="Passed" value={passed} /><Stat label="Creators seen" value={Object.keys(swiped).length} /></div>
        <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Past collabs</p>
        <ul className="grid gap-2">{analytics.collabLog.slice(0, 3).map((c) => <li key={c.id} className="flex items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3 text-sm"><span className="truncate font-medium">{c.what}</span><span className="shrink-0 text-muted">{c.withWhom} · <span className="text-ok">+{c.gained}</span> followers</span></li>)}</ul>
      </>
    );
  }
  if (id === "library") {
    const unused = home.library.filter((a) => !a.used);
    return (
      <>
        <div className="grid grid-cols-3 gap-3"><Stat label="Files" value={home.library.length} /><Stat label="Not used yet" value={unused.length} /><Stat label="Unused clips" value={home.unusedClips.length} /></div>
        <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Worth reusing</p>
        <ul className="grid gap-2">{home.unusedClips.slice(0, 3).map((c) => <li key={c.id} className="flex items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3 text-sm"><span className="truncate font-medium">{c.title}</span><span className="shrink-0 font-mono text-xs text-muted">{c.range}</span></li>)}</ul>
      </>
    );
  }
  if (id === "overview") {
    const u = home.user; const best = home.ideas[0];
    return (
      <>
        <div className="grid grid-cols-3 gap-3"><Stat label="Followers" value={u.followers.toLocaleString("en-IN")} /><Stat label="7-day views" value={u.views7d.toLocaleString("en-IN")} /><Stat label="Engagement" value={`${u.engagement}%`} /></div>
        <div className="mt-4 rounded-2xl bg-accent p-4 text-black">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] opacity-60">Today’s best idea</p>
          <p className="mt-2 font-display text-2xl leading-tight tracking-tight">“{best.title}”</p>
          <p className="mt-1 text-sm opacity-70">{best.why}</p>
          <button className="btn-primary mt-4" onClick={() => { close(); router.push(best.format === "Short" ? "/short-videos" : "/videos"); }}>Start now <ArrowUpRight size={16} /></button>
        </div>
        <DemandCompact onNavigate={close} />
      </>
    );
  }
  const t = home.trending;
  const rows = [
    ...t.songs.slice(0, 2).map((s) => ({ k: "Song", n: s.title, g: s.growth })),
    ...t.memes.slice(0, 2).map((m) => ({ k: "Meme", n: m.template, g: m.growth })),
    ...t.topics.slice(0, 2).map((x) => ({ k: "Topic", n: x.name, g: `+${Math.round((x.series[x.series.length - 1] / x.series[0] - 1) * 100)}%` })),
  ];
  return (
    <>
    <ul className="grid gap-2">{rows.map((r) => <li key={r.k + r.n} className="flex items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3 text-sm"><span className="flex items-center gap-3"><span className="chip py-0.5 text-[11px]">{r.k}</span><span className="font-medium">{r.n}</span></span><span className="font-display text-lg text-ok">{r.g}</span></li>)}</ul>
    <div className="mt-6"><h3 className="t-label mb-3 text-muted">Search songs</h3><SongSearch /></div>
    </>
  );
}

export function FeatureCards() {
  const [open, setOpen] = useState<Id | null>(null);
  const card = CARDS.find((c) => c.id === open);
  const [hover, setHover] = useState<Id | null>(null);
  return (
    <>
      <section aria-label="Quick looks" className="flex h-full gap-3 md:gap-4" onMouseLeave={() => setHover(null)}>
        {CARDS.map((c) => {
          const grown = hover === c.id;
          return (
            <button key={c.id} onClick={() => setOpen(c.id)} onMouseEnter={() => setHover(c.id)} onFocus={() => setHover(c.id)} onBlur={() => setHover(null)}
              style={{ flexGrow: grown ? 2.2 : 1 }}
              className={clsx("group flex min-w-0 flex-1 basis-0 flex-col justify-between overflow-hidden rounded-[28px] border border-text/10 p-5 text-left transition-[flex-grow,transform] duration-500 ease-out hover:-translate-y-1", c.tone)}>
              <div className="flex items-start justify-between"><Glyph name={c.glyph} size={52} /><ArrowUpRight size={20} className="opacity-60 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></div>
              <div><div className="font-display text-2xl tracking-tight">{c.title}</div><div className={clsx("overflow-hidden text-sm transition-all duration-500", grown ? "mt-1 max-h-12 opacity-70" : "max-h-0 opacity-0")}>{c.blurb}</div></div>
            </button>
          );
        })}
      </section>
      <Overlay open={!!open} onClose={() => setOpen(null)} side="center" width="max-w-2xl" labelledBy="fc-h">
        {card && (
          <div className="p-6">
            <div className="mb-4 flex items-center gap-3 pr-12"><Glyph name={card.glyph} size={40} /><h2 id="fc-h" className="font-display text-3xl tracking-tight">{card.title}</h2></div>
            <Panel id={card.id} close={() => setOpen(null)} />
          </div>
        )}
      </Overlay>
    </>
  );
}
