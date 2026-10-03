"use client";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Count, Poster, Reveal, SplitReveal } from "@/components/ui/bits";
import { Marquee } from "@/components/ui/Marquee";
import { groups } from "@/lib/match";

type Enter = (href: string) => void;

export function Hero() {
  return (
    <section id="top" className="mesh grain relative overflow-hidden border-b border-line">
      <div className="relative z-10 mx-auto max-w-[1600px] px-5 pb-20 pt-16 md:px-10 md:pb-32 md:pt-28">
        <div className="grid gap-14">
          <div>
            <p className="t-label mb-4 text-brand">Scripts</p>
            <h1 className="t-display"><SplitReveal text="We turn raw footage into posts that work on every platform." /></h1>
          </div>
          <div className="md:ml-[18%]">
            <p className="t-label mb-4 text-accent">Edits</p>
            <p className="t-display"><SplitReveal text="and AI edits that stay yours to change." delay={0.5} /></p>
          </div>
        </div>
        <Reveal delay={0.9} className="mt-16 max-w-xl text-lg text-muted md:text-xl">
          Smart tools for creators big and small, from the first idea to the published post, so you can spend your time growing an audience, not juggling apps.
        </Reveal>
      </div>
    </section>
  );
}

function WorkCard({ g, onOpen }: { g: (typeof groups)[number]; onOpen: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(false);
  const [poster, setPoster] = useState(true);
  const [video, setVideo] = useState(true);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "200px" });
    io.observe(el); return () => io.disconnect();
  }, []);
  const isShort = g.format === "short";
  return (
    <button ref={ref} onClick={onOpen} className="group relative block w-[72vw] shrink-0 text-left sm:w-[44vw] md:w-[30vw] lg:w-[24vw]" aria-label={`${g.title}, ${g.type}`}>
      <Poster seed={g.hue} label={g.title} className={`${isShort ? "aspect-[4/5]" : "aspect-[4/3]"} w-full rounded-2xl border border-line transition-transform duration-500 group-hover:scale-[0.985]`}>
        {poster && g.media && <img src={`/demo/${g.id}/poster.jpg`} alt="" loading="lazy" onError={() => setPoster(false)} className="absolute inset-0 h-full w-full object-cover" />}
        {visible && video && g.media && <video src={`/demo/${g.id}/output.mp4`} muted loop autoPlay playsInline preload="none" onError={() => setVideo(false)} className="absolute inset-0 h-full w-full object-cover" />}
        <span className="absolute left-4 top-4 font-display text-6xl text-brand-ink/90 mix-blend-overlay">{g.id.toUpperCase()}</span>
      </Poster>
      <div className="mt-4 flex items-start justify-between gap-3">
        <h3 className="font-display text-xl leading-tight">{g.title}</h3>
        <ArrowUpRight className="mt-1 shrink-0 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" size={20} />
      </div>
      <div className="mt-2 flex gap-2"><span className="chip">{isShort ? "Short" : "Video"}</span><span className="chip">{g.type}</span></div>
    </button>
  );
}

export function SelectedWork({ onEnter }: { onEnter: Enter }) {
  return (
    <section id="demo" className="border-b border-line py-16 md:py-24" aria-labelledby="work-h">
      <div className="mx-auto mb-10 flex max-w-[1600px] items-end justify-between px-5 md:px-10">
        <h2 id="work-h" className="t-h1">Selected work</h2>
        <p className="hidden max-w-xs text-sm text-muted md:block">Five prepared sample sets from the demo. Tap one to open the upload flow.</p>
      </div>
      <Marquee duration={70} gap="gap-6" label="Selected work" className="px-5">
        {groups.map((g) => <WorkCard key={g.id} g={g} onOpen={() => onEnter(g.format === "short" ? "/short-videos" : "/videos")} />)}
      </Marquee>
    </section>
  );
}

