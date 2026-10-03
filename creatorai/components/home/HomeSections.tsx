"use client";
import { motion } from "framer-motion";
import { ArrowUpRight, Grid2x2, List, Pause, Play, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import clsx from "clsx";
import home from "@/fixtures/home.json";
import { Badge, Count, Reveal, Sparkline } from "@/components/ui/bits";
import { Collabs } from "./Collabs";
import { useStore } from "@/lib/store";

const riskTone = { low: "ok", medium: "warn", high: "bad" } as const;
const riskLabel = { low: "Low claim risk", medium: "Check license", high: "High claim risk" } as const;

export function Overview({ go }: { go: (s: "trends" | "library" | "collabs" | "calendar") => void }) {
  const router = useRouter();
  const toast = useStore((s) => s.toast);
  const u = home.user;
  const hour = new Date().getHours();
  const hi = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const best = home.ideas[0];
  const days = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
  return (
    <div className="grid gap-6">
      <section className="mesh grain relative overflow-hidden rounded-3xl border border-line p-8 md:p-14" aria-label="Today's best idea">
        <div className="relative z-10">
          <p className="t-label text-brand">{hi}, {u.name}</p>
          <h2 className="t-h1 mt-4 max-w-4xl">Today's best idea: “{best.title}”</h2>
          <div className="mt-5 flex flex-wrap items-center gap-3"><Badge tone="brand">{best.why}</Badge><span className="chip">{best.format}</span></div>
          <button className="btn-primary mt-8" onClick={() => router.push(best.format === "Short" ? "/short-videos" : "/video-studio")}>Start in Studio <ArrowUpRight size={16} /></button>
        </div>
      </section>

      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[{ l: "Followers", v: u.followers }, { l: "7-day views", v: u.views7d }, { l: "Engagement", v: u.engagement, d: 1, s: "%" }, { l: "Unused clips", v: home.unusedClips.length }].map((k, i) => (
          <Reveal as="li" key={k.l} delay={i * 0.05} className="card p-5"><div className="t-label text-muted">{k.l}</div><div className="mt-3 font-display text-4xl tracking-tight"><Count to={k.v} decimals={k.d} suffix={k.s} /></div></Reveal>
        ))}
      </ul>

      <section aria-labelledby="next-h">
        <div className="mb-4 flex items-end justify-between"><h2 id="next-h" className="t-h2">What to post next</h2></div>
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {home.ideas.map((i, n) => (
            <Reveal as="li" key={i.id} delay={n * 0.06} className="card flex flex-col justify-between gap-6 p-5 transition-colors hover:border-brand">
              <div><div className="flex flex-wrap gap-2"><Badge tone="brand">{i.why}</Badge><span className="chip">{i.format}</span></div><h3 className="mt-4 font-display text-2xl leading-tight">{i.title}</h3></div>
              <button className="btn-ghost w-fit" onClick={() => router.push(i.format === "Short" ? "/short-videos" : "/video-studio")}>Start in Studio</button>
            </Reveal>
          ))}
        </ul>
      </section>

      <section aria-labelledby="ev-h">
        <h2 id="ev-h" className="t-h2 mb-4">Upcoming events</h2>
        <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
          {home.events.map((e) => (
            <button key={e.id} onClick={() => { toast(`Event-aware script drafted`, `${e.name}: ${e.hint}`); router.push("/short-videos"); }} className="card min-w-56 p-5 text-left transition-colors hover:border-brand">
              <div className="t-label text-muted">in {days(e.date)} days</div><div className="mt-3 font-display text-2xl">{e.name}</div><p className="mt-1 text-xs text-muted">{e.hint}</p></button>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6" aria-labelledby="seas-h"><h2 id="seas-h" className="t-label text-muted">Seasonal recommendations</h2>
          <ul className="mt-4 grid gap-3">{home.seasonal.map((s) => <li key={s.id} className="flex items-center justify-between gap-3 border-b border-line pb-3 last:border-0"><span className="font-medium">{s.title}</span><span className="text-xs text-muted">{s.note}</span></li>)}</ul></section>
        <section className="card p-6" aria-labelledby="lib-h"><div className="flex items-center justify-between"><h2 id="lib-h" className="t-label text-muted">Library · 3 unused clips from your last video</h2><button className="text-xs text-brand underline" onClick={() => go("library")}>Open</button></div>
          <ul className="mt-4 grid gap-3">{home.unusedClips.map((c) => <li key={c.id} className="flex items-center justify-between gap-3"><span><span className="block text-sm font-medium">{c.title}</span><span className="text-xs text-muted">{c.range}</span></span><Badge tone="ok">{c.score}</Badge></li>)}</ul></section>
      </div>

      <section className="card p-6" aria-labelledby="cd-h"><div className="mb-4 flex items-center justify-between"><h2 id="cd-h" className="t-h2">Collab Deck</h2><button className="btn-ghost py-2" onClick={() => go("collabs")}>Open full deck</button></div><Collabs compact /></section>
    </div>
  );
}

export function Trends() {
  const [tab, setTab] = useState<"songs" | "memes" | "topics" | "hashtags">("songs");
  const [playing, setPlaying] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [gen, setGen] = useState<null | { topic: string; meme: string[]; reel: string[]; hooks: string[]; formats: string[]; story: string[] }>(null);
  const [busy, setBusy] = useState(false);
  const t = home.trending;
  const generate = () => {
    if (!topic.trim()) return;
    setBusy(true);
    setTimeout(() => {
      const x = topic.trim();
      setGen({ topic: x,
        meme: [`"Me explaining ${x} vs. what the algorithm heard"`, `Two-paths meme: ${x} edition`],
        reel: [`3 mistakes everyone makes with ${x}`, `${x} in 30 seconds — no jargon`],
        hooks: [`Nobody talks about this part of ${x}…`, `I tried ${x} for 7 days. Here's the truth.`, `Stop doing ${x} like this.`],
        formats: ["Green-screen explainer", "Split-screen reaction", "Carousel → Reel"],
        story: [`Poll: ${x} — yes or no?`, `Ask me anything about ${x}`] });
      setBusy(false);
    }, 900);
  };
  return (
    <div>
      <div role="tablist" className="mb-6 flex gap-2">{(["songs", "memes", "topics", "hashtags"] as const).map((k) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={clsx("chip px-5 py-2 text-sm capitalize", tab === k && "border-brand bg-brand text-brand-ink")}>{k}</button>)}</div>
      {tab === "songs" && (
        <ul className="grid gap-3 md:grid-cols-2">{t.songs.map((s) => (
          <li key={s.id} className="card flex items-center gap-4 p-4">
            <button onClick={() => setPlaying(playing === s.id ? null : s.id)} aria-label={`${playing === s.id ? "Pause" : "Play"} ${s.title}`} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand text-brand-ink">{playing === s.id ? <Pause size={18} /> : <Play size={18} />}</button>
            <div className="min-w-0 flex-1"><p className="truncate font-medium">{s.title}</p><p className="text-xs text-muted">{s.artist} · {s.uses} uses · {s.growth}</p>
              <div className="mt-2 flex h-5 items-end gap-0.5" aria-hidden="true">{Array.from({ length: 28 }, (_, i) => <motion.span key={i} className="w-1 rounded-full bg-accent" animate={{ height: playing === s.id ? [4, 4 + ((i * 7) % 16), 4] : 4 + ((i * 5) % 12) }} transition={{ repeat: playing === s.id ? Infinity : 0, duration: 0.7 + (i % 5) * 0.1 }} />)}</div></div>
            <Badge tone={riskTone[s.risk as keyof typeof riskTone]}>{riskLabel[s.risk as keyof typeof riskLabel]}</Badge>
          </li>))}</ul>
      )}
      {tab === "memes" && <ul className="grid gap-3 md:grid-cols-3">{t.memes.map((m, i) => <li key={m.id} className="card overflow-hidden"><div className="grain relative grid aspect-square place-items-center bg-sunken p-6 text-center"><div><p className="t-label text-muted">{m.template}</p><p className="mt-3 font-display text-2xl leading-tight">{m.caption}</p></div><span className="absolute right-3 top-3 text-brand">{["◐", "◑", "◒"][i]}</span></div><div className="flex items-center justify-between p-4 text-sm"><span>Growth</span><Badge tone="ok">{m.growth}</Badge></div></li>)}</ul>}
      {tab === "topics" && <ul className="grid gap-3 md:grid-cols-2">{t.topics.map((x) => <li key={x.id} className="card flex items-center justify-between p-5"><div><p className="font-display text-xl">{x.name}</p><p className="text-xs text-muted">Searches up {Math.round((x.series[6] / x.series[0] - 1) * 100)}% in 7 days</p></div><Sparkline data={x.series} /></li>)}</ul>}
      {tab === "hashtags" && <div className="grid gap-4 md:grid-cols-2">{(["niche", "broad", "trending", "avoid"] as const).map((k) => <div key={k} className="card p-5"><p className={clsx("t-label", k === "avoid" ? "text-bad" : "text-muted")}>{k}</p><div className="mt-3 flex flex-wrap gap-2">{t.hashtags[k].map((h) => <span key={h} className={clsx("chip", k === "avoid" && "border-bad/40 text-bad line-through")}>{h}</span>)}</div></div>)}</div>}

      <section className="card mt-8 p-6" aria-labelledby="idea-h">
        <h2 id="idea-h" className="t-h2">Idea generator</h2>
        <div className="mt-4 flex gap-2"><label htmlFor="idea-t" className="sr-only">Topic</label><input id="idea-t" className="input" placeholder="Type a topic — e.g. placement season" value={topic} onChange={(e) => setTopic(e.target.value)} onKeyDown={(e) => e.key === "Enter" && generate()} /><button className="btn-brand shrink-0" onClick={generate} disabled={busy}><Sparkles size={16} />{busy ? "Thinking…" : "Generate"}</button></div>
        {gen && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-6 grid gap-4 md:grid-cols-3">
            {([["Meme concepts", gen.meme], ["Reel concepts", gen.reel], ["Hooks", gen.hooks], ["Formats", gen.formats], ["Story ideas", gen.story]] as [string, string[]][]).map(([h, l]) => (
              <div key={h} className="rounded-xl border border-line p-4"><p className="t-label text-muted">{h}</p><ul className="mt-2 grid gap-1.5 text-sm">{l.map((x) => <li key={x}>• {x}</li>)}</ul></div>))}
          </motion.div>
        )}
      </section>
    </div>
  );
}

const FOLDERS = ["All", "Videos", "Photos", "Audio", "Podcasts", "Blogs", "Scripts", "Thumbnails", "Shorts", "Captions"];
export function Library() {
  const [folder, setFolder] = useState("All");
  const [q, setQ] = useState("");
  const [unused, setUnused] = useState(false);
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [selected, setSelected] = useState<string[]>([]);
  const [topic, setTopic] = useState("all");
  const toast = useStore((s) => s.toast);
  const items = useMemo(() => home.library.filter((a) => (folder === "All" || a.folder === folder) && (!unused || !a.used) && (topic === "all" || a.topic === topic) && a.name.toLowerCase().includes(q.toLowerCase())), [folder, q, unused, topic]);
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const topics = Array.from(new Set(home.library.map((a) => a.topic)));
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input className="input max-w-xs" placeholder="Search by name, transcript or visual tag" aria-label="Search library" value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="Topic" className="chip bg-surface px-3 py-2" value={topic} onChange={(e) => setTopic(e.target.value)}><option value="all">All topics</option>{topics.map((t) => <option key={t}>{t}</option>)}</select>
        <button aria-pressed={unused} onClick={() => setUnused(!unused)} className={clsx("chip px-4 py-2", unused && "border-brand bg-brand text-brand-ink")}>Unused only</button>
        <div className="ml-auto flex gap-1"><button aria-label="Grid" aria-pressed={layout === "grid"} onClick={() => setLayout("grid")} className={clsx("grid h-10 w-10 place-items-center rounded-full border border-line", layout === "grid" && "bg-text text-bg")}><Grid2x2 size={16} /></button><button aria-label="List" aria-pressed={layout === "list"} onClick={() => setLayout("list")} className={clsx("grid h-10 w-10 place-items-center rounded-full border border-line", layout === "list" && "bg-text text-bg")}><List size={16} /></button></div>
      </div>
      <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto">{FOLDERS.map((f) => <button key={f} onClick={() => setFolder(f)} aria-pressed={folder === f} className={clsx("chip shrink-0 px-4 py-1.5", folder === f && "border-text bg-text text-bg")}>{f}</button>)}</div>
      {selected.length > 0 && <div className="mb-4 flex items-center justify-between rounded-xl border border-brand bg-brand/10 p-3 text-sm"><span>{selected.length} selected</span><span className="flex gap-2"><button className="btn-primary py-1.5" onClick={() => { toast("Sent to Studio", `${selected.length} assets`); setSelected([]); }}>Reuse in Studio</button><button className="btn-ghost py-1.5" onClick={() => setSelected([])}>Clear</button></span></div>}
      <ul className={clsx(layout === "grid" ? "grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4" : "grid gap-2")}>
        {items.map((a, i) => (
          <motion.li layout key={a.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }} className={clsx("card relative", layout === "list" ? "flex items-center gap-4 p-3" : "p-3")}>
            <input type="checkbox" aria-label={`Select ${a.name}`} checked={selected.includes(a.id)} onChange={() => toggle(a.id)} className="absolute left-5 top-5 z-10 h-4 w-4 accent-[rgb(var(--brand))]" />
            <div className={clsx("grain relative grid place-items-center rounded-xl bg-sunken font-display text-2xl text-muted", layout === "list" ? "h-12 w-16" : "aspect-video")}>{{ video: "▶", image: "▣", audio: "♪", blog: "¶", script: "§", caption: "“”" }[a.kind] ?? "•"}</div>
            <div className={layout === "list" ? "min-w-0 flex-1" : "mt-3"}><p className="truncate text-sm font-medium">{a.name}</p><p className="text-xs text-muted">{a.folder} · {a.platform} · {a.topic}</p></div>
            <div className={clsx("flex gap-1.5", layout === "grid" && "mt-2")}>{a.used ? <Badge tone="muted">Used</Badge> : <Badge tone="warn">Unused · reuse?</Badge>}</div>
          </motion.li>
        ))}
        {items.length === 0 && <li className="col-span-full text-sm text-muted">No assets match.</li>}
      </ul>
      <div className="card mt-8 p-5"><h3 className="t-label text-muted">Reuse suggestions</h3><ul className="mt-3 grid gap-2 text-sm"><li>• <b>ep12_final.mp4</b> has never been clipped — try the <Link href="/video-studio?type=Podcast" className="text-brand underline">podcast set</Link>.</li><li className="text-warn">• Repeat risk: you posted a “pitch tips” Reel 5 days ago — space similar topics ≥ 10 days apart.</li></ul></div>
    </div>
  );
}
