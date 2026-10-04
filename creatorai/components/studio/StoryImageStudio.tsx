"use client";
import { Check, Download, Redo2, RotateCcw, Save, ShieldCheck, Undo2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { profanityIn } from "@/lib/compliance/analyze";
import { relTime } from "@/lib/projects";
import { STORY_CLEANED, STORY_CONTENT, STORY_ORIGINAL } from "@/lib/storyImage";
import { useStore } from "@/lib/store";
import type { Project } from "@/lib/types";

interface Fx { title: string; text: string; textApplied: boolean; blurApplied: boolean }
const DEFAULT_FX: Fx = { title: STORY_CONTENT.titles[0], text: STORY_CONTENT.profanity.options[0], textApplied: true, blurApplied: true };
const chip = (on: boolean) => clsx("chip px-3 py-1.5 text-xs", on && "border-brand bg-brand text-brand-ink");
const head = "text-xs font-semibold uppercase tracking-[0.14em] text-muted";
const panel = "rounded-[24px] border border-text/10 bg-surface p-4";

export function StoryImageStudio({ project }: { project: Project }) {
  const router = useRouter();
  const patch = useStore((s) => s.patchProject);
  const toast = useStore((s) => s.toast);
  const key = `creatorai-storyfx-${project.id}`;
  const [fx, setFx] = useState<Fx>(DEFAULT_FX);
  const [past, setPast] = useState<Fx[]>([]);
  const [future, setFuture] = useState<Fx[]>([]);
  const [view, setView] = useState<"cleaned" | "original">("cleaned");
  const [checks, setChecks] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => { try { const v = localStorage.getItem(key); if (v) setFx({ ...DEFAULT_FX, ...(JSON.parse(v) as Fx) }); } catch { /* storage unavailable */ } }, [key]);
  const change = (next: Partial<Fx>) => {
    setPast((p) => [...p.slice(-30), fx]); setFuture([]);
    const n = { ...fx, ...next }; setFx(n);
    try { localStorage.setItem(key, JSON.stringify(n)); } catch { /* storage unavailable */ }
    patch(project.id, { updatedAt: new Date().toISOString() });
  };
  const jump = (to: Fx, from: Fx[], setFrom: (f: Fx[]) => void, other: Fx[], setOther: (f: Fx[]) => void) => { setOther([...other, fx]); setFrom(from); setFx(to); try { localStorage.setItem(key, JSON.stringify(to)); } catch { /* storage unavailable */ } };
  const undo = () => past.length && jump(past[past.length - 1], past.slice(0, -1), setPast, future, setFuture);
  const redo = () => future.length && jump(future[future.length - 1], future.slice(0, -1), setFuture, past, setPast);

  const { profanity: P, institution: I } = STORY_CONTENT;
  const edits = Number(fx.textApplied) + Number(fx.blurApplied);
  const newProfanity = fx.textApplied && profanityIn(fx.text).length > 0;
  const showOriginal = view === "original";
  // original image carries the profane text; the cleaned image has the name blurred and no text
  const base = showOriginal || !fx.textApplied ? STORY_ORIGINAL : STORY_CLEANED;
  const blurRect = !showOriginal && fx.blurApplied && base === STORY_ORIGINAL;
  const overlay = !showOriginal && fx.textApplied ? fx.text : "";

  const allGreen = fx.textApplied && !newProfanity && fx.blurApplied;
  const save = () => { patch(project.id, { updatedAt: new Date().toISOString() }); toast("Saved"); };
  const reset = () => { change({ ...DEFAULT_FX }); setView("cleaned"); toast("Back to the AI clean version"); };
  const exportIt = () => { if (exporting) return; setExporting(true); setTimeout(() => { setExporting(false); toast("Story exported", "Clean version saved"); }, 1800); };
  const done = () => { const clipId = project.clipId ?? `clip_${project.id}`; patch(project.id, { clipId, status: "In review" }); router.push(`/review/${clipId}`); };

  const Item = ({ label, from, to, applied, onToggle, ok }: { label: string; from: string; to: string; applied: boolean; onToggle: () => void; ok: string }) => (
    <div className="rounded-2xl border border-line p-3">
      <p className={head}>{label}</p>
      <p className="mt-2 text-xs text-muted line-through decoration-bad/60">{from}</p>
      <p className="mt-1 font-display text-lg leading-tight tracking-tight">→ {to}</p>
      <p className="mt-1 flex items-center gap-1 text-xs text-ok"><Check size={12} />{ok}</p>
      <button type="button" className={clsx("mt-2 w-full py-2 text-sm", applied ? "btn-ghost" : "btn-primary")} onClick={onToggle}>{applied ? <><Check size={14} />Applied</> : "Apply"}</button>
    </div>
  );

  return (
    <div className="mx-auto max-w-[1700px]">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link href="/studio" className="text-sm text-muted hover:text-text">← Back to Studio</Link>
          <h1 className="mt-1 font-display text-3xl tracking-tight md:text-4xl">Story: College Day</h1>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted">Edited {relTime(project.updatedAt)}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn-ghost h-10 w-10 p-0" onClick={undo} disabled={!past.length} aria-label="Undo"><Undo2 size={16} /></button>
          <button className="btn-ghost h-10 w-10 p-0" onClick={redo} disabled={!future.length} aria-label="Redo"><Redo2 size={16} /></button>
          <button className="btn-brand" aria-expanded={checks} onClick={() => setChecks((v) => !v)}><ShieldCheck size={16} />Final checks</button>
          <button className="btn-ghost" onClick={reset}><RotateCcw size={16} />Reset</button>
          <span className="mx-1 hidden h-6 w-px bg-line md:block" />
          <button className="btn-ghost" onClick={save}><Save size={16} />Save</button>
          <button className="btn-ghost" onClick={exportIt} disabled={exporting}><Download size={16} />{exporting ? "Exporting…" : "Export"}</button>
          <button className="btn-brand" onClick={done}>Done <Check size={16} /></button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)_320px]">
        {/* YOUR CONTENT */}
        <section className="order-2 grid content-start gap-5 xl:order-1" aria-label="Your content">
          <div className={panel}>
            <p className={head}>Your content</p>
            <span className="chip mt-3 border-brand bg-brand/10 py-1.5 text-sm"><Check size={14} />Instagram Story</span>
            <label className={clsx(head, "mt-5 block")} htmlFor="story-title">Title</label>
            <input id="story-title" className="input mt-2" value={fx.title} onChange={(e) => setFx({ ...fx, title: e.target.value })} onBlur={() => change({})} />
            <div className="mt-2 flex flex-wrap gap-1.5">{STORY_CONTENT.titles.slice(1).map((t) => <button key={t} type="button" className={chip(fx.title === t)} onClick={() => change({ title: t })}>{t}</button>)}</div>
          </div>

          <div className={panel}>
            <div className="flex items-center justify-between"><p className={head}>AI review</p><span className="chip py-1 text-xs">{2} issues detected</span></div>

            <div className="mt-4 rounded-2xl border border-bad/30 bg-bad/5 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-bad">1 · Profanity detected</p>
              <p className="mt-2 text-xs text-muted">Text found in image</p>
              <p className="font-mono text-sm">{P.found}</p>
              <p className="mt-2 text-xs text-muted">Suggested action: replace the profane phrase with a cleaner alternative.</p>
              <p className="mt-3 text-xs text-muted">AI suggestions</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">{P.options.map((o, i) => <button key={o} type="button" className={chip(fx.text === o)} onClick={() => change({ text: o })}>{i === 0 ? `${o} · default` : o}</button>)}</div>
              <div className="mt-3 flex gap-2">
                <button type="button" className="btn-primary flex-1 py-2 text-sm" onClick={() => { change({ textApplied: true }); toast("Replaced", fx.text); }}>{fx.textApplied ? <><Check size={14} />In use</> : "Use suggestion"}</button>
                <button type="button" className={clsx("btn-ghost flex-1 py-2 text-sm", !fx.textApplied && "border-text")} onClick={() => change({ textApplied: false })}>Keep original</button>
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-warn/30 bg-warn/5 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-warn">2 · Institution name detected</p>
              <p className="mt-2 text-xs text-muted">Text found in image</p>
              <p className="font-mono text-sm leading-snug">{I.found}</p>
              <p className="mt-2 text-xs text-muted">Suggested action: blur the institution name before publishing.</p>
              <button type="button" className={clsx("mt-3 w-full py-2 text-sm", fx.blurApplied ? "btn-ghost" : "btn-primary")} onClick={() => change({ blurApplied: !fx.blurApplied })}>{fx.blurApplied ? <>Blur detected text <Check size={14} /></> : "Blur detected text"}</button>
            </div>
          </div>
        </section>

        {/* PREVIEW */}
        <section className="order-1 xl:order-2" aria-label="Preview">
          <div className="grid place-items-center rounded-[28px] border border-text/10 bg-sunken p-4 md:p-8">
            <div className="relative w-full max-w-[760px] overflow-hidden rounded-2xl border-[6px] border-text bg-black shadow-soft" style={{ aspectRatio: "4 / 3" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={base} alt="Story preview" className="absolute inset-0 h-full w-full object-cover" />
              {blurRect && <div aria-hidden="true" className="absolute left-0 top-[3%] h-[13%] w-[30%] rounded-md" style={{ backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", background: "rgba(255,255,255,0.15)" }} />}
              {overlay && <div className="pointer-events-none absolute inset-x-0 bottom-[5%] px-[6%] text-center font-display font-extrabold uppercase leading-none text-white" style={{ fontSize: "clamp(1.6rem, 6.5vw, 4.4rem)", textShadow: "0 3px 14px rgba(0,0,0,0.65)", letterSpacing: "0.01em" }}>{overlay}</div>}
            </div>
            <p className="mt-4 text-sm font-medium">{showOriginal ? "Original" : "Clean preview"}</p>
            <p className="text-sm text-muted">{showOriginal ? "As uploaded" : `${edits} change${edits === 1 ? "" : "s"} applied`}</p>
            <div role="radiogroup" aria-label="Preview version" className="mt-3 inline-flex gap-1 rounded-2xl border border-line bg-surface p-1 text-xs font-medium">
              {(["original", "cleaned"] as const).map((v) => <button key={v} type="button" role="radio" aria-checked={view === v} onClick={() => setView(v)} className={clsx("rounded-pill px-4 py-1.5 capitalize transition-colors", view === v ? "bg-text text-white dark:text-bg" : "text-muted hover:text-text")}>{v}</button>)}
            </div>
          </div>
        </section>

        {/* AI CLEANUP */}
        <section className="order-3 grid content-start gap-5" aria-label="AI cleanup">
          {checks && (
            <div className={panel} role="region" aria-label="Final checks">
              <div className="flex items-center justify-between"><p className={head}>Final checks</p><button type="button" className="text-muted hover:text-text" aria-label="Close final checks" onClick={() => setChecks(false)}><X size={14} /></button></div>
              {([
                ["Content", [[fx.textApplied && !newProfanity, "No profanity remains"], [!newProfanity, "No offensive text introduced"]]],
                ["Privacy", [[fx.blurApplied, "Institution name blurred"]]],
                ["Legal", [[true, "No defamatory content detected"]]],
                ["Story safety", [[allGreen, "Ready for Instagram Story"]]],
              ] as [string, [boolean, string][]][]).map(([g, rows]) => (
                <div key={g} className="mt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{g}</p>
                  {rows.map(([ok, t]) => <p key={t} className={clsx("mt-1 flex items-center gap-2 text-sm", !ok && "text-warn")}>{ok ? <Check size={14} className="text-ok" /> : <X size={14} />}{t}</p>)}
                </div>
              ))}
              <div className={clsx("mt-4 rounded-xl border p-3 text-center", allGreen ? "border-ok/40 bg-ok/10 text-ok" : "border-warn/40 bg-warn/10 text-warn")}>
                <p className="text-xs font-semibold uppercase tracking-wider">{allGreen ? "Green" : "Yellow"}</p>
                <p className="text-sm font-medium">{allGreen ? "Ready to publish" : "Apply the suggested edits to continue"}</p>
              </div>
            </div>
          )}

          <div className={panel}>
            <p className={head}>AI cleanup</p>
            <p className="mt-1 text-sm text-muted">2 suggested edits</p>
            <div className="mt-3 grid gap-3">
              <Item label="Profanity" from={P.found} to={fx.text} ok="Clean replacement" applied={fx.textApplied} onToggle={() => change({ textApplied: !fx.textApplied })} />
              <Item label="Privacy" from={I.found} to="Blur detected text" ok="Recommended" applied={fx.blurApplied} onToggle={() => change({ blurApplied: !fx.blurApplied })} />
            </div>
          </div>

          <div className={panel}>
            <p className={head}>Clean version</p>
            <p className="mt-1 text-sm font-medium">{edits} edit{edits === 1 ? "" : "s"} applied</p>
            <ul className="mt-2 grid gap-1.5 text-sm">
              <li className={clsx("flex items-center gap-2", !fx.textApplied && "text-muted")}>{fx.textApplied ? <Check size={14} className="text-ok" /> : <X size={14} />}Profane phrase replaced</li>
              <li className={clsx("flex items-center gap-2", !fx.blurApplied && "text-muted")}>{fx.blurApplied ? <Check size={14} className="text-ok" /> : <X size={14} />}Institution name blurred</li>
            </ul>
            <p className={clsx("mt-3 text-xs", newProfanity ? "text-bad" : "text-muted")}>{newProfanity ? "New profanity introduced." : "No new profanity introduced."}</p>
          </div>
        </section>
      </div>
    </div>
  );
}
