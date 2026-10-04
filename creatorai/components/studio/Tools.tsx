"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { personaliseCaptions, preferredTone, styleBrief } from "@/lib/creatorDna";
import { Check, Copy, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import clsx from "clsx";
import captionsFx from "@/fixtures/captions.json";
import home from "@/fixtures/home.json";
import { Overlay } from "@/components/ui/Overlay";
import { Badge, Poster, Skeleton } from "@/components/ui/bits";
import { CoverFit } from "@/components/ui/ReelMedia";
import { mineVideoFrames, minePhotos, type MinedFrame } from "@/lib/frameMine";
import { fmtTime, totalDur } from "@/lib/projects";
import { captionService } from "@/lib/services";
import type { CaptionOption } from "@/lib/services/types";
import type { Project, ThumbSpec } from "@/lib/types";

/** Caption/hashtag/thumbnail-text set for a fixed-video project. */
const reelFx = (p: Project) => (p.groupId === "lecture-merge" ? captionsFx.lecture : p.groupId === "vlog-merge" ? captionsFx.vlog : captionsFx.photoReel);

/* ───────────── Thumbnail rendering (tokens only) ───────────── */
export function ThumbCard({ hue, frame, text, template, cutout = true, badge, className, url }: { hue: number; frame: number; text: string; template: ThumbSpec["template"]; cutout?: boolean; badge?: string; className?: string; url?: string }) {
  return (
    <Poster seed={hue * 3 + frame} className={clsx("aspect-video w-full", className)} label={`Thumbnail: ${text}`}>
      {url && <CoverFit src={url} className="absolute inset-0 h-full w-full" />}
      {template === "blur" && <div className="absolute inset-0 backdrop-blur-sm bg-bg/10" />}
      {template === "brand" && <div className="absolute inset-x-0 bottom-0 h-[34%] bg-brand/90" />}
      {cutout && (
        <div className="absolute bottom-0 right-[8%] h-[88%] w-[38%]" aria-hidden="true">
          <div className="absolute left-1/2 top-[6%] h-[38%] w-[58%] -translate-x-1/2 rounded-full bg-bg" style={{ boxShadow: "0 0 0 2px rgb(var(--text) / .85), 0 14px 18px rgb(var(--text) / .35)" }} />
          <div className="absolute bottom-0 left-0 right-0 h-[52%] rounded-t-[50%] bg-bg" style={{ boxShadow: "0 0 0 2px rgb(var(--text) / .85)" }} />
        </div>
      )}
      <div className={clsx("absolute left-[5%] font-display font-extrabold uppercase leading-[0.95] tracking-tight text-brand-ink", template === "bold" ? "top-[10%] w-[60%] text-[clamp(1.1rem,4.4cqw,2.4rem)]" : "bottom-[8%] w-[56%] text-[clamp(.9rem,3.4cqw,1.8rem)]")}
        style={{ textShadow: "0 2px 0 rgb(var(--text) / .6), 0 0 14px rgb(var(--text) / .35)", containerType: "inline-size" }}>{text}</div>
      <div className="absolute inset-0 opacity-30 mix-blend-multiply" style={{ background: "radial-gradient(120% 120% at 50% 40%, transparent 55%, rgb(var(--text) / .7))" }} aria-hidden="true" />
      {badge && <span className="absolute bottom-1.5 right-1.5 rounded bg-text/85 px-1.5 text-[10px] font-semibold text-bg">{badge}</span>}
    </Poster>
  );
}

// Shared with POST /api/v1/thumbnails/score (BACKEND-SLOT(thumb-score)): one heuristic, same numbers in browser and server.
export { clickReadiness } from "@/lib/thumbScore";
import { clickReadiness } from "@/lib/thumbScore";
/* ───────────── Thumbnail modal ───────────── */
export function ThumbnailModal({ open, onClose, project, onUse }: { open: boolean; onClose: () => void; project: Project; onUse: (t: ThumbSpec) => void }) {
  const frames = Array.from({ length: 6 }, (_, i) => ({ i, t: +((totalDur(project.timeline) / 6) * i + 0.5).toFixed(1), face: [92, 71, 84, 63, 88, 77][i], sharp: [88, 80, 91, 70, 85, 82][i] }));
  const reel = project.reel;
  const thumbTexts = reel ? reelFx(project).thumbText : captionsFx.thumbText;
  const [mined, setMined] = useState<{ video: MinedFrame[]; photos: MinedFrame[] } | null>(null);
  const [mineErr, setMineErr] = useState(false);
  const [pick, setPick] = useState<MinedFrame | undefined>(project.thumb?.url ? { id: "saved", t: 0, score: project.thumb.score, face: 72, sharp: 72, source: project.thumb.source ?? "video", url: project.thumb.url } : undefined);
  const tu = reel ? pick?.url : undefined;
  const stepIds = reel ? [0, 2, 3] : [0, 1, 2, 3];
  const best = mined ? [...mined.video, ...mined.photos].sort((a, b) => b.score - a.score)[0] : undefined;
  const seg = project.timeline[0];
  useEffect(() => {
    if (!open || !reel || mined) return;
    const ac = new AbortController();
    const from = seg?.in ?? 0, to = from + (seg?.dur ?? reel.durationSec);
    setMineErr(false);
    Promise.all([
      mineVideoFrames(reel.video, from, to, 0.5, ac.signal).catch(() => [] as MinedFrame[]),
      minePhotos(Array.from({ length: project.photos || 0 }, (_, i) => `/demo/${project.groupId}/photos/thumbs/p${i + 1}.jpg`)),
    ]).then(([video, photos]) => {
      if (ac.signal.aborted) return;
      if (!video.length && !photos.length) { setMineErr(true); return; }
      const photosFull = photos.map((p) => ({ ...p, url: p.url.replace("/thumbs/", "/") }));
      setMined({ video: video.slice(0, 6), photos: photosFull });
      setPick((cur) => cur ?? [...video.slice(0, 6), ...photosFull].sort((a, b) => b.score - a.score)[0]);
    });
    return () => ac.abort();
  }, [open, reel, mined, seg, project.photos, project.groupId]);
  const [step, setStep] = useState(0);
  const [frame, setFrame] = useState(project.thumb?.frame ?? 0);
  const [cutout, setCutout] = useState<"idle" | "working" | "done">("idle");
  const [template, setTemplate] = useState<ThumbSpec["template"]>(project.thumb?.template ?? "brand");
  const [text, setText] = useState(project.thumb?.text ?? thumbTexts[0]);
  useEffect(() => { if (open) setStep(project.thumb ? 3 : 0); }, [open, project.thumb]);
  useEffect(() => {
    if (cutout !== "working") return;
    const t = setTimeout(() => setCutout("done"), 1400);
    return () => clearTimeout(t);
  }, [cutout]);

  const r = clickReadiness({ text, frameFace: reel ? (pick?.face ?? 70) : frames[frame].face, cutout: !reel && (cutout === "done" || !!project.thumb), template });
  const steps = ["Pick a frame", "Cut out", "Style", "Words"];
  const dur = fmtTime(totalDur(project.timeline));
  const showCut = !reel && (cutout === "done" || !!project.thumb);
  return (
    <Overlay open={open} onClose={onClose} full labelledBy="th-h">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 pb-16 pt-20 md:px-10 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <h2 id="th-h" className="t-h1">Make a thumbnail</h2>
          <ol className="mt-6 flex gap-2" aria-label="Steps">
            {stepIds.map((i, n) => (<li key={i}><button onClick={() => setStep(i)} aria-current={step === i} className={clsx("chip px-4 py-1.5", step === i && "border-brand bg-brand text-brand-ink", i < step && "border-ok text-ok")}>{i < step && <Check size={12} />}{n + 1}. {steps[i]}</button></li>))}
          </ol>
          <div className="mt-6">
            {step === 0 && reel && (
              <div className="grid gap-5">
                <p className="text-sm text-muted">We looked at your reel every half second and at your photos, and scored each still for sharpness, light and faces. These are real pixels, nothing is generated.</p>
                {mineErr && <p role="alert" className="rounded-xl border border-warn/40 bg-warn/10 p-3 text-sm">Couldn’t read the video, showing your photos only.</p>}
                {!mined && !mineErr && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-busy="true">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="aspect-video w-full rounded-xl" />)}</div>}
                {mined && ([["From your reel", mined.video], ["Your photos", mined.photos]] as const).map(([title, list]) => list.length > 0 && (
                  <div key={title}>
                    <p className="t-label mb-2 text-muted">{title}</p>
                    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {list.slice(0, title === "Your photos" ? 18 : 6).map((c) => (
                        <li key={c.id}>
                          <button onClick={() => setPick(c)} aria-pressed={pick?.id === c.id} className={clsx("relative block w-full overflow-hidden rounded-xl border-2 text-left", pick?.id === c.id ? "border-brand" : "border-transparent")}>
                            <ThumbCard hue={project.hue} frame={0} url={c.url} text="" template="blur" cutout={false} badge={c.source === "video" ? `${c.t}s` : undefined} />
                            {best?.id === c.id && <span className="absolute left-1.5 top-1.5 rounded bg-brand px-1.5 text-[10px] font-semibold text-brand-ink">Recommended</span>}
                            <div className="flex justify-between px-2 py-1.5 text-xs text-muted"><span>face {c.face}</span><span>sharp {c.sharp}</span></div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
            {step === 0 && !reel && (
              <div>
                <p className="mb-3 text-sm text-muted">We picked the sharpest, most expressive moments from your own video. Real frames keep the click honest.</p>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {frames.map((f) => (
                    <li key={f.i}>
                      <button onClick={() => setFrame(f.i)} aria-pressed={frame === f.i} className={clsx("block w-full overflow-hidden rounded-xl border-2 text-left", frame === f.i ? "border-brand" : "border-transparent")}>
                        <ThumbCard hue={project.hue} frame={f.i} text="" template="blur" cutout badge={`${f.t}s`} />
                        <div className="flex justify-between px-2 py-1.5 text-xs text-muted"><span>face {f.face}</span><span>sharp {f.sharp}</span></div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {step === 1 && (
              <div className="grid gap-4">
                <p className="text-sm text-muted">We lift you out of the frame right here on your device. The background stays a still from your video, and we never invent your face.</p>
                <div className="relative max-w-xl overflow-hidden rounded-2xl">
                  <ThumbCard hue={project.hue} url={tu} frame={frame} text="" template="blur" cutout={cutout === "done"} />
                  {cutout === "working" && <motion.div className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-brand/60 to-transparent" initial={{ left: "-33%" }} animate={{ left: "100%" }} transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }} />}
                </div>
                <button className="btn-brand w-fit" disabled={cutout === "working"} onClick={() => setCutout("working")}>{cutout === "done" ? <><Check size={16} />Cutout ready, redo</> : cutout === "working" ? "Removing background…" : "Remove background"}</button>
              </div>
            )}
            {step === 2 && (
              <div>
                <p className="mb-3 text-sm text-muted">Pick a look. Your fonts, colours and logo stay the same so people start to recognise you.</p>
                <ul className="grid gap-3 sm:grid-cols-3">
                  {(["brand", "blur", "bold"] as const).map((t) => (
                    <li key={t}><button onClick={() => setTemplate(t)} aria-pressed={template === t} className={clsx("block w-full overflow-hidden rounded-xl border-2", template === t ? "border-brand" : "border-transparent")}>
                      <ThumbCard hue={project.hue} url={tu} frame={frame} text={text} template={t} cutout={showCut} /><div className="px-2 py-1.5 text-left text-xs capitalize text-muted">{t}</div></button></li>
                  ))}
                </ul>
              </div>
            )}
            {step === 3 && (
              <div className="grid gap-4">
                <label htmlFor="th-text" className="t-label text-muted">Words on the thumbnail (3–4 words works best)</label>
                <input id="th-text" className="input" value={text} onChange={(e) => setText(e.target.value.toUpperCase())} maxLength={40} />
                <div className="flex flex-wrap gap-2">{thumbTexts.map((t) => <button key={t} className="chip px-3 py-1.5 hover:bg-sunken" onClick={() => setText(t)}><Sparkles size={12} />{t}</button>)}</div>
              </div>
            )}
          </div>
          <div className="mt-8 flex gap-2">
            {step > 0 && <button className="btn-ghost" onClick={() => setStep(stepIds[Math.max(0, stepIds.indexOf(step) - 1)])}>Back</button>}
            {step < 3 && <button className="btn-primary" onClick={() => setStep(stepIds[stepIds.indexOf(step) + 1])}>Next</button>}
          </div>
        </div>

        <aside className="lg:col-span-2" aria-label="Preview and click-readiness">
          <div className="sticky top-6 grid gap-5">
            <ThumbCard hue={project.hue} url={tu} frame={frame} text={text} template={template} cutout={showCut} badge={dur} className="rounded-2xl border border-line" />
            <div className="card p-5">
              <div className="flex items-center justify-between"><span className="t-label text-muted">Click appeal <span className="normal-case">(our estimate)</span></span><span className="font-display text-3xl">{r.score}</span></div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-sunken" role="meter" aria-valuenow={r.score} aria-valuemin={0} aria-valuemax={100} aria-label="Click appeal">
                <motion.div className={clsx("h-full rounded-full", r.score >= 80 ? "bg-ok" : r.score >= 60 ? "bg-warn" : "bg-bad")} animate={{ width: `${r.score}%` }} />
              </div>
              <ul className="mt-4 grid gap-1.5 text-xs">{r.checks.map((c) => <li key={c.id} className={c.pass ? "text-muted" : "text-warn"}>{c.pass ? "✓" : "!"} {c.tip}</li>)}</ul>
            </div>
            <div className="card p-5">
              <p className="t-label mb-3 text-muted">How it looks on a phone</p>
              <div className="flex gap-4">
                <div className="rounded-lg bg-bg p-2"><div className="w-[120px]"><ThumbCard hue={project.hue} url={tu} frame={frame} text={text} template={template} cutout={showCut} badge={dur} className="rounded-md" /></div></div>
                <div className="rounded-lg bg-text p-2"><div className="w-[120px]"><ThumbCard hue={project.hue} url={tu} frame={frame} text={text} template={template} cutout={showCut} badge={dur} className="rounded-md" /></div></div>
              </div>
              <p className="mt-3 text-xs text-muted">Not generated by AI. For A/B tests use YouTube's native Test &amp; Compare, we don't fake results.</p>
            </div>
            <button className="btn-brand" disabled={!!reel && !pick} onClick={() => { onUse({ id: `th_${Date.now()}`, frame, text, template, score: r.score, ...(reel && pick ? { url: pick.url, source: pick.source } : {}) }); onClose(); }}>Use this thumbnail</button>
          </div>
        </aside>
      </div>
    </Overlay>
  );
}

/* ───────────── Captions drawer ───────────── */
export function CaptionsDrawer({ open, onClose, project, onUse }: { open: boolean; onClose: () => void; project: Project; onUse: (c: NonNullable<Project["caption"]>) => void }) {
  const dna = useStore((s) => s.creatorDNA);
  const [tone, setTone] = useState<string>(() => preferredTone(useStore.getState().creatorDNA));
  const [platform, setPlatform] = useState("ig_reel");
  const [opts, setOpts] = useState<CaptionOption[] | null>(null);
  const [source, setSource] = useState<"live" | "demo">("demo");
  const [copied, setCopied] = useState<string | null>(null);
  const tags = project.reel ? { ...home.trending.hashtags, ...reelFx(project).hashtags } : home.trending.hashtags;

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setOpts(null);
    (project.reel
      ? new Promise<{ options: CaptionOption[]; source: "demo" }>((res) => setTimeout(() => { const m = reelFx(project).options as Record<string, CaptionOption[]>; res({ options: m[tone] ?? m.witty, source: "demo" }); }, 700))
      : captionService.suggest({ tone, platform, topic: project.title, style: styleBrief(dna) })).then((r) => { if (alive) { setOpts(personaliseCaptions(r.options, dna)); setSource(r.source); } });
    return () => { alive = false; };
  }, [open, tone, platform, project.title, project.reel, dna]);

  const limit = platform === "x" ? 280 : platform === "linkedin" ? 3000 : 2200;
  const copy = (id: string, text: string) => { navigator.clipboard?.writeText(text).catch(() => undefined); setCopied(id); setTimeout(() => setCopied(null), 1400); };
  const chosenTags = [...project.hashtags, ...tags.trending.slice(0, 1)];
  return (
    <Overlay open={open} onClose={onClose} labelledBy="cap-h" width="max-w-lg">
      <div className="p-6 pt-20 md:p-8 md:pt-20">
        <h2 id="cap-h" className="t-h2">Captions</h2>
        <p className="mt-1 text-sm text-muted">Choose a style, then pick the one you like. Matched to your Creator DNA.</p>
        <div className="mt-5 flex flex-wrap gap-2" role="radiogroup" aria-label="Tone">
          {captionsFx.tones.map((t) => <button key={t} role="radio" aria-checked={tone === t} onClick={() => setTone(t)} className={clsx("chip px-4 py-1.5 text-sm capitalize", tone === t && "border-brand bg-brand text-brand-ink")}>{t === "pro" ? "professional" : t}</button>)}
        </div>
        <label className="t-label mt-5 block text-muted" htmlFor="cap-pl">Where it’s going</label>
        <select id="cap-pl" className="input mt-2" value={platform} onChange={(e) => setPlatform(e.target.value)}>
          <option value="ig_reel">Instagram Reel</option><option value="yt_short">YouTube Short</option><option value="linkedin">LinkedIn</option><option value="x">X</option>
        </select>
        <div className="mt-6 flex items-center justify-between"><h3 className="t-label text-muted">Pick one</h3>{opts && <Badge tone={source === "live" ? "brand" : "muted"}>Suggested by CreatorAI</Badge>}</div>
        <ul className="mt-3 grid gap-3" aria-live="polite">
          {!opts && [0, 1, 2].map((i) => <li key={i}><Skeleton className="h-28" /></li>)}
          {opts?.map((o) => {
            const on = project.caption?.id === o.id && project.caption.tone === tone;
            const full = `${o.caption}\n\n${o.cta}\n${chosenTags.join(" ")}`;
            return (
              <motion.li key={o.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={clsx("card p-4", on && "border-brand")}>
                <p className="text-sm leading-relaxed">{o.caption}</p>
                <p className="mt-2 text-xs text-muted">Ending line: {o.cta}</p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className={clsx("text-xs", o.caption.length > limit ? "text-bad" : "text-muted")}>{o.caption.length}/{limit}</span>
                  <div className="flex gap-2">
                    <button className="btn-ghost py-1.5" onClick={() => copy(o.id, full)} aria-label="Copy caption">
                      <AnimatePresence mode="wait" initial={false}><motion.span key={copied === o.id ? "y" : "n"} initial={{ scale: 0.4, rotate: -30 }} animate={{ scale: 1, rotate: 0 }}>{copied === o.id ? <Check size={14} /> : <Copy size={14} />}</motion.span></AnimatePresence>
                    </button>
                    <button className="btn-primary py-1.5" onClick={() => { onUse({ id: o.id, caption: o.caption, cta: o.cta, tone, hashtags: chosenTags }); onClose(); }}>{on ? "Selected ✓" : "Use this"}</button>
                  </div>
                </div>
              </motion.li>
            );
          })}
        </ul>
        {!project.reel && <>
          <h3 className="t-label mt-8 text-muted">Opening ideas</h3>
          <ul className="mt-3 grid gap-1.5">{captionsFx.hooks.slice(0, 3).map((h) => <li key={h.text} className="flex items-center justify-between rounded-xl border border-line px-3 py-2 text-sm"><span>{h.text}</span><span className="chip py-0.5">{h.style} · {h.score}</span></li>)}</ul>
        </>}
        <h3 className="t-label mt-8 text-muted">Hashtags</h3>
        {(["niche", "broad", "trending"] as const).map((k) => (
          <div key={k} className="mt-3"><div className="mb-1 text-xs capitalize text-muted">{k}</div><div className="flex flex-wrap gap-1.5">{tags[k].map((t) => <span key={t} className="chip">{t}</span>)}</div></div>
        ))}
        <div className="mt-3"><div className="mb-1 text-xs text-bad">Avoid (spammy)</div><div className="flex flex-wrap gap-1.5">{tags.avoid.map((t) => <span key={t} className="chip border-bad/40 text-bad line-through">{t}</span>)}</div></div>
      </div>
    </Overlay>
  );
}
