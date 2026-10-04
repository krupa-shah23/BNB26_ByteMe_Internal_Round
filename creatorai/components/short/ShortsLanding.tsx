"use client";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import { UploadWorkspace } from "@/components/workspace/UploadWorkspace";
import { Glyph, type GlyphName } from "./Glyphs";
import { FlowCard } from "./FlowCard";

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
    <div className="mx-auto flex max-w-[1200px] flex-col pb-4 lg:h-full lg:pb-0">
      <section aria-label="Choose a format" className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
        {FORMATS.map((f) => <FormatCard key={f.href} {...f} />)}
        <FormatCard href="/short-videos/ads" title="Ads" platform="Create an ad" glyph="ads" tone="bg-brand text-brand-ink" />
      </section>

      <section aria-label="Upload clips" className="mt-6 grid items-stretch gap-5 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="rounded-[28px] flex flex-col border border-text/10 p-5 lg:min-h-0">
          <UploadWorkspace kind="short" embedded forcedTab="Reels" dropTitle="Upload videos and photos" dropHint="Drop your videos and photos here and we’ll recognise the set and start a cut." />
        </div>
        <FlowCard
          eyebrow="From footage to short"
          steps={[
            { title: "Find the moment", sub: "Best beats picked from your footage" },
            { title: "Build the clip", sub: "Trimmed, paced and ready to cut" },
            { title: "Add captions", sub: "Styled and synced automatically" },
            { title: "Adapt the format", sub: "Sized for Reels, Shorts or Stories" },
          ]}
          footer="Your edits always stay editable."
        />
      </section>
    </div>
  );
}
