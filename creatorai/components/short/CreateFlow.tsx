"use client";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import clsx from "clsx";
import { StepIndicator, StepPanel, type StepDef } from "@/components/ui/Stepper";
import { UploadWorkspace } from "@/components/workspace/UploadWorkspace";
import { Glyph, type GlyphName } from "./Glyphs";

type Opt = { id: string; title: string; sub?: string; ratio?: [number, number] };
type StepCfg = StepDef & { heading: string; options?: Opt[]; finish?: boolean; multi?: boolean };
export type FormatKey = "reels" | "shorts" | "stories" | "ads" | "podcast" | "lecture" | "vlog" | "other";

const DIMS: Opt[] = [
  { id: "9:16", title: "9 : 16", sub: "Vertical video", ratio: [9, 16] },
  { id: "1:1", title: "1 : 1", sub: "Square video", ratio: [1, 1] },
  { id: "4:5", title: "4 : 5", sub: "Portrait", ratio: [4, 5] },
];
const LENGTH: Opt[] = [
  { id: "<30 sec", title: "Under 30 sec", sub: "Quick and punchy" },
  { id: "30–60 sec", title: "30–60 sec", sub: "The sweet spot" },
  { id: "60–90 sec", title: "60–90 sec", sub: "Room to explain" },
];
const plain = (xs: string[]): Opt[] => xs.map((t) => ({ id: t, title: t }));

const ORGANIC: StepCfg[] = [
  { id: "dimensions", label: "Dimensions", heading: "Choose your dimensions", options: DIMS },
  { id: "length", label: "Length", heading: "How long should it be?", options: LENGTH },
  { id: "purpose", label: "Purpose", heading: "What’s the purpose?", options: plain(["Education", "Promotion", "Entertainment", "Vlog", "Storytelling", "Other"]) },
  { id: "finish", label: "Finish", heading: "", finish: true },
];
const ADS: StepCfg[] = [
  { id: "platform", label: "Platform", heading: "Where will this ad run?", options: plain(["Instagram", "YouTube", "Facebook", "LinkedIn"]) },
  { id: "goal", label: "Goal", heading: "What’s the goal?", options: plain(["Product Ad", "Announcement", "Entertainment", "Education"]) },
  { id: "length", label: "Length", heading: "How long should the ad be?", options: [{ id: "10–15 sec", title: "10–15 sec", sub: "Scroll-stopper" }, { id: "25–30 sec", title: "25–30 sec", sub: "Full story" }] },
];

const VIDEO_DIMS: Opt[] = [
  { id: "16:9", title: "16 : 9", sub: "Landscape", ratio: [16, 9] },
  { id: "1:1", title: "1 : 1", sub: "Square", ratio: [1, 1] },
  { id: "4:5", title: "4 : 5", sub: "Portrait", ratio: [4, 5] },
];
const VIDEO_STEPS: StepCfg[] = [
  { id: "dimensions", label: "Dimensions", heading: "Choose your video format", options: VIDEO_DIMS },
  { id: "length", label: "Length", heading: "How long is your video?", options: plain(["1–5 min", "5–15 min", "15–30 min", "30–60 min", "60+ min"]) },
  { id: "purpose", label: "Purpose", heading: "What’s the purpose?", options: plain(["Education", "Entertainment", "Discussion", "Tutorial", "Storytelling", "Other"]) },
  { id: "platform", label: "Platform", heading: "Where will you publish it?", options: plain(["YouTube", "LinkedIn", "X", "Facebook"]), multi: true },
  { id: "finish", label: "Finish", heading: "", finish: true },
];
const DEFAULTS: Partial<Record<FormatKey, Record<string, string[]>>> = {
  podcast: { dimensions: ["16:9"] }, lecture: { dimensions: ["16:9"] }, vlog: { dimensions: ["16:9"] }, other: { dimensions: ["16:9"] },
};

const META: Record<FormatKey, { noun: string; article: string; tab: string; glyph: GlyphName; steps: StepCfg[]; platform?: string; kind: "short" | "video" }> = {
  podcast: { noun: "Podcast", article: "a", tab: "Podcast", glyph: "podcast", steps: VIDEO_STEPS, kind: "video" },
  lecture: { noun: "Lecture", article: "a", tab: "Lecture", glyph: "lecture", steps: VIDEO_STEPS, kind: "video" },
  vlog: { noun: "Vlog", article: "a", tab: "Vlog", glyph: "vlog", steps: VIDEO_STEPS, kind: "video" },
  other: { noun: "Video", article: "a", tab: "Other", glyph: "other", steps: VIDEO_STEPS, kind: "video" },
  reels: { noun: "Reel", article: "a", tab: "Reels", glyph: "reels", steps: ORGANIC, platform: "Instagram", kind: "short" },
  shorts: { noun: "Short", article: "a", tab: "Shorts", glyph: "shorts", steps: ORGANIC, platform: "YouTube", kind: "short" },
  stories: { noun: "Story", article: "a", tab: "Stories", glyph: "stories", steps: ORGANIC, platform: "Instagram", kind: "short" },
  ads: { noun: "Ad", article: "an", tab: "Ads", glyph: "ads", steps: ADS, kind: "short" },
};

