"use client";
import { UploadWorkspace } from "@/components/workspace/UploadWorkspace";
import { FormatCard } from "./ShortsLanding";
import { FlowCard } from "./FlowCard";
import { type GlyphName } from "./Glyphs";

const TYPES = [
  { href: "/videos/podcast", title: "Podcast", platform: "Long-form conversation", glyph: "podcast" as GlyphName, tone: "bg-accent text-black" },
  { href: "/videos/lecture", title: "Lecture", platform: "Teach and explain", glyph: "lecture" as GlyphName, tone: "bg-brand-2 text-black" },
  { href: "/videos/vlog", title: "Vlog", platform: "Your day, your story", glyph: "vlog" as GlyphName, tone: "bg-sage text-text" },
];

export function VideosLanding() {
  return (
    <div className="mx-auto flex max-w-[1200px] flex-col pb-4 lg:h-full lg:pb-0">
      <section aria-label="Choose a video type" className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
        {TYPES.map((t) => <FormatCard key={t.href} {...t} />)}
        <FormatCard href="/videos/other" title="Other" platform="Anything else" glyph="other" tone="bg-brand text-brand-ink" />
      </section>

      <section aria-label="Upload video" className="mt-6 grid items-stretch gap-5 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="rounded-[28px] flex flex-col border border-text/10 p-5 lg:min-h-0">
          <UploadWorkspace kind="video" embedded forcedTab="All" dropTitle="Upload videos and photos" dropHint="Drop your footage and photos here and we’ll recognise it and start a cut." />
        </div>
        <FlowCard
          eyebrow="From recording to published video"
          steps={[
            { title: "Understand", sub: "Transcript, speakers and topics" },
            { title: "Organise", sub: "Chapters and key sections" },
            { title: "Polish", sub: "Cuts, captions and framing" },
            { title: "Repurpose", sub: "Shorts and clips from the best moments" },
          ]}
          footer="One recording. Multiple pieces of content."
        />
      </section>
    </div>
  );
}
