"use client";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import { UploadWorkspace } from "@/components/workspace/UploadWorkspace";
import { Glyph, type GlyphName } from "./Glyphs";

const FORMATS: { href: string; title: string; platform: string; glyph: GlyphName; tone: string }[] = [
  { href: "/short-videos/reels", title: "Reels", platform: "Instagram", glyph: "reels", tone: "bg-accent text-black" },
  { href: "/short-videos/shorts", title: "Shorts", platform: "YouTube", glyph: "shorts", tone: "bg-brand-2 text-black" },
  { href: "/short-videos/stories", title: "Stories", platform: "Instagram", glyph: "stories", tone: "bg-sage text-text" },
];

export function FormatCard({ href, title, platform, glyph, tone, wide }: (typeof FORMATS)[number] & { wide?: boolean }) {
  return (
    <motion.div whileHover={{ y: -6 }} transition={{ type: "spring", stiffness: 300, damping: 20 }} className={wide ? "w-full max-w-md" : "w-full"}>
      <Link href={href} className={clsx("group relative flex h-full min-h-[150px] flex-col justify-between overflow-hidden rounded-[28px] border border-text/10 p-5 lg:min-h-[170px] transition-shadow hover:shadow-soft", tone)}>
        <div className="flex items-start justify-between">
          <div>
            <div className="font-display text-3xl tracking-tight">{title}</div>
            <div className="mt-1 text-sm opacity-70">{platform}</div>
          </div>
          <motion.div className="origin-center" whileHover={{ rotate: 8, scale: 1.08 }}><Glyph name={glyph} size={64} /></motion.div>
        </div>
        <span className="grid h-11 w-11 place-items-center rounded-full border border-current transition-transform group-hover:translate-x-1" aria-hidden="true"><ArrowRight size={18} /></span>
      </Link>
    </motion.div>
  );
}

export const ORBIT: { g: GlyphName; x: string; y: string; r: string; d: string }[] = [
  { g: "reels", x: "6%", y: "18%", r: "-8deg", d: "6s" }, { g: "shorts", x: "88%", y: "10%", r: "6deg", d: "7s" },
  { g: "diamond", x: "94%", y: "70%", r: "0deg", d: "5s" }, { g: "sketch", x: "2%", y: "72%", r: "8deg", d: "8s" },
  { g: "orb", x: "14%", y: "10%", r: "0deg", d: "6.5s" },
];

export function ShortsLanding() {
  return (
    <div className="mx-auto max-w-[1200px] pb-4">
      <section className="relative px-2 pb-6 pt-2 text-center md:pt-4">
        {/* dotted orbit with floating tiles (decorative) */}
        <div className="pointer-events-none absolute inset-0 hidden md:block" aria-hidden="true">
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 300" preserveAspectRatio="none"><ellipse cx="500" cy="150" rx="470" ry="135" fill="none" stroke="rgb(var(--text))" strokeOpacity="0.35" strokeWidth="1.2" strokeDasharray="1.5 7" strokeLinecap="round" /></svg>
          {ORBIT.map((o) => (
            <div key={o.g} className="orbit-bob absolute -translate-x-1/2 -translate-y-1/2" style={{ left: o.x, top: o.y, ["--r" as string]: o.r, ["--d" as string]: o.d }}><Glyph name={o.g} size={52} /></div>
          ))}
        </div>
        <motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="relative font-display text-[clamp(2.2rem,5vw,3.8rem)] font-medium leading-[0.98] tracking-[-0.045em]">
          Create your next short
        </motion.h1>
        <p className="relative mt-2 text-base text-muted">Choose a format and let’s get started.</p>
      </section>

      <section aria-label="Choose a format" className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
        {FORMATS.map((f) => <FormatCard key={f.href} {...f} />)}
        <FormatCard href="/short-videos/ads" title="Ads" platform="Create an ad" glyph="ads" tone="bg-brand text-brand-ink" />
      </section>

      <section aria-label="Upload clips" className="mx-auto mt-6 max-w-3xl">
        <UploadWorkspace kind="short" embedded forcedTab="Reels" dropTitle="+ Upload videos and photos" dropHint="Drop your videos and photos here and we’ll recognise the set and start a cut." />
      </section>
    </div>
  );
}
