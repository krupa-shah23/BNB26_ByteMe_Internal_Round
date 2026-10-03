"use client";
import type { PlayerRef } from "@remotion/player";
import { motion } from "framer-motion";
import { Check, Dna, Pause, Play, Plus, Redo2, RotateCcw, Save, Sparkles, Subtitles, Undo2, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import hooksFx from "@/fixtures/captions.json";
import { hookService, mode, scriptService } from "@/lib/services";
import { Badge } from "@/components/ui/bits";
import { ChecksPanel } from "./compliance/ChecksPanel";
import { BleepMarks, MonStrip, ReviewLanes, StrictBracket, type Focus, type Lane } from "./compliance/Lanes";
import { PlayerOverlay } from "./compliance/Overlays";
import { GateRow, ScoreChip } from "./compliance/ScoreChip";
import { useCompliance } from "./compliance/useCompliance";
import { captionIssues, computeAdSafe, gate, maskProfanity, profanityIn } from "@/lib/compliance/analyze";
import { moveBlur } from "@/lib/compliance/actions";
import { EdlPlayerLazy } from "./EdlPlayerLazy";
import { CaptionsDrawer, ThumbnailModal, ThumbCard } from "./Tools";
import { PROFILES, aspectDims, fmtTime, friendlyTitle, normalize, relTime, segmentName, totalDur, uid } from "@/lib/projects";
import { groupById } from "@/lib/match";
import { tracks, trackById } from "@/lib/precheck";
import { dnaTraits, sortHooksByDNA } from "@/lib/creatorDna";
import { useStore } from "@/lib/store";
import type { Aspect, PlatformId, Segment } from "@/lib/types";

const FPS = 30;
const ASPECT_W: Record<Aspect, number> = { "9:16": 300, "1:1": 420, "4:5": 380, "16:9": 720 };
type Tab = "story" | "moments" | "clips" | "post";
const TABS: { id: Tab; label: string }[] = [{ id: "story", label: "Story" }, { id: "moments", label: "Find moments" }, { id: "clips", label: "Clips" }, { id: "post", label: "Where to post" }];
const RISK_COPY = { low: "Low chance of a copyright claim", medium: "Some chance of a copyright claim", high: "High chance of a copyright claim" } as const;

export function Editor({ projectId }: { projectId: string }) {
  const router = useRouter();
  const project = useStore((s) => s.projects.find((p) => p.id === projectId));
  const patch = useStore((s) => s.patchProject);
  const setDirty = useStore((s) => s.setDirty);
  const toast = useStore((s) => s.toast);
  const dna = useStore((s) => s.creatorDNA);
  const addFeedback = useStore((s) => s.addFeedback);
  const [dnaOpen, setDnaOpen] = useState(false);
  const capFocus = useRef("");

  const [tl, setTl] = useState<Segment[]>(project?.timeline ?? []);
  const [past, setPast] = useState<Segment[][]>([]);
  const [future, setFuture] = useState<Segment[][]>([]);
  const [sel, setSel] = useState<string | undefined>(project?.timeline[0]?.id);
  const [hoverSeg, setHoverSeg] = useState<string | undefined>();
  const [tab, setTab] = useState<Tab>("story");
  const [caps, setCaps] = useState(false);
  const [thumb, setThumb] = useState(false);
  const [safe, setSafe] = useState(false);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [saved, setSaved] = useState(true);
  const playerRef = useRef<PlayerRef | null>(null);
  const tlRef = useRef<HTMLDivElement>(null);
  const latest = useRef(tl); latest.current = tl;
  const dirtyRef = useRef(false);
  const [script, setScript] = useState("");
  const [hooks, setHooks] = useState<{ text: string; style: string; score?: number }[]>(hooksFx.hooks);
  useEffect(() => {
    if (!project) return;
    let alive = true;
    // an audience-question project starts from its drafted script instead of the sample one
    if (project.prefill) setScript(project.prefill.script.join("\n"));
    else scriptService.write({ topic: project.title, groupId: project.groupId }).then((r) => { if (alive) setScript(r.lines.join("\n")); });
    if (mode("hooks") === "live") hookService.suggest({ topic: project.title }).then((r) => { if (alive) setHooks(r.hooks.map((text) => ({ text, style: r.source === "live" ? "AI" : "sample" }))); });
    return () => { alive = false; };
  }, [project?.id, project?.groupId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Audience → "Create response": drop the drafted hook into the opening once, keep everything editable
  useEffect(() => {
    const pf = project?.prefill;
    if (!project || !pf || pf.applied) return;
    const next = normalize(latest.current.map((s, i) => (i === 0 ? { ...s, caption: pf.hook, touched: true } : s)));
    setTl(next);
    patch(project.id, { timeline: next, prefill: { ...pf, applied: true } });
  }, [project?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const group = project ? groupById(project.groupId) : null;
  const total = totalDur(tl);

  const save = useCallback(() => {
    if (!project || !dirtyRef.current) return;
    patch(project.id, { timeline: latest.current, version: project.version + 1, status: project.status === "Generated" ? "Editing" : project.status });
    dirtyRef.current = false; setSaved(true); setDirty(false);
  }, [patch, project, setDirty]);

  // autosave 8 s after the last change; flush on unmount
  useEffect(() => {
    if (saved) return;
    const t = setTimeout(save, 8000);
    return () => clearTimeout(t);
  }, [tl, saved, save]);
  useEffect(() => () => { if (dirtyRef.current) save(); }, [save]);

  // playhead + play state
  useEffect(() => {
    const id = setInterval(() => {
      const p = playerRef.current; if (!p) return;
      const f = p.getCurrentFrame(); if (typeof f === "number") setFrame(f);
      setPlaying(p.isPlaying());
    }, 100);
    return () => clearInterval(id);
  }, []);

  const commit = useCallback((next: Segment[], keepHistory = true) => {
    if (keepHistory) { setPast((p) => [...p.slice(-40), latest.current]); setFuture([]); }
    setTl(normalize(next)); dirtyRef.current = true; setSaved(false); setDirty(true);
  }, [setDirty]);
  const undo = () => { if (!past.length) return; setFuture((f) => [tl, ...f]); setTl(past[past.length - 1]); setPast((p) => p.slice(0, -1)); dirtyRef.current = true; setSaved(false); setDirty(true); };
  const redo = () => { if (!future.length) return; setPast((p) => [...p, tl]); setTl(future[0]); setFuture((f) => f.slice(1)); dirtyRef.current = true; setSaved(false); setDirty(true); };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      if (e.key.toLowerCase() === "s") { e.preventDefault(); save(); toast("Saved"); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  const edit = (id: string, p: Partial<Segment>) => commit(tl.map((s) => (s.id === id ? { ...s, ...p, touched: true } : s)));
  const selected = tl.find((s) => s.id === sel);
  const nameOf = (s: Segment) => segmentName(s.kind, tl.indexOf(s), tl.length);

  // review lanes: ad-safety, PII, claims, consent
  const [comp, applyComp] = useCompliance(project);
  const [side, setSide] = useState<"adjust" | "checks">("adjust");
  const [lane, setLane] = useState<Lane>("mon");
  const [focus, setFocus] = useState<Focus>(null);
  const [selBlur, setSelBlur] = useState<string | undefined>();
  const checksRef = useRef<HTMLElement>(null);
  const capIss = captionIssues(tl);
  const jump = (t: number) => { const f = Math.round(t * FPS); playerRef.current?.seekTo(f); setFrame(f); };
  const pick = (l: Lane, id: string, t: number) => {
    setSide("checks"); setLane(l); setFocus({ lane: l, id }); jump(t);
    if (window.innerWidth < 1280) checksRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };
  const fixCaptions = () => commit(tl.map((s) => (s.caption && profanityIn(s.caption).length ? { ...s, caption: maskProfanity(s.caption), touched: true } : s)));
  // Review's "Review people" lands here: /studio/<id>?check=people
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("check");
    if (q === "people" || q === "pii" || q === "claims" || q === "mon") { setSide("checks"); setLane(q); }
  }, []);

  if (!project || !group) {
    return <div className="grid place-items-center gap-4 py-24 text-center"><h1 className="t-h2">We couldn’t find that project</h1><Link className="btn-primary" href="/studio">Back to Studio</Link></div>;
  }

  const platform = project.platforms[0] ?? "ig_reel";
  const ratio = aspectDims[project.aspect].ratio;
  const setAspect = (a: Aspect) => patch(project.id, { aspect: a });
  const togglePlatform = (p: PlatformId) => {
    const on = project.platforms.includes(p);
    const next = on ? project.platforms.filter((x) => x !== p) : [...project.platforms, p];
    patch(project.id, { platforms: next.length ? next : project.platforms, ...(on ? {} : { aspect: PROFILES[p].aspect }) });
  };

  const trim = (seg: Segment, e: React.PointerEvent) => {
    e.preventDefault();
    const el = tlRef.current; if (!el) return;
    const pxPerSec = el.clientWidth / Math.max(total, 1);
    const x0 = e.clientX, d0 = seg.dur;
    let lastD = d0;
    const move = (ev: PointerEvent) => {
      const d = Math.max(0.5, Math.min(60, +(d0 + (ev.clientX - x0) / pxPerSec).toFixed(1)));
      lastD = d;
      setTl((cur) => normalize(cur.map((s) => (s.id === seg.id ? { ...s, dur: d, out: s.src ? +((s.in ?? 0) + d).toFixed(1) : s.out, touched: true } : s))));
      dirtyRef.current = true; setSaved(false); setDirty(true);
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); addFeedback({ type: "pacing", originalValue: String(d0), newValue: String(lastD), context: "editing.pacing" }); setPast((p) => [...p.slice(-40), tl]); setFuture([]); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };

  const addClip = (c: { src: string; in: number; dur: number; caption: string }) => {
    const seg: Segment = { id: uid("s"), at: 0, dur: c.dur, src: c.src, in: c.in, out: c.in + c.dur, kind: "story", caption: c.caption, touched: true };
    commit([...tl, seg]); setSel(seg.id); toast("Added to your video", c.caption);
  };
  const remove = (id?: string) => { if (!id || tl.length < 2) return; commit(tl.filter((s) => s.id !== id)); setSel(tl.find((s) => s.id !== id)?.id); };

  const missing = [!project.caption && "a caption", !project.thumb && "a thumbnail"].filter(Boolean) as string[];
  const done = () => {
    save();
    const clipId = project.clipId ?? `clip_${project.id}`;
    patch(project.id, { clipId, status: "In review", timeline: latest.current });
    router.push(`/review/${clipId}`);
  };
  const preview = () => { playerRef.current?.seekTo(0); playerRef.current?.play(); };
  const togglePlay = () => playerRef.current?.toggle();

  const title = friendlyTitle(project.title);
  const edlProps = { timeline: tl, aspect: project.aspect, hue: project.hue, groupId: project.groupId, media: project.media, showSafe: safe, platform, selectedId: hoverSeg ?? sel, title };
  const playheadPct = total ? Math.min(100, (frame / FPS / total) * 100) : 0;
  const nowSec = frame / FPS;
  const REASONS: Record<string, string> = { hook: "A strong way to start", demo: "Shows the payoff", cta: "A clear ask to finish on", explain: "Makes sense on its own", story: "A moment people will feel", quote: "A line worth quoting", punch: "Setup and punchline" };
  const moments = [
    ...group.timeline.filter((s) => s.src).map((s, i) => ({ id: `c${i}`, src: s.src as string, in: s.in ?? 0, dur: s.dur, caption: s.caption ?? "A strong moment", reason: REASONS[s.kind] ?? "A good moment" })),
    { id: "cx", src: "A", in: 200, dur: 6, caption: "An audience favourite you haven’t used yet", reason: "People replayed this 3× more than average" },
  ];
  const music = trackById(project.audioId);

  return (
    <div className="mx-auto max-w-[1700px]">
      {/* top bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link href="/studio" className="text-sm text-muted hover:text-text">← Back to Studio</Link>
          <input aria-label="Project name" defaultValue={title} key={project.id + title} onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== title) patch(project.id, { title: v }); }} onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            className="mt-1 block w-full max-w-xl truncate rounded-lg bg-transparent font-display text-3xl tracking-tight outline-none hover:bg-sunken focus:bg-sunken md:text-4xl" />
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted" aria-live="polite">{saved ? `Edited ${relTime(project.updatedAt)}` : "Saving…"}</p>
            <div className="relative">
              <button onClick={() => setDnaOpen((o) => !o)} aria-expanded={dnaOpen} className="chip gap-1.5 bg-accent/60 py-1 text-black hover:bg-accent"><Dna size={13} />Using your Creator DNA<Check size={13} /></button>
              {dnaOpen && (
                <div role="dialog" aria-label="Your Creator DNA" className="absolute left-0 top-9 z-30 w-72 rounded-2xl border border-line bg-surface p-4 shadow-soft">
                  <p className="font-display text-lg tracking-tight">Your Creator DNA</p>
                  <ul className="mt-2 grid gap-1 text-sm">{dnaTraits(dna, 6).map((t) => <li key={t} className="flex items-center gap-2"><Check size={12} className="text-ok" />{t}</li>)}</ul>
                  <Link href="/profile-studio" className="btn-primary mt-4 w-full py-2 text-sm" onClick={() => setDnaOpen(false)}>View / Edit DNA</Link>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {comp && <ScoreChip score={computeAdSafe(project, comp).score} />}
          <button className="btn-ghost h-10 w-10 p-0" onClick={undo} disabled={!past.length} aria-label="Undo"><Undo2 size={16} /></button>
          <button className="btn-ghost h-10 w-10 p-0" onClick={redo} disabled={!future.length} aria-label="Redo"><Redo2 size={16} /></button>
          <span className="mx-1 hidden h-6 w-px bg-line md:block" />
          <button className="btn-ghost" onClick={() => setCaps(true)}><Subtitles size={16} />Captions{project.caption && <Check size={14} className="text-ok" />}</button>
          <button className="btn-ghost" onClick={() => setThumb(true)}><ImageIcon size={16} />Thumbnail{project.thumb && <Check size={14} className="text-ok" />}</button>
          <span className="mx-1 hidden h-6 w-px bg-line md:block" />
          <button className="btn-ghost" onClick={() => { save(); toast("Saved"); }}><Save size={16} />Save</button>
          <button className="btn-ghost" onClick={preview}><Play size={16} />Preview</button>
          <div className="group relative">
            <button className="btn-brand" disabled={missing.length > 0} onClick={done}>Done <Check size={16} /></button>
            {missing.length > 0 && <div role="tooltip" className="pointer-events-none absolute right-0 top-12 z-20 w-60 rounded-xl border border-line bg-surface p-3 text-xs opacity-0 shadow-soft transition-opacity group-hover:opacity-100">Almost there, you still need {missing.join(" and ")}.</div>}
          </div>
        </div>
      </div>

      {project.prefill && (
        <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-brand/40 bg-brand/10 px-4 py-3 text-sm"><Sparkles size={14} className="text-brand" /><span>Drafted from a question your {project.prefill.source} audience keeps asking: <b>“{project.prefill.question}”</b>. Edit the opening and script freely. Nothing is published.</span></div>
      )}
      <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)_320px]">
        {/* YOUR CONTENT */}
        <section className="order-2 overflow-hidden rounded-[24px] border border-text/10 bg-surface xl:order-1" aria-label="Your content">
          <h2 className="px-4 pt-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Your content</h2>
          <div role="tablist" className="grid grid-cols-4 gap-1 p-2 text-xs font-medium">
            {TABS.map((t) => (
              <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={clsx("rounded-xl px-1 py-2.5 leading-tight transition-colors", tab === t.id ? "bg-brand text-brand-ink" : "text-muted hover:bg-sunken")}>{t.label}</button>
            ))}
          </div>
          <div className="max-h-[560px] overflow-y-auto p-4 pt-2 text-sm">
            {tab === "story" && (
              <div className="grid gap-5">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-muted" htmlFor="story">Your story</label>
                  <textarea id="story" className="input min-h-36 leading-relaxed" value={script} onChange={(e) => setScript(e.target.value)} />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button className="btn-ghost py-2" onClick={() => { scriptService.write({ topic: project.title, groupId: project.groupId }).then((r) => setScript(r.lines.join("\n"))); toast("New version created"); }}><Sparkles size={14} />Generate new version</button>
                    <select aria-label="Adapt your story for a platform" className="input w-auto py-2 text-xs" onChange={(e) => {
                      const v = e.target.value; if (!v) return;
                      setScript((s) => s.split("\n").map((l) => v === "x" ? l.slice(0, 140) : v === "linkedin" ? l.replace(/\.$/, "") + ", here’s what I learned." : "🔥 " + l).join("\n")); e.target.value = "";
                    }}><option value="">Adapt for…</option><option value="ig_reel">Instagram Reel (punchy)</option><option value="linkedin">LinkedIn (professional)</option><option value="x">X (short)</option></select>
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Opening ideas</p>
                  <ul className="grid gap-2">{sortHooksByDNA(hooks, dna).map((h) => (
                    <li key={h.text} className="rounded-xl border border-line p-3">
                      <p>{h.text}</p>
                      {dna.hooks.includes(h.style) && <span className="mt-1 inline-block text-[11px] text-brand">Matches your style</span>}
                      <button className="mt-2 block text-xs font-medium text-brand underline-offset-4 hover:underline" onClick={() => { const first = tl[0]; if (first?.id) { addFeedback({ type: "hook", originalValue: first.caption ?? "", newValue: h.text, context: `hook:${h.style}` }); edit(first.id, { caption: h.text }); toast("Opening updated", h.text); } }}>Use this opening</button>
                    </li>))}</ul>
                </div>
              </div>
            )}
            {tab === "moments" && (
              <div className="grid gap-3">
                <p className="text-muted">Here are the best parts of your video.</p>
                {moments.map((c, i) => (
                  <div key={c.id} className="rounded-xl border border-line p-3">
                    <div className="flex items-center justify-between text-xs text-muted"><span className="font-semibold">{String(i + 1).padStart(2, "0")}</span><span className="font-mono">{fmtTime(c.in)} – {fmtTime(c.in + c.dur)}</span></div>
                    <p className="mt-1">“{c.caption}”</p><p className="text-xs text-muted">{c.reason}</p>
                    <button className="btn-ghost mt-2 w-full py-1.5" onClick={() => addClip(c)}><Plus size={14} />Add to video</button>
                  </div>
                ))}
              </div>
            )}
            {tab === "clips" && (
              <ul className="grid gap-3">
                {tl.map((s) => (
                  <li key={s.id} className={clsx("rounded-xl border p-3", sel === s.id ? "border-brand" : "border-line")} onMouseEnter={() => setHoverSeg(s.id)} onMouseLeave={() => setHoverSeg(undefined)}>
                    <div className="flex items-center justify-between"><b>{nameOf(s)}</b><span className="font-mono text-xs text-muted">{s.src ? `${fmtTime(s.in ?? 0)} – ${fmtTime(s.out ?? 0)}` : "Photo"}</span></div>
                    {s.caption && <p className="mt-1 text-muted">“{s.caption}”</p>}
                    <div className="mt-2 flex gap-2">
                      <button className="btn-ghost flex-1 py-1.5" onClick={() => { setSel(s.id); playerRef.current?.seekTo(Math.round(s.at * FPS)); }}>Edit</button>
                      <button className="btn-ghost py-1.5 text-bad" disabled={tl.length < 2} onClick={() => remove(s.id)}>Remove</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {tab === "post" && (
              <div className="grid gap-3">
                <p className="text-muted">Where do you want to share this? Your video is adjusted automatically for each one.</p>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Shape</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(["9:16", "1:1", "4:5", "16:9"] as Aspect[]).map((a) => <button key={a} aria-pressed={project.aspect === a} onClick={() => setAspect(a)} className={clsx("chip px-3 py-1", project.aspect === a && "border-brand bg-brand text-brand-ink")}>{a}</button>)}
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={safe} onChange={(e) => setSafe(e.target.checked)} className="accent-[rgb(var(--brand))]" />Show where buttons and text can cover the video</label>
                {(Object.keys(PROFILES) as PlatformId[]).map((p) => {
                  const pr = PROFILES[p]; const on = project.platforms.includes(p);
                  return (
                    <label key={p} className={clsx("flex cursor-pointer items-start gap-3 rounded-xl border p-3", on ? "border-brand bg-brand/5" : "border-line")}>
                      <input type="checkbox" checked={on} onChange={() => togglePlatform(p)} className="mt-1 accent-[rgb(var(--brand))]" />
                      <span><span className="block font-medium">{pr.label}</span>{on && <span className="text-xs text-muted">{pr.aspect}{pr.maxSec < 3600 ? ` · up to ${pr.maxSec >= 120 ? `${Math.round(pr.maxSec / 60)} min` : `${pr.maxSec} sec`}` : ""}</span>}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* VIDEO PREVIEW */}
        <section className="order-1 xl:order-2" aria-label="Preview">
          <div className="grid place-items-center rounded-[28px] border border-text/10 bg-sunken p-4 md:p-8">
            <motion.div className="w-full overflow-hidden rounded-2xl border-[6px] border-text bg-surface shadow-soft" style={{ aspectRatio: ratio, maxWidth: ASPECT_W[project.aspect] }} animate={{ aspectRatio: ratio, maxWidth: ASPECT_W[project.aspect] }} transition={{ type: "spring", stiffness: 140, damping: 20 }}>
              <div className="relative h-full w-full"><EdlPlayerLazy props={edlProps} playerRef={playerRef} />{comp && <PlayerOverlay c={comp} now={nowSec} />}</div>
            </motion.div>
            <p className="mt-4 text-sm text-muted">{PROFILES[platform].label}{project.platforms.length > 1 ? ` + ${project.platforms.length - 1} more` : ""} · {project.aspect}</p>
            <div className="mt-2 flex items-center gap-3">
              <button className="grid h-10 w-10 place-items-center rounded-full bg-text text-bg" onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}>{playing ? <Pause size={16} /> : <Play size={16} />}</button>
              <span className="font-mono text-sm tabular-nums">{fmtTime(nowSec)} / {fmtTime(total)}</span>
            </div>
          </div>
          {(project.caption || project.thumb) && (
            <div className="mt-4 grid gap-4 rounded-[24px] border border-text/10 bg-surface p-4 sm:grid-cols-[160px_1fr]">
              {project.thumb ? <ThumbCard hue={project.hue} frame={project.thumb.frame} text={project.thumb.text} template={project.thumb.template} badge={fmtTime(total)} className="rounded-lg" /> : <div className="grid place-items-center rounded-lg border border-dashed border-line text-xs text-muted">No thumbnail yet</div>}
              <div className="text-sm">{project.caption ? <><p>{project.caption.caption}</p><p className="mt-1 text-xs text-muted">{project.caption.cta} · {project.caption.hashtags.join(" ")}</p></> : <p className="text-muted">No caption chosen yet.</p>}</div>
            </div>
          )}
          {comp && <GateRow project={project} g={gate(project)} title={title} />}
        </section>

        {/* ADJUST */}
        <section ref={checksRef} className="order-3 rounded-[24px] border border-text/10 bg-surface p-4 text-sm" aria-label="Inspector">
          <div role="tablist" className="grid grid-cols-2 gap-1 text-xs font-semibold uppercase tracking-[0.1em]">
            {(["adjust", "checks"] as const).map((t) => {
              const n = comp ? computeAdSafe(project, comp).issues.filter((i) => i.status === "open").length + comp.pii.filter((p) => p.status === "open").length + comp.claims.filter((k) => k.status === "open").length + comp.people.filter((p) => p.status === "unknown").length : 0;
              return <button key={t} role="tab" aria-selected={side === t} onClick={() => setSide(t)} className={clsx("flex items-center justify-center gap-1.5 rounded-xl py-2 transition-colors", side === t ? "bg-sunken text-text" : "text-muted hover:bg-sunken")}>{t === "adjust" ? "Adjust" : "Checks"}{t === "checks" && n > 0 && <span className="min-w-4 rounded-full bg-bad px-1 text-[10px] leading-4 text-bg">{n}</span>}</button>;
            })}
          </div>
          {side === "checks" && comp ? (
            <div className="mt-4 max-h-[600px] overflow-y-auto pr-1">
              <ChecksPanel c={comp} apply={applyComp} issues={computeAdSafe(project, comp).issues} capIssues={capIss} fixCaptions={fixCaptions} lane={lane} setLane={setLane} focus={focus} setFocus={setFocus} jump={jump} adSafe={computeAdSafe(project, comp).score} />
            </div>
          ) : selected ? (
            <div className="mt-4 grid gap-4" key={selected.id}>
              <div>
                <p className="font-display text-2xl tracking-tight">{nameOf(selected)}</p>
                <div className="mt-1">{selected.touched ? <Badge tone="ok">Edited by you</Badge> : <Badge tone="brand"><Sparkles size={12} />Suggested by CreatorAI</Badge>}</div>
              </div>
              <div><label className="mb-1 block font-medium" htmlFor="cap">Caption</label><textarea id="cap" className="input min-h-20" value={selected.caption ?? ""} onFocus={() => { capFocus.current = selected.caption ?? ""; }} onBlur={() => addFeedback({ type: "caption", originalValue: capFocus.current, newValue: selected.caption ?? "", context: "inspector.caption" })} onChange={(e) => edit(selected.id!, { caption: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="mb-1 block font-medium" htmlFor="dur">How long? (sec)</label><input id="dur" type="number" step="0.1" min="0.5" className="input" value={selected.dur} onChange={(e) => { const d = Math.max(0.5, +e.target.value || 0.5); edit(selected.id!, { dur: d, out: selected.src ? +((selected.in ?? 0) + d).toFixed(1) : selected.out }); }} /></div>
                {selected.src && <div><label className="mb-1 block font-medium" htmlFor="in">Starts at (sec)</label><input id="in" type="number" step="0.5" min="0" className="input" value={selected.in ?? 0} onChange={(e) => { const i = Math.max(0, +e.target.value || 0); edit(selected.id!, { in: i, out: +(i + selected.dur).toFixed(1) }); }} /></div>}
              </div>
              <div><label className="mb-1 block font-medium" htmlFor="zoom">Zoom · {selected.zoom ?? 0}%</label><input id="zoom" type="range" min="0" max="40" value={selected.zoom ?? 0} onChange={(e) => edit(selected.id!, { zoom: +e.target.value })} className="w-full accent-[rgb(var(--brand))]" /></div>
              <div className="flex gap-2">
                {selected.ai && <button className="btn-ghost flex-1 py-2" onClick={() => edit(selected.id!, { dur: selected.ai!.dur, caption: selected.ai!.caption, in: selected.ai!.in, out: selected.ai!.out, zoom: 0, touched: false })}><RotateCcw size={14} />Reset changes</button>}
                <button className="btn-ghost py-2 text-bad" disabled={tl.length < 2} onClick={() => remove(selected.id)}>Delete</button>
              </div>
            </div>
          ) : <p className="mt-4 text-muted">Pick a part of your video on the timeline to change it.</p>}
          <div className="mt-6 border-t border-line pt-4">
            <label className="mb-1 block font-medium" htmlFor="aud">Music</label>
            <select id="aud" className="input" value={project.audioId} onChange={(e) => { patch(project.id, { audioId: e.target.value }); toast("Music changed", trackById(e.target.value)?.title); }}>
              {tracks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
            <div className="mt-2"><Badge tone={{ low: "ok", medium: "warn", high: "bad" }[music?.risk ?? "low"] as "ok"}>{RISK_COPY[(music?.risk ?? "low") as keyof typeof RISK_COPY]}</Badge></div>
          </div>
        </section>
      </div>

      {/* TIMELINE */}
      <section className="mt-5 rounded-[24px] border border-text/10 bg-surface p-4" aria-label="Timeline">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
          <span><b className="font-display text-lg tracking-tight">Timeline</b> <span className="text-muted">· {Math.round(total)} seconds</span></span>
          <span className="text-xs text-muted">Drag the edges to shorten or extend a section · <span className="text-brand">■</span> Suggested by CreatorAI <span className="ml-1 text-accent">■</span> Edited by you</span>
        </div>
        <div className="relative">
          <div className="mb-1 h-4 cursor-pointer text-[10px] text-muted" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); playerRef.current?.seekTo(Math.round(((e.clientX - r.left) / r.width) * total * FPS)); }} aria-hidden="true">
            <div className="flex justify-between">{Array.from({ length: Math.min(8, Math.ceil(total / 5) + 1) }, (_, i) => <span key={i}>{fmtTime((total / Math.max(1, Math.min(7, Math.ceil(total / 5)))) * i)}</span>)}</div>
          </div>
          {comp && <><StrictBracket total={total} /><MonStrip issues={computeAdSafe(project, comp).issues} total={total} focus={focus} onPick={pick} /></>}
          <div ref={tlRef} className="relative flex h-20 gap-0.5 overflow-hidden rounded-xl bg-sunken">
            {tl.map((s) => (
              <motion.div key={s.id} layout="position" style={{ flexGrow: s.dur, flexBasis: 0 }} onClick={() => { setSel(s.id); playerRef.current?.seekTo(Math.round(s.at * FPS)); }}
                onMouseEnter={() => setHoverSeg(s.id)} onMouseLeave={() => setHoverSeg(undefined)}
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className={clsx("relative min-w-[28px] cursor-pointer overflow-hidden rounded-lg border-2 p-2 text-left text-xs", s.touched ? "border-accent bg-accent/25" : "border-brand/60 bg-brand/25", sel === s.id && "ring-2 ring-text")}
                role="button" tabIndex={0} aria-label={`${nameOf(s)}, ${s.dur.toFixed(1)} seconds`} onKeyDown={(e) => { if (e.key === "Enter") setSel(s.id); if (e.key === "ArrowRight") edit(s.id!, { dur: +(s.dur + 0.1).toFixed(1) }); if (e.key === "ArrowLeft") edit(s.id!, { dur: Math.max(0.5, +(s.dur - 0.1).toFixed(1)) }); }}>
                {!s.touched && <motion.span className="absolute inset-0 bg-gradient-to-r from-transparent via-brand-ink/40 to-transparent" initial={{ x: "-100%" }} animate={{ x: "100%" }} transition={{ duration: 1.1, delay: 0.3 }} />}
                <div className="relative truncate font-semibold">{!s.touched && <Sparkles size={10} className="mr-1 inline" />}{nameOf(s)}</div>
                <div className="relative truncate text-muted">{s.dur.toFixed(1)} sec</div>
                <div role="separator" aria-label="Drag to change length" onPointerDown={(e) => trim(s, e)} onClick={(e) => e.stopPropagation()} className="absolute inset-y-0 right-0 w-2 cursor-ew-resize bg-text/40 hover:bg-text" />
              </motion.div>
            ))}
            <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-text" style={{ left: `${playheadPct}%` }} aria-hidden="true"><span className="absolute -left-1 -top-0.5 h-2 w-2.5 rounded-sm bg-text" /></div>
          </div>
          <div className="mt-2 grid grid-cols-[minmax(0,1fr)] gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted">
            <div className="flex items-center gap-2"><span className="w-16 shrink-0">Captions</span>
              <div className="flex h-6 min-w-0 flex-1 gap-0.5 overflow-hidden rounded-lg bg-sunken">
                {tl.map((s) => <div key={s.id} style={{ flexGrow: s.dur, flexBasis: 0, minWidth: 0 }} className={clsx("overflow-hidden whitespace-nowrap px-1.5 text-[10px] normal-case leading-6", s.caption ? (s.touched ? "bg-accent/40 text-text" : "bg-brand-2/50 text-text") : "")}>{s.caption}</div>)}
              </div>
            </div>
            <div className="flex items-center gap-2"><span className="w-16 shrink-0">Music</span>
              <div className="relative h-6 min-w-0 flex-1 rounded-lg bg-sunken"><div className="h-full w-full overflow-hidden rounded-lg bg-tan/40 px-2 text-[10px] normal-case leading-6 text-text">{music?.title}</div>{comp && <BleepMarks c={comp} total={total} />}</div>
            </div>
            {comp && <ReviewLanes c={comp} total={total} focus={focus} onPick={pick} selectedBlur={selBlur} onSelectBlur={setSelBlur} onBlurChange={(id, a, b) => applyComp((x) => moveBlur(x, id, a, b))} />}
          </div>
        </div>
      </section>

      <CaptionsDrawer open={caps} onClose={() => setCaps(false)} project={project} onUse={(c) => { addFeedback({ type: "caption", originalValue: project.caption?.caption ?? "", newValue: c.caption, context: `drawer:${c.tone}` }); patch(project.id, { caption: c }); toast("Caption added", "You can see it on the preview card"); }} />
      <ThumbnailModal open={thumb} onClose={() => setThumb(false)} project={project} onUse={(t) => { patch(project.id, { thumb: t }); toast("Thumbnail chosen"); }} />
    </div>
  );
}
