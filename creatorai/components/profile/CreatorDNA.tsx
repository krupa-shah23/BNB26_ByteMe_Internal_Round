"use client";
import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import clsx from "clsx";
import { Overlay } from "@/components/ui/Overlay";
import { HOOK_LABEL, STRUCTURES, dnaTraits } from "@/lib/creatorDna";
import { relTime } from "@/lib/projects";
import { useStore } from "@/lib/store";
import type { CreatorDNA as DNA, FeedbackType } from "@/lib/types";

type Path = string;
const get = (d: DNA, path: Path) => path.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], d);
const withValue = (d: DNA, path: Path, v: string | number): DNA => {
  const next = structuredClone(d) as unknown as Record<string, Record<string, unknown>>;
  const [a, b] = path.split(".");
  next[a][b] = v;
  return next as unknown as DNA;
};

/** Hook that applies an edit to the DNA and records the correction in the history. */
function useEdit() {
  const addFeedback = useStore((s) => s.addFeedback);
  return (path: Path, value: string | number, type: FeedbackType = "style", context = path) => {
    const st = useStore.getState();
    const before = get(st.creatorDNA, path);
    if (before === value) return;
    st.setDNA(withValue(st.creatorDNA, path, value));
    addFeedback({ type, originalValue: String(before), newValue: String(value), context });
  };
}

function Card({ title, hint, children, delay = 0 }: { title: string; hint?: string; children: React.ReactNode; delay?: number }) {
  return (
    <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.4 }} className="rounded-[24px] border border-text/10 bg-surface p-5">
      <h3 className="font-display text-xl tracking-tight">{title}</h3>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      <div className="mt-4 grid gap-4">{children}</div>
    </motion.section>
  );
}

function Dial({ label, low, high, path }: { label: string; low: string; high: string; path: Path }) {
  const dna = useStore((s) => s.creatorDNA);
  const edit = useEdit();
  const value = get(dna, path) as number;
  const [live, setLive] = useState<number | null>(null);
  const start = useRef(value);
  const shown = live ?? value;
  const commit = () => { if (live !== null) { edit(path, live, path.startsWith("editing") ? "pacing" : "style"); setLive(null); } };
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm"><span className="font-medium">{label}</span><span className="text-xs tabular-nums text-muted">{shown}</span></div>
      <input type="range" min={0} max={100} value={shown} aria-label={label}
        onPointerDown={() => { start.current = value; }} onChange={(e) => setLive(+e.target.value)} onPointerUp={commit} onKeyUp={commit} onBlur={commit}
        className="mt-1 w-full accent-[rgb(var(--brand))]" />
      <div className="flex justify-between text-[11px] text-muted"><span>{low}</span><span>{high}</span></div>
    </div>
  );
}

function Pick<T extends string>({ label, path, options }: { label: string; path: Path; options: readonly { id: T; label: string }[] }) {
  const dna = useStore((s) => s.creatorDNA);
  const edit = useEdit();
  const value = get(dna, path) as string;
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium">{label}</p>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button key={o.id} role="radio" aria-checked={value === o.id} onClick={() => edit(path, o.id)}
            className={clsx("chip px-3.5 py-1.5 text-sm transition-colors", value === o.id ? "border-brand bg-brand text-brand-ink" : "hover:bg-sunken")}>{o.label}</button>
        ))}
      </div>
    </div>
  );
}

const opts = <T extends string>(...xs: [T, string][]) => xs.map(([id, label]) => ({ id, label }));