export function Statement() {
  return (
    <section id="features" className="mx-auto max-w-[1600px] px-5 py-24 md:px-10 md:py-40">
      <Reveal><p className="t-h1 max-w-[18ch] md:max-w-[22ch]">Great tools get you started, but your workflow, voice and audience keep you growing.</p></Reveal>
      <Reveal delay={0.1} className="mt-10"><a href="#workflow" className="inline-flex items-center gap-2 border-b border-text pb-1 text-sm font-medium hover:border-brand hover:text-brand">About CreatorAi <ArrowUpRight size={16} /></a></Reveal>
      <div id="workflow" className="mt-24 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-5">
        {["Idea", "Script", "Edit", "Review", "Publish"].map((s, i) => (
          <Reveal key={s} delay={i * 0.06} className="bg-bg p-6">
            <div className="t-label text-muted">0{i + 1}</div>
            <div className="mt-6 font-display text-3xl">{s}</div>
            <p className="mt-3 text-sm text-muted">{["Trend-aware prompts and festival-ready ideas.", "Hooks and scripts matched to your footage.", "AI cuts you can trim, restyle and reset.", "Copyright, safe-zone and caption checks.", "One click to every platform, with hearts."][i]}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function Counters() {
  const stats = [
    { n: 12480, l: "clips drafted (demo)" }, { n: 386, l: "creators in the sample set" }, { n: 91, l: "% of AI cuts tweaked by hand", s: "%" }, { n: 6, l: "platform profiles" },
  ];
  const words = ["Reels", "Shorts", "Podcasts", "Lectures", "Vlogs", "Memes", "Stories", "Ads"];
  return (
    <section id="platforms" className="border-y border-line bg-sunken py-16 md:py-24">
      <div className="mx-auto max-w-[1600px] px-5 md:px-10">
        <h2 className="t-h1 max-w-3xl">We help creators big &amp; small</h2>
        <dl className="mt-14 grid grid-cols-2 gap-y-10 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.l}><dt className="sr-only">{s.l}</dt><dd className="font-display text-5xl tracking-tight md:text-7xl"><Count to={s.n} suffix={s.s ? "" : ""} /></dd><p className="mt-2 text-sm text-muted">{s.l}</p></div>
          ))}
        </dl>
        <p className="mt-6 text-xs text-muted">Illustrative demo numbers.</p>
      </div>
      <Marquee duration={36} reverse className="mt-14" gap="gap-10" label="Formats">
        {words.map((w) => <span key={w} className="font-display text-6xl tracking-tight text-muted/60 md:text-8xl">{w} <span className="text-brand">✦</span></span>)}
      </Marquee>
    </section>
  );
}

const NICHES = [
  { l: "Podcasts", q: "/videos?type=Podcast" }, { l: "Lectures", q: "/videos?type=Lecture" }, { l: "Vlogs", q: "/videos?type=Vlog" },
  { l: "Comedy & Memes", q: "/short-videos?type=Comedy" }, { l: "Tech Tutorials", q: "/videos?type=Tutorial" }, { l: "Business & Finance", q: "/short-videos?type=Business" },
  { l: "Education", q: "/videos?type=Lecture" }, { l: "Travel", q: "/videos?type=Vlog" },
];
export function Niches({ onEnter }: { onEnter: Enter }) {
  return (
    <section className="py-16 md:py-24" aria-labelledby="niche-h">
      <h2 id="niche-h" className="t-label mb-8 px-5 text-muted md:px-10">Niches we serve</h2>
      <Marquee duration={50} gap="gap-12" label="Niches">
        {NICHES.map((n) => (
          <a key={n.l} href={n.q} onClick={(e) => { e.preventDefault(); onEnter(n.q); }} className="whitespace-nowrap font-display text-5xl tracking-tight underline-offset-8 hover:text-brand hover:underline md:text-7xl">{n.l}</a>
        ))}
      </Marquee>
    </section>
  );
}

export function Services({ onEnter }: { onEnter: Enter }) {
  const rows = [
    { l: "Short Videos", href: "/short-videos", sub: "Reels · Shorts · Stories · Ads", seed: 1 },
    { l: "Videos", href: "/videos", sub: "Podcasts · Lectures · Vlogs", seed: 3 },
  ];
  const [hover, setHover] = useState<number | null>(null);
  const x = useMotionValue(0), y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 22 }), sy = useSpring(y, { stiffness: 220, damping: 22 });
  return (
    <section className="mx-auto max-w-[1600px] px-5 py-16 md:px-10 md:py-24" aria-labelledby="svc-h"
      onMouseMove={(e) => { x.set(e.clientX + 24); y.set(e.clientY - 120); }}>
      <h2 id="svc-h" className="t-label mb-8 text-muted">Our services</h2>
      <ul className="border-t border-line">
        {rows.map((r, i) => (
          <li key={r.l} className="border-b border-line">
            <a href={r.href} onClick={(e) => { e.preventDefault(); onEnter(r.href); }} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
              className="group flex items-center justify-between py-8 transition-[padding] duration-500 hover:pl-6 md:py-12">
              <span><span className="t-display block">{r.l}</span><span className="mt-2 block text-sm text-muted">{r.sub}</span></span>
              <ArrowUpRight className="h-10 w-10 shrink-0 transition-transform group-hover:rotate-12 md:h-16 md:w-16" />
            </a>
          </li>
        ))}
      </ul>
      <motion.div aria-hidden="true" className="pointer-events-none fixed left-0 top-0 z-30 hidden h-60 w-44 md:block" style={{ x: sx, y: sy }} animate={{ opacity: hover === null ? 0 : 1, scale: hover === null ? 0.8 : 1 }}>
        <Poster seed={hover === null ? 1 : rows[hover].seed} className="h-full w-full rounded-2xl border border-line shadow-soft"><span className="absolute bottom-3 left-3 t-label text-brand-ink">Preview</span></Poster>
      </motion.div>
    </section>
  );
}