function Choice({ opt, selected, onPick, multi }: { opt: Opt; selected: boolean; onPick: () => void; multi?: boolean }) {
  const peak = opt.ratio ? Math.max(...opt.ratio) : 1;
  return (
    <motion.button type="button" role={multi ? "checkbox" : "radio"} aria-checked={selected} onClick={onPick} whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }}
      className={clsx("relative flex min-h-[104px] lg:min-h-[clamp(84px,14vh,168px)] flex-col items-center justify-center gap-1.5 rounded-3xl border p-4 text-center transition-colors", selected ? "border-brand bg-brand text-brand-ink" : "border-line bg-surface hover:border-text/40")}>
      {opt.ratio && (
        <span className={clsx("mb-1 block rounded-md border-2", selected ? "border-accent bg-accent/25" : "border-text/50")} style={{ width: 30 * (opt.ratio[0] / peak) + 6, height: 30 * (opt.ratio[1] / peak) + 6 }} />
      )}
      <span className="font-display text-2xl tracking-tight">{opt.title}</span>
      {opt.sub && <span className={clsx("text-sm", selected ? "opacity-80" : "text-muted")}>{opt.sub}</span>}
      {selected && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-accent text-black"><Check size={14} /></motion.span>}
    </motion.button>
  );
}

export function CreateFlow({ format }: { format: FormatKey }) {
  const m = META[format];
  const steps = m.steps;
  const [i, setI] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [ans, setAns] = useState<Record<string, string[]>>(DEFAULTS[format] ?? {});
  const [phase, setPhase] = useState<"steps" | "upload">("steps");

  const cur = steps[i];
  const last = i === steps.length - 1;
  const ready = cur.finish || !!ans[cur.id]?.length;
  const pick = (s: StepCfg, id: string) => setAns((a) => {
    const prev = a[s.id] ?? [];
    return { ...a, [s.id]: s.multi ? (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]) : [id] };
  });
  const go = (n: number) => { setDir(n > i ? 1 : -1); setI(n); };
  const next = () => (last ? setPhase("upload") : go(i + 1));
  const summary: [string, string][] = [
    ["Format", m.noun],
    ...(m.platform ? [["Platform", m.platform] as [string, string]] : []),
    ...steps.filter((s) => !s.finish).map((s) => [s.label, ans[s.id]?.join(" · ") ?? "—"] as [string, string]),
  ];

  const center = true; // every flow is centred on the page
  return (
    <div className="flex flex-col pb-4 lg:h-full">
      <Link href={m.kind === "video" ? "/videos" : "/short-videos"} className="inline-flex w-fit items-center gap-2 self-start text-sm hover:opacity-60"><ArrowLeft size={16} />Back</Link>

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-6 py-2 lg:gap-5">
      <header className={clsx("flex items-center gap-4", center && "flex-col gap-3 text-center")}>
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="shrink-0"><Glyph name={m.glyph} size={52} /></motion.div>
        <div>
          <h1 className="font-display text-[clamp(2rem,min(4.4vw,6.5vh),3.6rem)] font-medium leading-none tracking-[-0.04em]">Create {m.article} {m.noun}</h1>
          <p className="mt-2 text-base text-muted">{phase === "steps" ? "Let’s shape your video before we make it." : "Now add your clips and we’ll take it from here."}</p>
        </div>
      </header>

      {phase === "steps" ? (
        <>
          <div className="mx-auto w-full max-w-3xl pb-6"><StepIndicator steps={steps} current={i} onJump={go} left={!center} /></div>
          <div>
            <StepPanel index={i} direction={dir}>
              {cur.finish ? (
                <div className={clsx("max-w-md", center && "mx-auto text-center")}>
                  <h2 className="font-display text-2xl tracking-tight">Your {m.kind === "video" ? "video" : "short"} is ready to be created.</h2>
                  <dl className="mt-4 divide-y divide-line rounded-3xl border border-line bg-surface text-left">
                    {summary.map(([k, v]) => (<div key={k} className="flex justify-between px-5 py-2 text-sm"><dt className="text-muted">{k}</dt><dd className="font-medium">{v}</dd></div>))}
                  </dl>
                </div>
              ) : (
                <>
                  <h2 className={clsx("mb-1 font-display text-3xl tracking-tight", center && "text-center")}>{cur.heading}</h2>
                  <p className={clsx("mb-4 text-base text-muted", center && "text-center")}>{cur.multi ? "Pick as many as you like." : "Pick one to continue."}</p>
                  <div role={cur.multi ? "group" : "radiogroup"} aria-label={cur.heading} className={clsx("grid gap-3 lg:gap-4", center && "mx-auto", cur.options!.length === 2 ? "max-w-2xl grid-cols-2" : cur.options!.length === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3")}>
                    {cur.options!.map((o) => <Choice key={o.id} opt={o} selected={!!ans[cur.id]?.includes(o.id)} multi={cur.multi} onPick={() => pick(cur, o.id)} />)}
                  </div>
                </>
              )}
            </StepPanel>
          </div>
          <div className={clsx("flex items-center gap-3", center && "justify-center")}>
            {i > 0 && <button className="btn-ghost" onClick={() => go(i - 1)}><ArrowLeft size={16} />Previous</button>}
            <button className="btn-primary px-7 py-3" disabled={!ready} onClick={next}>
              {last ? (format === "ads" ? "Create Ad" : m.kind === "video" ? "Create Video" : `Create my ${m.noun}`) : "Continue"}<ArrowRight size={16} />
            </button>
          </div>
        </>
      ) : (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid gap-4">
          <div className={clsx("flex flex-wrap items-center gap-2", center && "justify-center")}>
            {summary.map(([k, v]) => <span key={k} className="chip bg-surface py-1.5"><span className="text-muted">{k}</span> {v}</span>)}
            <button className="text-sm underline underline-offset-4 hover:opacity-60" onClick={() => { setPhase("steps"); go(0); }}>Edit</button>
          </div>
          <div className="mx-auto w-full max-w-3xl">
            <UploadWorkspace kind={m.kind} embedded forcedTab={m.tab} dropTitle="Upload videos and photos" dropHint={`Drop the clips and photos for your ${m.noun.toLowerCase()}, in any order. Audio is welcome too.`} />
          </div>
        </motion.div>
      )}
      </div>
    </div>
  );
}
