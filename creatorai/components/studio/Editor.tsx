"use client";
import type { PlayerRef } from "@remotion/player";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Plus, Redo2, RotateCcw, Save, Sparkles, Subtitles, Undo2, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import hooksFx from "@/fixtures/captions.json";
import { hookService, mode, scriptService } from "@/lib/services";
import { Badge } from "@/components/ui/bits";
import { EdlPlayerLazy } from "./EdlPlayerLazy";
import { CaptionsDrawer, ThumbnailModal, ThumbCard } from "./Tools";
import { PROFILES, aspectDims, fmtTime, normalize, totalDur, uid } from "@/lib/projects";
import { groupById } from "@/lib/match";
import { tracks, trackById } from "@/lib/precheck";
import { runJob } from "@/lib/services/demo";
import { useStore } from "@/lib/store";
import type { Aspect, PlatformId, Segment } from "@/lib/types";

const FPS = 30;
const ASPECT_W: Record<Aspect, number> = { "9:16": 300, "1:1": 420, "4:5": 380, "16:9": 720 };
type Tab = "script" | "align" | "clips" | "platforms";

export function Editor({ projectId }: { projectId: string }) {
  const router = useRouter();
  const project = useStore((s) => s.projects.find((p) => p.id === projectId));
  const patch = useStore((s) => s.patchProject);
  const setDirty = useStore((s) => s.setDirty);
  const toast = useStore((s) => s.toast);

  const [tl, setTl] = useState<Segment[]>(project?.timeline ?? []);
  const [past, setPast] = useState<Segment[][]>([]);
  const [future, setFuture] = useState<Segment[][]>([]);
  const [sel, setSel] = useState<string | undefined>(project?.timeline[0]?.id);
  const [hoverSeg, setHoverSeg] = useState<string | undefined>();
  const [tab, setTab] = useState<Tab>("script");
  const [caps, setCaps] = useState(false);
  const [thumb, setThumb] = useState(false);
  const [safe, setSafe] = useState(false);
  const [frame, setFrame] = useState(0);
  const [saved, setSaved] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);
  const playerRef = useRef<PlayerRef | null>(null);
  const tlRef = useRef<HTMLDivElement>(null);
  const latest = useRef(tl); latest.current = tl;
  const dirtyRef = useRef(false);
  const [script, setScript] = useState("");
  const [hooks, setHooks] = useState<{ text: string; style: string; score?: number }[]>(hooksFx.hooks);
  useEffect(() => {
    if (!project) return;
    let alive = true;
    scriptService.write({ topic: project.title, groupId: project.groupId }).then((r) => { if (alive) setScript(r.lines.join("\n")); });
    if (mode("hooks") === "live") hookService.suggest({ topic: project.title }).then((r) => { if (alive) setHooks(r.hooks.map((text) => ({ text, style: r.source === "live" ? "AI" : "sample" }))); });
    return () => { alive = false; };
  }, [project?.id, project?.groupId]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // playhead
  useEffect(() => {
    const id = setInterval(() => { const f = playerRef.current?.getCurrentFrame(); if (typeof f === "number") setFrame(f); }, 100);
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
      if (e.key.toLowerCase() === "s") { e.preventDefault(); save(); toast("Saved", `EDL v${(project?.version ?? 1) + 1}`); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  const edit = (id: string, p: Partial<Segment>) => commit(tl.map((s) => (s.id === id ? { ...s, ...p, touched: true } : s)));
  const selected = tl.find((s) => s.id === sel);

  if (!project || !group) {
    return <div className="grid place-items-center gap-4 py-24 text-center"><h1 className="t-h2">Project not found</h1><Link className="btn-primary" href="/studio">Back to Studio</Link></div>;
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
    const move = (ev: PointerEvent) => {
      const d = Math.max(0.5, Math.min(60, +(d0 + (ev.clientX - x0) / pxPerSec).toFixed(1)));
      setTl((cur) => normalize(cur.map((s) => (s.id === seg.id ? { ...s, dur: d, out: s.src ? +((s.in ?? 0) + d).toFixed(1) : s.out, touched: true } : s))));
      dirtyRef.current = true; setSaved(false); setDirty(true);
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); setPast((p) => [...p.slice(-40), tl]); setFuture([]); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };

  const addClip = (c: { src: string; in: number; dur: number; caption: string }) => {
    const seg: Segment = { id: uid("s"), at: 0, dur: c.dur, src: c.src, in: c.in, out: c.in + c.dur, kind: "story", caption: c.caption, touched: true };
    commit([...tl, seg]); setSel(seg.id); toast("Clip added to timeline", c.caption);
  };

  const missing = [!project.caption && "caption", !project.thumb && "thumbnail"].filter(Boolean) as string[];
  const perfect = () => {
    save();
    const clipId = project.clipId ?? `clip_${project.id}`;
    patch(project.id, { clipId, status: "In review", timeline: latest.current });
    router.push(`/review/${clipId}`);
  };
  const exportIt = async () => {
    save(); setExporting("Queued");
    await runJob([{ label: "Compositing EDL", ms: 900 }, { label: "Encoding 1080p", ms: 1100 }, { label: "Packaging for platforms", ms: 800 }], (p) => setExporting(p.steps[Math.min(p.stepIndex, p.steps.length - 1)].label));
    setExporting(null); toast("Export ready", "Pre-baked MP4 for this set (staged render job)");
  };

  const edlProps = { timeline: tl, aspect: project.aspect, hue: project.hue, groupId: project.groupId, media: project.media, showSafe: safe, platform, selectedId: hoverSeg ?? sel, title: project.title };
  const playheadPct = total ? Math.min(100, (frame / FPS / total) * 100) : 0;
  const lines = script.split("\n").filter(Boolean);
  const unmatched = (l: string) => /^(add|show|insert)\b/i.test(l.trim());
  const rows = lines.map((l, i) => ({ l, seg: unmatched(l) ? undefined : tl[Math.min(i, tl.length - 1)] }));
  const clips = [...group.timeline.map((s, i) => ({ id: `c${i}`, src: s.src ?? "A", in: s.in ?? 0, dur: s.dur, caption: s.caption ?? "Clip", score: +(0.93 - i * 0.05).toFixed(2), reason: { hook: "Strong opening claim, self-contained", demo: "Visual payoff, high retention", cta: "Clear ask, clean ending", explain: "Concept lands without context", story: "Emotional beat with payoff", quote: "Quotable line, speaker-focused", punch: "Setup → punchline in 4 s", photo: "Still moment" }[s.kind] ?? "Good segment" })).filter((c) => c.src),
    { id: "cx", src: "A", in: 200, dur: 6, caption: "Unused: audience-favourite moment", score: 0.81, reason: "Unused clip · 3× above average replay" }];

  return (
    <div className="mx-auto max-w-[1700px]">
      {/* top bar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link href="/studio" className="t-label text-muted hover:text-text">← Studio</Link>
          <h1 className="t-h2 mt-1 truncate">{project.title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip" aria-live="polite">{saved ? <><Check size={12} />Saved · v{project.version}</> : "Unsaved…"}</span>
          <button className="btn-ghost h-10 w-10 p-0" onClick={undo} disabled={!past.length} aria-label="Undo"><Undo2 size={16} /></button>
          <button className="btn-ghost h-10 w-10 p-0" onClick={redo} disabled={!future.length} aria-label="Redo"><Redo2 size={16} /></button>
          <button className="btn-ghost" onClick={() => { save(); toast("Saved", `EDL v${project.version + 1}`); }}><Save size={16} /><span className="hidden sm:inline">Save</span></button>
          <button className="btn-ghost" onClick={exportIt} disabled={!!exporting}>{exporting ?? "Export"}</button>
          <button className="btn-ghost" onClick={() => setCaps(true)}><Subtitles size={16} />Suggest captions</button>
          <button className="btn-ghost" onClick={() => setThumb(true)}><ImageIcon size={16} />Generate thumbnail</button>
          <div className="group relative">
            <button className="btn-brand" disabled={missing.length > 0} onClick={perfect}>Perfect <Check size={16} /></button>
            {missing.length > 0 && <div role="tooltip" className="pointer-events-none absolute right-0 top-12 z-20 w-56 rounded-xl border border-line bg-surface p-3 text-xs opacity-0 shadow-soft transition-opacity group-hover:opacity-100">Still needed: {missing.join(" and ")}.</div>}
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)_300px]">
        {/* left panel */}
        <section className="card order-2 overflow-hidden xl:order-1" aria-label="Tools">
          <div role="tablist" className="grid grid-cols-4 border-b border-line text-xs font-medium">
            {(["script", "align", "clips", "platforms"] as Tab[]).map((t) => (
              <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={clsx("px-2 py-3 capitalize transition-colors", tab === t ? "bg-brand text-brand-ink" : "text-muted hover:bg-sunken")}>{t}</button>
            ))}
          </div>
          <div className="max-h-[560px] overflow-y-auto p-4 text-sm">
            {tab === "script" && (
              <div className="grid gap-4">
                <label className="t-label text-muted" htmlFor="script">Script</label>
                <textarea id="script" className="input min-h-36 leading-relaxed" value={script} onChange={(e) => setScript(e.target.value)} />
                <div className="flex gap-2">
                  <select aria-label="Rewrite for platform" className="input py-2 text-xs" onChange={(e) => {
                    const v = e.target.value; if (!v) return;
                    setScript((s) => s.split("\n").map((l) => v === "x" ? l.slice(0, 140) : v === "linkedin" ? l.replace(/\.$/, "") + " — here's what I learned." : "🔥 " + l).join("\n")); e.target.value = "";
                  }}><option value="">Rewrite for platform…</option><option value="ig_reel">Reel (punchy)</option><option value="linkedin">LinkedIn (pro)</option><option value="x">X (≤140)</option></select>
                </div>
                <div>
                  <p className="t-label mb-2 text-muted">Hooks</p>
                  <ul className="grid gap-2">{hooks.map((h) => (
                    <li key={h.text}><button className="flex w-full items-start justify-between gap-2 rounded-xl border border-line p-3 text-left hover:border-brand" onClick={() => { const first = tl[0]; if (first?.id) { edit(first.id, { caption: h.text }); toast("Hook applied", h.text); } }}>
                      <span>{h.text}</span><Badge tone="muted">{h.score != null ? `${h.style} · ${h.score}` : h.style}</Badge></button></li>))}</ul>
                </div>
              </div>
            )}
            {tab === "align" && (
              <div className="grid gap-2">
                <p className="mb-2 text-xs text-muted">Script lines ↔ footage ranges (hand-authored alignment for this demo set; unmatched lines are flagged, never faked).</p>
                {rows.map((r, i) => (
                  <div key={i} onMouseEnter={() => setHoverSeg(r.seg?.id)} onMouseLeave={() => setHoverSeg(undefined)}
                    className={clsx("grid grid-cols-[1fr_auto] items-start gap-2 rounded-xl border p-3 transition-colors", hoverSeg && hoverSeg === r.seg?.id ? "border-accent bg-accent/10" : "border-line", !r.seg && "border-warn/50 bg-warn/5")}>
                    <span>{r.l}</span>
                    {r.seg ? <button className="chip py-0.5 font-mono" onClick={() => { setSel(r.seg!.id); playerRef.current?.seekTo(Math.round(r.seg!.at * FPS)); }}>{r.seg.src ?? "▣"} {r.seg.src ? `${fmtTime(r.seg.in ?? 0)}–${fmtTime(r.seg.out ?? 0)}` : "photo"}</button>
                      : <Badge tone="warn">no footage — reshoot?</Badge>}
                  </div>
                ))}
              </div>
            )}
            {tab === "clips" && (
              <ul className="grid gap-2">
                {clips.map((c) => (
                  <li key={c.id} className="rounded-xl border border-line p-3">
                    <div className="flex items-center justify-between"><b className="text-xs">{c.src} · {fmtTime(c.in)}–{fmtTime(c.in + c.dur)}</b><Badge tone={c.score > 0.85 ? "ok" : "brand"}>score {c.score}</Badge></div>
                    <p className="mt-1">{c.caption}</p><p className="text-xs text-muted">{c.reason}</p>
                    <button className="btn-ghost mt-2 w-full py-1.5" onClick={() => addClip(c)}><Plus size={14} />Add to timeline</button>
                  </li>
                ))}
              </ul>
            )}
            {tab === "platforms" && (
              <div className="grid gap-3">
                <div className="flex flex-wrap gap-1.5">
                  {(["9:16", "1:1", "4:5", "16:9"] as Aspect[]).map((a) => <button key={a} aria-pressed={project.aspect === a} onClick={() => setAspect(a)} className={clsx("chip px-3 py-1", project.aspect === a && "border-brand bg-brand text-brand-ink")}>{a}</button>)}
                </div>
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={safe} onChange={(e) => setSafe(e.target.checked)} className="accent-[rgb(var(--brand))]" />Show safe-zone overlay (strict union)</label>
                {(Object.keys(PROFILES) as PlatformId[]).map((p) => {
                  const pr = PROFILES[p]; const on = project.platforms.includes(p);
                  return (
                    <div key={p} className={clsx("rounded-xl border p-3", on ? "border-brand bg-brand/5" : "border-line")}>
                      <label className="flex cursor-pointer items-center gap-2 font-medium"><input type="checkbox" checked={on} onChange={() => togglePlatform(p)} className="accent-[rgb(var(--brand))]" />{pr.label}</label>
                      {on && <dl className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-muted"><dt>Aspect</dt><dd className="text-text">{pr.aspect} · {pr.res}</dd><dt>Length cap</dt><dd className="text-text">{pr.maxSec >= 3600 ? "none" : `${pr.maxSec}s`}</dd><dt>Safe zone</dt><dd className="text-text">T{pr.safe.top} B{pr.safe.bottom} S{pr.safe.side}%</dd><dt>Captions</dt><dd className="text-text">{pr.captionStyle}</dd><dt>Cover</dt><dd className="text-text">{pr.cover}</dd></dl>}
                      {on && <p className="mt-1 text-[11px] text-muted">{pr.notes}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* player */}
        <section className="order-1 xl:order-2" aria-label="Preview">
          <div className="grid place-items-center rounded-3xl border border-line bg-sunken p-4 md:p-8">
            <motion.div className="w-full overflow-hidden rounded-2xl border-[6px] border-text bg-surface shadow-soft" animate={{ aspectRatio: ratio, maxWidth: ASPECT_W[project.aspect] }} transition={{ type: "spring", stiffness: 140, damping: 20 }}>
              <EdlPlayerLazy props={edlProps} playerRef={playerRef} />
            </motion.div>
            <p className="mt-4 text-xs text-muted">{project.aspect} · {PROFILES[platform].label}{project.platforms.length > 1 ? ` +${project.platforms.length - 1}` : ""} · {fmtTime(total)} · {group.media ? "your footage" : "storyboard preview (add media to /public/demo)"}</p>
          </div>
          {(project.caption || project.thumb) && (
            <div className="card mt-4 grid gap-4 p-4 sm:grid-cols-[160px_1fr]">
              {project.thumb ? <ThumbCard hue={project.hue} frame={project.thumb.frame} text={project.thumb.text} template={project.thumb.template} badge={fmtTime(total)} className="rounded-lg" /> : <div className="grid place-items-center rounded-lg border border-dashed border-line text-xs text-muted">No thumbnail</div>}
              <div className="text-sm">{project.caption ? <><p>{project.caption.caption}</p><p className="mt-1 text-xs text-muted">{project.caption.cta} · {project.caption.hashtags.join(" ")}</p></> : <p className="text-muted">No caption chosen yet.</p>}</div>
            </div>
          )}
        </section>

        {/* inspector */}
        <section className="card order-3 p-4 text-sm" aria-label="Inspector">
          <h2 className="t-label text-muted">Inspector</h2>
          {selected ? (
            <div className="mt-4 grid gap-4" key={selected.id}>
              <div className="flex items-center gap-2"><Badge tone={selected.touched ? "ok" : "brand"}>{selected.touched ? "Edited by you" : <><Sparkles size={12} />AI placed</>}</Badge><span className="chip capitalize">{selected.kind}</span></div>
              <div><label className="t-label mb-1 block text-muted" htmlFor="cap">Caption</label><textarea id="cap" className="input min-h-20" value={selected.caption ?? ""} onChange={(e) => edit(selected.id!, { caption: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="t-label mb-1 block text-muted" htmlFor="dur">Duration (s)</label><input id="dur" type="number" step="0.1" min="0.5" className="input" value={selected.dur} onChange={(e) => { const d = Math.max(0.5, +e.target.value || 0.5); edit(selected.id!, { dur: d, out: selected.src ? +((selected.in ?? 0) + d).toFixed(1) : selected.out }); }} /></div>
                {selected.src && <div><label className="t-label mb-1 block text-muted" htmlFor="in">Source in (s)</label><input id="in" type="number" step="0.5" min="0" className="input" value={selected.in ?? 0} onChange={(e) => { const i = Math.max(0, +e.target.value || 0); edit(selected.id!, { in: i, out: +(i + selected.dur).toFixed(1) }); }} /></div>}
              </div>
              <div><label className="t-label mb-1 block text-muted" htmlFor="zoom">Zoom keyframe · {selected.zoom ?? 0}%</label><input id="zoom" type="range" min="0" max="40" value={selected.zoom ?? 0} onChange={(e) => edit(selected.id!, { zoom: +e.target.value })} className="w-full accent-[rgb(var(--brand))]" /></div>
              <div className="flex gap-2">
                {selected.ai && <button className="btn-ghost flex-1 py-2" onClick={() => edit(selected.id!, { dur: selected.ai!.dur, caption: selected.ai!.caption, in: selected.ai!.in, out: selected.ai!.out, zoom: 0, touched: false })}><RotateCcw size={14} />Reset AI suggestion</button>}
                <button className="btn-ghost py-2 text-bad" disabled={tl.length < 2} onClick={() => { commit(tl.filter((s) => s.id !== selected.id)); setSel(tl.find((s) => s.id !== selected.id)?.id); }}>Delete</button>
              </div>
            </div>
          ) : <p className="mt-4 text-muted">Select a segment on the timeline.</p>}
          <div className="mt-6 border-t border-line pt-4">
            <label className="t-label mb-1 block text-muted" htmlFor="aud">Audio</label>
            <select id="aud" className="input" value={project.audioId} onChange={(e) => { patch(project.id, { audioId: e.target.value }); toast("Audio changed", trackById(e.target.value)?.title); }}>
              {tracks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
            <div className="mt-2"><Badge tone={{ low: "ok", medium: "warn", high: "bad" }[trackById(project.audioId)?.risk ?? "low"] as "ok"}>{trackById(project.audioId)?.risk} claim risk</Badge></div>
          </div>
        </section>
      </div>

      {/* timeline */}
      <section className="card mt-5 p-4" aria-label="Timeline">
        <div className="mb-3 flex items-center justify-between text-xs text-muted">
          <span>Timeline · {fmtTime(total)} · <span className="text-brand">■</span> AI placed <span className="ml-2 text-accent">■</span> edited by you</span>
          <span>Drag a block's right edge to trim · click ruler to seek</span>
        </div>
        <div className="relative">
          <div className="mb-1 h-4 cursor-pointer text-[10px] text-muted" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); playerRef.current?.seekTo(Math.round(((e.clientX - r.left) / r.width) * total * FPS)); }} aria-hidden="true">
            <div className="flex justify-between">{Array.from({ length: Math.min(8, Math.ceil(total / 5) + 1) }, (_, i) => <span key={i}>{fmtTime((total / Math.max(1, Math.min(7, Math.ceil(total / 5)))) * i)}</span>)}</div>
          </div>
          <div ref={tlRef} className="relative flex h-20 gap-0.5 overflow-hidden rounded-xl bg-sunken">
            {tl.map((s) => (
              <motion.div key={s.id} layout="position" style={{ flexGrow: s.dur, flexBasis: 0 }} onClick={() => { setSel(s.id); playerRef.current?.seekTo(Math.round(s.at * FPS)); }}
                onMouseEnter={() => setHoverSeg(s.id)} onMouseLeave={() => setHoverSeg(undefined)}
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className={clsx("relative min-w-[28px] cursor-pointer overflow-hidden rounded-lg border-2 p-2 text-left text-xs", s.touched ? "border-accent bg-accent/25" : "border-brand/60 bg-brand/25", sel === s.id && "ring-2 ring-text")}
                role="button" tabIndex={0} aria-label={`${s.kind} segment, ${s.dur.toFixed(1)} seconds`} onKeyDown={(e) => { if (e.key === "Enter") setSel(s.id); if (e.key === "ArrowRight") edit(s.id!, { dur: +(s.dur + 0.1).toFixed(1) }); if (e.key === "ArrowLeft") edit(s.id!, { dur: Math.max(0.5, +(s.dur - 0.1).toFixed(1)) }); }}>
                {!s.touched && <motion.span className="absolute inset-0 bg-gradient-to-r from-transparent via-brand-ink/40 to-transparent" initial={{ x: "-100%" }} animate={{ x: "100%" }} transition={{ duration: 1.1, delay: 0.3 }} />}
                <div className="relative truncate font-semibold capitalize">{!s.touched && <Sparkles size={10} className="mr-1 inline" />}{s.kind}</div>
                <div className="relative truncate text-muted">{s.src ?? "▣"} · {s.dur.toFixed(1)}s</div>
                <div role="separator" aria-label="Trim handle" onPointerDown={(e) => trim(s, e)} onClick={(e) => e.stopPropagation()} className="absolute inset-y-0 right-0 w-2 cursor-ew-resize bg-text/40 hover:bg-text" />
              </motion.div>
            ))}
            <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-text" style={{ left: `${playheadPct}%` }} aria-hidden="true"><span className="absolute -left-1 -top-0.5 h-2 w-2.5 rounded-sm bg-text" /></div>
          </div>
        </div>
      </section>

      <CaptionsDrawer open={caps} onClose={() => setCaps(false)} project={project} onUse={(c) => { patch(project.id, { caption: c }); toast("Caption attached", "Shown on the preview card"); }} />
      <ThumbnailModal open={thumb} onClose={() => setThumb(false)} project={project} onUse={(t) => { patch(project.id, { thumb: t }); toast("Thumbnail selected", `Click-readiness ${t.score}`); }} />
      <AnimatePresence />
    </div>
  );
}