const PAIRS: { q: string; type: FeedbackType; a: { label: string; apply: (d: DNA) => DNA }; b: { label: string; apply: (d: DNA) => DNA } }[] = [
  { q: "Which opening sounds more like you?", type: "hook",
    a: { label: "“Stop making 31-slide decks.”", apply: (d) => ({ ...d, hooks: ["contrarian", ...d.hooks.filter((h) => h !== "contrarian")].slice(0, 3) }) },
    b: { label: "“We pitched to 40 investors in 3 days…”", apply: (d) => ({ ...d, hooks: ["story", ...d.hooks.filter((h) => h !== "story")].slice(0, 3) }) } },
  { q: "Which pace feels right?", type: "pacing",
    a: { label: "Quick cuts, always moving", apply: (d) => ({ ...d, editing: { ...d.editing, pacing: Math.min(100, d.editing.pacing + 10), cuts: "tight" } }) },
    b: { label: "Room to breathe", apply: (d) => ({ ...d, editing: { ...d.editing, pacing: Math.max(0, d.editing.pacing - 10), cuts: "relaxed" } }) } },
  { q: "How should captions look?", type: "style",
    a: { label: "Big and bold", apply: (d) => ({ ...d, captions: { ...d.captions, style: "bold" } }) },
    b: { label: "Small and clean", apply: (d) => ({ ...d, captions: { ...d.captions, style: "minimal" } }) } },
];

