"use client";
import { useState } from "react";
import clsx from "clsx";
import { Overlay } from "@/components/ui/Overlay";
import { useStore } from "@/lib/store";

/** Hardcoded "content intelligence" report for the Genetic Algorithm lecture (part1+2+3 → full_video). */
const INFO: [string, string][] = [["Duration", "12:38"], ["Resolution", "848 × 384"], ["Format", "MP4"], ["Content type", "Educational / Tutorial"], ["Primary format", "Screen recording / Presentation"], ["Orientation", "Landscape"], ["Audio", "Detected"], ["Visual content", "Slides, tables, annotations"]];
const STATUS: [string, string][] = [["Video quality", "Good"], ["Speech detected", "Yes"], ["Slides detected", "Yes"], ["Faces detected", "No / minimal"], ["Screen content", "High"], ["Editing complexity", "Low–Medium"]];
const SECTIONS: [string, string][] = [["00:00", "Problem introduction"], ["01:20", "Initial population"], ["03:10", "Fitness calculation"], ["04:40", "Selection / mating pool"], ["05:50", "Crossover"], ["07:30", "Mutation"], ["09:10", "Result / continuation"]];
const TOPICS = ["Genetic Algorithm", "Initial Population", "Fitness Function", "Selection", "Mating Pool", "Crossover", "Mutation", "Optimisation"];
const VISUALS = ["Presentation slides", "Mathematical equations", "Tables", "Highlighted values", "Hand-drawn annotations", "Step-by-step calculations"];
const MOMENTS: { n: string; t: string; title: string; text: string; why: string; s: [number, number, number, number, number] }[] = [
  { n: "01", t: "00:00 – 00:45", title: "Problem setup", text: "Introduction to the optimisation problem f(x) = x².", why: "Good context for someone unfamiliar with the example.", s: [8.2, 8.0, 8.4, 7.5, 7.8] },
  { n: "02", t: "~01:20 – 02:40", title: "Initial population", text: "How the initial binary population is selected and converted into X values.", why: "Introduces the first actual step of the algorithm.", s: [7.6, 8.8, 8.6, 7.4, 7.9] },
  { n: "03", t: "~03:10 – 04:30", title: "Fitness calculation", text: "Calculates f(x) = x² for each candidate and compares their fitness values.", why: "Contains a concrete calculation and a clear result.", s: [8.0, 9.1, 8.7, 7.5, 8.4] },
  { n: "04", t: "~04:40 – 05:45", title: "Selecting the mating pool", text: "Explains how individuals are selected based on fitness / probability.", why: "Strong conceptual section.", s: [7.7, 9.0, 8.2, 7.6, 8.1] },
  { n: "05", t: "~05:50 – 07:25", title: "Crossover", text: "Demonstrates crossover points and generation of offspring.", why: "Visually understandable and works well as an educational short.", s: [8.3, 9.0, 8.9, 7.7, 8.6] },
  { n: "06", t: "~07:30 – 09:05", title: "Mutation", text: "Shows chromosome mutation and the resulting fitness values.", why: "Strong standalone concept with a visible before/after transformation.", s: [8.1, 8.9, 9.0, 7.8, 8.5] },
];
const SCORE_LABELS = ["Hook potential", "Educational value", "Visual clarity", "Standalone context", "Short-form potential"];
const DNA: [string, string][] = [["Content style", "Educational / explanatory"], ["Pacing", "Moderate"], ["Presentation", "Step-by-step"], ["Language", "Technical / instructional"], ["Visual style", "Slide-led"], ["Information density", "High"], ["Hook style", "Problem → explanation"], ["CTA style", "Minimal"]];
const STRUCTURE = ["HOOK · “How does a genetic algorithm actually find the best solution?”", "PROBLEM · f(x) = x²", "STEP 1 · Initial population", "STEP 2 · Calculate fitness", "STEP 3 · Select the mating pool", "STEP 4 · Crossover", "STEP 5 · Mutation", "PAYOFF · Best-performing solution"];
const DECISIONS: [string, string][] = [["Cuts", "Remove pauses and unnecessary repetition"], ["Pacing", "Medium-fast, cut every 2–5 sec where possible"], ["Zoom", "Into important table values"], ["Transitions", "Minimal, this is educational content"], ["Captions", "Large technical keywords; highlight equations and key numbers"], ["B-roll", "Not needed"], ["Music", "None / very low-volume optional track"], ["CTA", "Minimal"]];
const OUTPUTS: [string, string, string][] = [["Short 1", "How Genetic Algorithms Choose the Best Solution", "45–60 sec"], ["Short 2", "Fitness Functions Explained Using f(x) = x²", "40–50 sec"], ["Short 3", "Crossover and Mutation in Genetic Algorithms", "45–60 sec"], ["Main video", "Genetic Algorithm Solved Example", "~10–12 min after removing dead time"]];
const HOOKS: [string, string, string][] = [["Educational", "How does a genetic algorithm actually find the best solution?", "9.1"], ["Curiosity", "What happens when you make an algorithm evolve?", "8.7"], ["Problem-based", "Can we use evolution to solve an optimisation problem?", "8.5"], ["Direct", "Here’s a complete Genetic Algorithm example in under a minute.", "8.2"]];
const PLATFORMS: [string, string, string][] = [["YouTube", "16:9 · 10–12 min · full explanation", "Genetic Algorithm Solved Example | Selection, Crossover & Mutation"], ["YouTube Shorts", "9:16 · 45–60 sec", "Crops the slide, zooms into table regions, larger captions, restructures the explanation"], ["Instagram Reel", "9:16 · 30–60 sec", "Strongest hook, fastest explanation, visual changes, concise payoff"], ["LinkedIn", "Video + post", "Genetic algorithms borrow an idea from evolution: solutions improve through selection, crossover and mutation."]];
const SUGGESTIONS: [string, string][] = [["Remove 4.2 sec pause", "Long silence"], ["Zoom into fitness table", "Important visual"], ["Shorten intro", "Low retention potential"], ["Highlight f(x) = x²", "Key concept"], ["Remove repeated explanation", "Duplicate content"]];
const LEARNING: [string, string][] = [["Rejects background music", "Prefers educational videos without background music"], ["Deletes a long intro", "Prefers shorter introductions"], ["Increases caption size", "Prefers large captions for technical content"], ["Repeatedly picks curiosity hooks", "Prefers curiosity-driven openings"]];
const FINAL_DNA: [string, string][] = [["Content", "Educational / Technical"], ["Pacing", "Medium → Fast"], ["Hooks", "Curiosity + Problem"], ["Captions", "Large, keyword-focused"], ["Visuals", "Zoom important content, highlight equations"], ["B-roll", "Low"], ["Music", "Minimal / None"], ["CTA", "Minimal"], ["Structure", "Hook → Explanation → Example → Result"]];

