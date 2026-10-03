"use client";
import { motion } from "framer-motion";
import { UploadWorkspace } from "@/components/workspace/UploadWorkspace";
import { FormatCard } from "./ShortsLanding";
import { Glyph, type GlyphName } from "./Glyphs";

const TYPES = [
  { href: "/videos/podcast", title: "Podcast", platform: "Long-form conversation", glyph: "podcast" as GlyphName, tone: "bg-accent text-black" },
  { href: "/videos/lecture", title: "Lecture", platform: "Teach and explain", glyph: "lecture" as GlyphName, tone: "bg-brand-2 text-black" },
  { href: "/videos/vlog", title: "Vlog", platform: "Your day, your story", glyph: "vlog" as GlyphName, tone: "bg-tan/35 text-text" },
];

const ORBIT: { g: GlyphName; x: string; y: string; r: string; d: string }[] = [
  { g: "podcast", x: "6%", y: "18%", r: "-8deg", d: "6s" }, { g: "lecture", x: "88%", y: "10%", r: "6deg", d: "7s" },
  { g: "diamond", x: "94%", y: "70%", r: "0deg", d: "5s" }, { g: "sketch", x: "2%", y: "72%", r: "8deg", d: "8s" },
  { g: "orb", x: "14%", y: "10%", r: "0deg", d: "6.5s" },
];

export function VideosLanding() {
  return (
    <div className="mx-auto max-w-[1200px] pb-4">
      <section className="relative px-2 pb-6 pt-2 text-center md:pt-4">
        <div className="pointer-events-none absolute inset-0 hidden md:block" aria-hidden="true">
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 300" preserveAspectRatio="none"><ellipse cx="500" cy="150" rx="470" ry="135" fill="none" stroke="rgb(var(--text))" strokeOpacity="0.35" strokeWidth="1.2" strokeDasharray="1.5 7" strokeLinecap="round" /></svg>
          {ORBIT.map((o) => (
            <div key={o.g} className="orbit-bob absolute -translate-x-1/2 -translate-y-1/2" style={{ left: o.x, top: o.y, ["--r" as string]: o.r, ["--d" as string]: o.d }}><Glyph name={o.g} size={52} /></div>
          ))}
        </div>
        <motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="relative font-display text-[clamp(2.2rem,5vw,3.8rem)] font-medium leading-[0.98] tracking-[-0.045em]">
          Create a video
        </motion.h1>
        <p className="relative mt-2 text-base text-muted">What are you creating today?</p>
      </section>

      <section aria-label="Choose a video type" className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
        {TYPES.map((t) => <FormatCard key={t.href} {...t} />)}
        <FormatCard href="/videos/other" title="Other" platform="Anything else" glyph="other" tone="bg-brand text-brand-ink" />
      </section>

      <section aria-label="Upload video" className="mx-auto mt-6 max-w-3xl">
        <UploadWorkspace kind="video" embedded forcedTab="All" dropTitle="+ Upload videos and photos" dropHint="Drop your footage and photos here and we’ll recognise it and start a cut." />
      </section>
    </div>
  );
}