function Refine({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [done, setDone] = useState<Record<number, "a" | "b">>({});
  const choose = (i: number, side: "a" | "b") => {
    const st = useStore.getState();
    const pair = PAIRS[i];
    const next = pair[side].apply(st.creatorDNA);
    st.setDNA(next);
    st.addFeedback({ type: pair.type, originalValue: pair.q, newValue: pair[side].label, context: `refine:${i}` });
    setDone((d) => ({ ...d, [i]: side }));
    if (Object.keys(done).length + 1 === PAIRS.length) st.toast("Style refined", "CreatorAI will use this from now on");
  };
  return (
    <Overlay open={open} onClose={() => { setDone({}); onClose(); }} side="center" width="max-w-xl" labelledBy="refine-h">
      <div className="p-8 pt-16">
        <h2 id="refine-h" className="font-display text-3xl tracking-tight">Refine my style</h2>
        <p className="mt-1 text-sm text-muted">Pick what feels more like you. It takes 20 seconds.</p>
        <div className="mt-6 grid gap-5">
          {PAIRS.map((p, i) => (
            <div key={p.q}>
              <p className="mb-2 text-sm font-medium">{p.q}</p>
              <div className="grid grid-cols-2 gap-3">
                {(["a", "b"] as const).map((side) => (
                  <button key={side} onClick={() => choose(i, side)} aria-pressed={done[i] === side}
                    className={clsx("rounded-2xl border p-4 text-left text-sm transition-colors", done[i] === side ? "border-brand bg-brand text-brand-ink" : "border-line hover:bg-sunken")}>
                    {done[i] === side && <Check size={14} className="mb-1" />}{p[side].label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <button className="btn-primary mt-8 w-full" onClick={() => { setDone({}); onClose(); }}>Done</button>
      </div>
    </Overlay>
  );
}

export function CreatorDNA() {
  const dna = useStore((s) => s.creatorDNA);
  const feedbackCount = useStore((s) => s.creatorFeedback.length);
  const edit = useEdit();
  const [refine, setRefine] = useState(false);

  return (
    <section aria-labelledby="dna-h" className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="dna-h" className="font-display text-4xl tracking-tight md:text-5xl">Your Creator DNA</h2>
          <p className="mt-2 text-muted">The more you create, the better CreatorAI understands your style.</p>
          <div className="mt-3 flex flex-wrap gap-1.5">{dnaTraits(dna, 7).map((t) => <span key={t} className="chip bg-accent/60 text-black">{t}</span>)}</div>
          <p className="mt-2 text-xs text-muted">Updated {relTime(dna.updatedAt)} · learned from {feedbackCount} of your edits</p>
        </div>
        <button className="btn-primary px-6 py-3" onClick={() => setRefine(true)}><Sparkles size={16} />Refine my style</button>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Card title="Tone" hint="How you come across" delay={0.02}>
          <Dial label="Energy" low="Calm" high="High energy" path="tone.energy" />
          <Dial label="Humour" low="Straight" high="Funny" path="tone.humour" />
          <Dial label="Formality" low="Casual" high="Professional" path="tone.formality" />
          <Dial label="Seriousness" low="Light-hearted" high="Serious" path="tone.seriousness" />
        </Card>

        <Card title="Writing style" hint="How your words sound" delay={0.06}>
          <Pick label="Sentence length" path="writing.sentenceLength" options={opts(["short", "Short"], ["medium", "Medium"], ["long", "Long"])} />
          <Pick label="Vocabulary" path="writing.vocabulary" options={opts(["simple", "Simple"], ["balanced", "Balanced"], ["rich", "Rich"])} />
          <Dial label="Directness" low="Gentle" high="Straight to the point" path="writing.directness" />
          <Pick label="Humour" path="writing.humour" options={opts(["none", "None"], ["dry", "Dry"], ["playful", "Playful"], ["sarcastic", "Sarcastic"])} />
        </Card>

        <Card title="Openings" hint="The ways you like to start" delay={0.1}>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Preferred openings">
            {Object.entries(HOOK_LABEL).map(([id, label]) => {
              const on = dna.hooks.includes(id);
              return (
                <button key={id} aria-pressed={on} onClick={() => {
                  const st = useStore.getState();
                  const next = on ? st.creatorDNA.hooks.filter((h) => h !== id) : [...st.creatorDNA.hooks, id];
                  if (!next.length) return;
                  st.setDNA({ ...st.creatorDNA, hooks: next });
                  st.addFeedback({ type: "hook", originalValue: st.creatorDNA.hooks.join(", "), newValue: next.join(", "), context: "hooks.preferred" });
                }} className={clsx("chip px-3.5 py-1.5 text-sm transition-colors", on ? "border-brand bg-brand text-brand-ink" : "hover:bg-sunken")}>{label}</button>
              );
            })}
          </div>
        </Card>

        <Card title="Storytelling" hint="How you shape a video" delay={0.14}>
          <div className="grid gap-2" role="radiogroup" aria-label="Storytelling structure">
            {STRUCTURES.map((s) => (
              <button key={s} role="radio" aria-checked={dna.storytelling.structure === s} onClick={() => edit("storytelling.structure", s)}
                className={clsx("rounded-2xl border px-4 py-3 text-left text-sm transition-colors", dna.storytelling.structure === s ? "border-brand bg-brand text-brand-ink" : "border-line hover:bg-sunken")}>{s}</button>
            ))}
          </div>
        </Card>

        <Card title="Editing" hint="The rhythm of your videos" delay={0.18}>
          <Dial label="Pacing" low="Slow" high="Fast" path="editing.pacing" />
          <Pick label="Cuts" path="editing.cuts" options={opts(["tight", "Tight"], ["natural", "Natural"], ["relaxed", "Relaxed"])} />
          <Pick label="Zooms" path="editing.zooms" options={opts(["none", "None"], ["subtle", "Subtle"], ["punchy", "Punchy"])} />
          <Pick label="Extra footage (B-roll)" path="editing.broll" options={opts(["rare", "Rarely"], ["balanced", "Sometimes"], ["frequent", "Often"])} />
          <Pick label="Silent gaps" path="editing.silence" options={opts(["trim", "Trim them"], ["keep", "Keep them"])} />
        </Card>

        <div className="grid content-start gap-5">
          <Card title="Captions and visuals" hint="How text appears on screen" delay={0.22}>
            <Pick label="Caption style" path="captions.style" options={opts(["clean", "Clean"], ["bold", "Bold"], ["minimal", "Minimal"])} />
            <Pick label="Emphasis" path="captions.emphasis" options={opts(["none", "None"], ["keywords", "Highlight key words"], ["emoji", "Emoji"])} />
            <Pick label="Position" path="captions.position" options={opts(["top", "Top"], ["centre", "Centre"], ["bottom", "Bottom"])} />
          </Card>
          <Card title="Call to action" hint="How you ask people to act" delay={0.26}>
            <Pick label="Style" path="cta.style" options={opts(["soft", "Soft"], ["direct", "Direct"], ["question", "A question"])} />
            <Pick label="How often" path="cta.frequency" options={opts(["rare", "Rarely"], ["sometimes", "Sometimes"], ["often", "Often"], ["always", "Every video"])} />
          </Card>
        </div>
      </div>
      <Refine open={refine} onClose={() => setRefine(false)} />
    </section>
  );
}