const TABS = ["Understand", "Moments", "Creator DNA", "AI edit", "Hooks & captions", "Platforms", "Content pack", "Review", "Learning"] as const;
type Tab = (typeof TABS)[number];

function Rows({ rows }: { rows: [string, string][] }) {
  return <dl className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2">{rows.map(([k, v]) => <div key={k} className="bg-surface px-4 py-3"><dt className="text-xs text-muted">{k}</dt><dd className="font-medium">{v}</dd></div>)}</dl>;
}
const H = ({ children }: { children: React.ReactNode }) => <h3 className="t-label mb-3 mt-8 text-muted first:mt-0">{children}</h3>;
const Chips = ({ items }: { items: string[] }) => <ul className="flex flex-wrap gap-2">{items.map((i) => <li key={i} className="chip px-3 py-1.5">{i}</li>)}</ul>;

export function LectureReport({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("Understand");
  const [added, setAdded] = useState<string[]>([]);
  const [done, setDone] = useState<string[]>([]);
  const toast = useStore((s) => s.toast);
  return (
    <Overlay open={open} onClose={onClose} full labelledBy="lr-h">
      <div className="mx-auto max-w-5xl px-5 pb-16 pt-20 md:px-10">
        <p className="t-label text-muted">AI report · Lecture</p>
        <h2 id="lr-h" className="t-h1">Genetic Algorithm Solved Example</h2>
        <p className="mt-2 text-sm text-muted">Built from part1 + part2 + part3 · 12:38 · educational screen recording. Timestamps marked “~” are estimates.</p>
        <div role="tablist" aria-label="Report sections" className="no-scrollbar mt-6 flex gap-2 overflow-x-auto pb-1">
          {TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={clsx("chip shrink-0 px-4 py-1.5", tab === t && "border-brand bg-brand text-brand-ink")}>{t}</button>)}
        </div>
        <div className="mt-6" role="tabpanel">
          {tab === "Understand" && (<>
            <H>Video information</H><Rows rows={INFO} />
            <p className="mt-4 rounded-xl border border-line p-4 text-sm">This video appears to be an educational walkthrough of a Genetic Algorithm example. It explains the process step by step using presentation slides and numerical tables.</p>
            <H>AI status</H><Rows rows={STATUS} />
            <H>Topic</H><p className="font-medium">Genetic Algorithm: Solved Example</p>
            <p className="mt-1 text-sm text-muted">Shows how a genetic algorithm maximises f(x) = x² using selection, fitness calculation, crossover and mutation.</p>
            <H>Detected sections</H>
            <ol className="grid gap-px overflow-hidden rounded-xl border border-line bg-line">{SECTIONS.map(([t, s]) => <li key={s} className="flex gap-4 bg-surface px-4 py-3"><span className="w-14 font-mono text-sm text-muted">{t}</span><span>{s}</span></li>)}</ol>
            <H>Topics detected</H><Chips items={TOPICS} />
            <H>Visual elements detected</H><Chips items={VISUALS} />
            <H>Key statement</H><p className="rounded-xl border border-line p-4 text-sm">“Consider the function of maximising the function f(x) = x².” Used later for hooks and clips.</p>
          </>)}
          {tab === "Moments" && (<ul className="grid gap-4">{MOMENTS.map((m) => (
            <li key={m.n} className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-display text-xl">{m.n} · {m.title}</p><span className="font-mono text-sm text-muted">{m.t}</span></div>
              <p className="mt-2 text-sm">{m.text}</p><p className="mt-1 text-xs text-muted">Why it’s useful: {m.why}</p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">{m.s.map((v, i) => <div key={i} className="rounded-lg bg-sunken px-2 py-1.5"><dt className="text-muted">{SCORE_LABELS[i]}</dt><dd className="font-semibold">{v.toFixed(1)}/10</dd></div>)}</dl>
              <button className="btn-ghost mt-3 py-1.5" aria-pressed={added.includes(m.n)} onClick={() => { setAdded((a) => (a.includes(m.n) ? a.filter((x) => x !== m.n) : [...a, m.n])); toast(added.includes(m.n) ? "Removed from video" : "Added to video", m.title); }}>{added.includes(m.n) ? "✓ Added" : "+ Add to video"}</button>
            </li>))}</ul>)}
          {tab === "Creator DNA" && (<>
            <H>Creator DNA detected</H><Rows rows={DNA} />
            <p className="mt-4 text-sm">Creator DNA confidence: <b>62%</b></p>
            <div className="mt-2 h-2 max-w-sm overflow-hidden rounded-full bg-sunken"><div className="h-full w-[62%] rounded-full bg-brand" /></div>
            <p className="mt-3 text-sm text-muted">CreatorAI is still learning your style. Upload more videos to improve personalisation.</p>
          </>)}
          {tab === "AI edit" && (<>
            <H>Recommended Short · Genetic Algorithm Explained in 60 Seconds</H>
            <ol className="grid gap-2">{STRUCTURE.map((s, i) => <li key={s} className="flex gap-3 rounded-xl border border-line px-4 py-3 text-sm"><span className="font-mono text-muted">{i + 1}</span>{s}</li>)}</ol>
            <H>AI editing decisions (based on your Creator DNA)</H><Rows rows={DECISIONS} />
            <p className="mt-3 text-sm text-muted">Technical screen recording: no face tracking, no aggressive jump cuts, no random B-roll.</p>
            <H>Before → AI recommendation</H>
            <p className="mb-3 text-sm">12:38 full tutorial → <b>3 Shorts + 1 main video</b></p>
            <ul className="grid gap-2">{OUTPUTS.map(([a, b, c]) => <li key={a} className="card flex flex-wrap justify-between gap-2 p-4 text-sm"><span><b>{a}</b> · {b}</span><span className="text-muted">{c}</span></li>)}</ul>
          </>)}
          {tab === "Hooks & captions" && (<>
            <H>Caption preview</H>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-line p-4 text-sm"><p className="text-xs text-muted">Original speech</p>“Consider the function of maximising the function f of x equals x squared.”</div>
              <div className="rounded-xl bg-text p-4 text-bg"><p className="text-xs opacity-70">CreatorAI caption</p><p className="font-display text-xl leading-tight">MAXIMISE<br />f(x) = x²</p></div>
              <div className="rounded-xl bg-text p-4 text-bg sm:col-span-2"><p className="font-display text-xl leading-tight">THE GOAL:<br />FIND THE INDIVIDUAL<br />WITH THE HIGHEST FITNESS</p></div>
            </div>
            <div className="mt-3"><Rows rows={[["Readability", "Good"], ["Technical terminology", "High"], ["Caption density", "Medium"], ["Important terms detected", "14"], ["Suggested highlighted terms", "8"]]} /></div>
            <button className="btn-ghost mt-3 py-1.5" onClick={() => toast("Creator style applied", "Large technical keywords")}>Apply Creator Style</button>
            <H>Hook ideas</H>
            <ul className="grid gap-2">{HOOKS.map(([k, t, s]) => <li key={k} className="card flex flex-wrap items-center justify-between gap-2 p-4 text-sm"><span><span className="text-xs text-muted">{k}</span><br />“{t}”</span><span className="flex items-center gap-3"><b>{s}/10</b><button className="btn-ghost py-1.5" onClick={() => toast("Hook chosen", t)}>Use hook</button></span></li>)}</ul>
          </>)}
          {tab === "Platforms" && (<ul className="grid gap-3">{PLATFORMS.map(([p, f, d]) => <li key={p} className="card p-5 text-sm"><p className="font-display text-xl">{p}</p><p className="text-muted">{f}</p><p className="mt-2">{d}</p>{p === "LinkedIn" && <button className="btn-ghost mt-3 py-1.5" onClick={() => toast("LinkedIn version created", "Video + post")}>Create LinkedIn version</button>}</li>)}</ul>)}
          {tab === "Content pack" && (<>
            <H>Title ideas</H><ul className="grid gap-1.5 text-sm">{["Genetic Algorithm Solved Example", "Genetic Algorithms Explained with a Simple Example", "Selection, Crossover & Mutation Explained"].map((t) => <li key={t} className="rounded-xl border border-line px-4 py-2">{t}</li>)}</ul>
            <H>Chapters</H><ol className="grid gap-1 text-sm">{SECTIONS.slice(0, 6).map(([t, s]) => <li key={s}><span className="mr-3 font-mono text-muted">{t}</span>{s}</li>)}</ol>
            <H>Thumbnail ideas</H>
            <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-text p-5 text-bg"><p className="font-display text-2xl leading-tight">GENETIC ALGORITHM<br />SOLVED!</p><p className="text-sm opacity-80">with f(x) = x²</p></div><div className="rounded-xl bg-text p-5 text-bg"><p className="font-display text-2xl leading-tight">HOW DOES<br />AI EVOLVE?</p></div></div>
            <H>Social post</H><p className="rounded-xl border border-line p-4 text-sm">Genetic algorithms can solve optimisation problems by repeatedly selecting, combining and mutating candidate solutions.</p>
            <button className="btn-ghost mt-3 py-1.5" onClick={() => toast("More ideas generated")}>Generate more</button>
          </>)}
          {tab === "Review" && (<ul className="grid gap-2">{SUGGESTIONS.map(([s, r]) => <li key={s} className="card flex flex-wrap items-center justify-between gap-2 p-4 text-sm"><span><b>{s}</b><br /><span className="text-muted">{r}</span></span><button className="btn-ghost py-1.5" aria-pressed={done.includes(s)} onClick={() => setDone((d) => (d.includes(s) ? d : [...d, s]))}>{done.includes(s) ? "✓ Accepted" : "Accept"}</button></li>)}</ul>)}
          {tab === "Learning" && (<>
            <H>What CreatorAI learns from your choices</H>
            <ul className="grid gap-2">{LEARNING.map(([a, b]) => <li key={a} className="card p-4 text-sm"><span className="text-muted">{a}</span><br />→ <b>{b}</b></li>)}</ul>
            <H>Creator DNA after this video</H><Rows rows={FINAL_DNA} />
          </>)}
        </div>
      </div>
    </Overlay>
  );
}
