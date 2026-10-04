"use client";
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "framer-motion";
import { Check, FileVideo, ImageIcon, Sparkles, UploadCloud } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { Poster, Reveal, SlidingNav } from "@/components/ui/bits";
import { AiClipLab } from "@/components/workspace/AiClipLab";
import { fingerprint } from "@/lib/fingerprint";
import { defaultGroup, groupById, groups, sampleFingerprints } from "@/lib/match";
import { GENERATE_MIN, PHOTO_COUNT, isPhotoReel, recognisedLabel } from "@/lib/photoReel";
import { CoverFit, ReelPreview } from "@/components/ui/ReelMedia";
import { LectureReport } from "@/components/studio/LectureReport";
import { SongPick } from "@/components/audio/SongSearch";
import { PROFILES, absTime, fmtTime, friendlyTitle, makeProject, relTime, totalDur } from "@/lib/projects";
import { projectApi } from "@/lib/api/projects";
import { clipService, groupService } from "@/lib/services";
import { generationSteps, sleep } from "@/lib/services/demo";
import { useStore } from "@/lib/store";
import type { Asset, FileFingerprint, Group, MatchResult, PlatformId, Project } from "@/lib/types";

/** Library rows for the photos a photo-reel generation used: the uploaded name, the resized copy and its thumbnail. */
function photoAssets(g: Group, m: MatchResult | null, at: string): Asset[] {
  return g.inputs.filter((r) => !m || m.isDefault || m.matched.some((x) => x.role === r.role)).map((r) => {
    const n = r.role.slice(1);
    return {
      id: `asset_${g.id}_${r.role}`, name: m?.matched.find((x) => x.role === r.role)?.fileName ?? r.filenames[0], kind: "image" as const,
      url: `/demo/${g.id}/photos/p${n}.jpg`, thumbUrl: `/demo/${g.id}/photos/thumbs/p${n}.jpg`, groupId: g.id, createdAt: at, size: r.size, width: r.width, height: r.height,
    };
  });
}

type Kind = "short" | "video";
const TABS = {
  short: [{ id: "Reels", label: "Reels" }, { id: "Shorts", label: "Shorts" }, { id: "Stories", label: "Stories" }, { id: "Ads", label: "Ads" }],
  video: [{ id: "All", label: "All" }, { id: "Podcast", label: "Podcast" }, { id: "Lecture", label: "Lecture" }, { id: "Vlog", label: "Vlog" }, { id: "Other", label: "Other" }],
} as const;
const TARGETS: Record<string, PlatformId[]> = { Reels: ["ig_reel"], Shorts: ["yt_short"], Stories: ["ig_reel"], Ads: ["ig_reel", "yt_short"] };

/** Progress ring that glides between steps instead of jumping. */
function JobRing({ progress }: { progress: number }) {
  const r = 44, c = 2 * Math.PI * r;
  const mv = useMotionValue(0);
  useEffect(() => { const a = animate(mv, progress, { duration: 1.2, ease: [0.22, 1, 0.36, 1] }); return () => a.stop(); }, [progress, mv]);
  const offset = useTransform(mv, (v) => c * (1 - v));
  const label = useTransform(mv, (v) => `${Math.round(v * 100)}%`);
  return (
    <div className="relative grid h-28 w-28 shrink-0 place-items-center">
      <motion.span className="absolute inset-0 rounded-full bg-brand/15 blur-xl" animate={{ opacity: [0.4, 0.9, 0.4], scale: [0.9, 1.05, 0.9] }} transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }} aria-hidden="true" />
      <svg width="112" height="112" className="relative -rotate-90" aria-hidden="true"><circle cx="56" cy="56" r={r} fill="none" stroke="rgb(var(--line))" strokeWidth="6" />
        <motion.circle cx="56" cy="56" r={r} fill="none" stroke="rgb(var(--brand))" strokeWidth="6" strokeLinecap="round" strokeDasharray={c} style={{ strokeDashoffset: offset }} /></svg>
      <motion.div className="absolute inset-0" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2.4, ease: "linear" }} aria-hidden="true"><span className="absolute left-1/2 top-[6px] h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-accent shadow-[0_0_10px_rgb(var(--accent))]" /></motion.div>
      <motion.span className="absolute font-display text-2xl tabular-nums" role="status">{label}</motion.span>
    </div>
  );
}

export function UploadWorkspace({ kind, embedded = false, forcedTab, dropTitle, dropHint }: { kind: Kind; embedded?: boolean; forcedTab?: string; dropTitle?: string; dropHint?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const { projects, upsertProject, addAssets, forceGroup, toast } = useStore();
  const [report, setReport] = useState(false);
  const tabs = TABS[kind];
  const typeParam = params.get("type");
  const initial = tabs.find((t) => t.id.toLowerCase() === typeParam?.toLowerCase())?.id ?? tabs[0].id;
  const [tab, setTab] = useState<string>(forcedTab ?? initial);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState<"reading" | "job" | null>(null);
  const [files, setFiles] = useState<FileFingerprint[]>([]);
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const [job, setJob] = useState<{ step: number; progress: number; steps: { label: string }[] } | null>(null);
  const [result, setResult] = useState<Project | null>(null);
  const [cta, setCta] = useState("Shop now");
  const [variant, setVariant] = useState<15 | 30>(15);
  const [safe, setSafe] = useState(true);
  // on one-screen pages the drop zone gives way to the match / progress / result card instead of pushing it below the fold
  const showDrop = !embedded || !(match || job || result || busy);
  const input = useRef<HTMLInputElement>(null);

  const gid = pick ?? match?.groupId;
  const group = gid ? groupById(gid) : match?.isDefault ? defaultGroup : null;
  const existing = useMemo(() => (group && gid ? projects.find((p) => p.groupId === gid && p.status !== "Published" && p.id.startsWith("p_") && !p.id.includes("seed")) : undefined), [projects, group, gid]);

  const reset = () => { setFiles([]); setMatch(null); setPick(null); setJob(null); setResult(null); };

  const ingest = async (incoming: FileFingerprint[], base: FileFingerprint[] = files) => {
    setResult(null); setJob(null); setPick(null);
    setBusy("reading");
    const all = [...base, ...incoming];
    setFiles(all);
    await sleep(500);
    let m = await groupService.match(all); // BACKEND-SLOT(groups-match): demo = local matcher, live = POST /api/v1/groups/match
    if (forceGroup && (m.isDefault || m.confidence < 1)) {
      const g = groupById(forceGroup);
      m = { groupId: g.id, matched: g.inputs.map((r) => ({ role: r.role, fileName: r.filenames[0] })), missingRoles: [], photosMatched: isPhotoReel(g) ? g.inputs.map((r) => r.filenames[0]) : g.photos.map((p) => p.filenames[0]), unused: [], confidence: 1, candidates: [{ groupId: g.id, score: 9 }], isDefault: false, duplicates: [] };
    }
    setMatch(m); setBusy(null);
  };

  const onFiles = async (list: FileList | File[]) => {
    const arr = Array.from(list);
    if (!arr.length) return;
    setBusy("reading");
    const fps = await Promise.all(arr.map(fingerprint));
    await ingest(fps);
  };
  const useSample = (id: string) => { reset(); void ingest(sampleFingerprints(groupById(id)), []); };

  const generate = async () => {
    if (!group) return;
    setBusy("job");
    const steps = generationSteps(group, isPhotoReel(group) && match && !match.isDefault ? match.matched.length : undefined);
    setJob({ step: 0, progress: 0, steps });
    const out = await clipService.generate(group, (p) => setJob({ step: p.stepIndex, progress: p.progress, steps: p.steps }));
    const server = out?.projectId ? await projectApi.get(out.projectId).catch(() => null) : null; // live: the server already created the project
    const targets = kind === "short" ? TARGETS[tab] ?? TARGETS.Reels : undefined;
    const fresh = makeProject(group, {
      files: files.filter((f) => f.kind === "video").map((f) => f.name).slice(0, 6).concat(match?.isDefault ? [] : []),
      photos: match?.photosMatched.length ?? group.photos.length,
      ...(targets ? { platforms: targets } : {}),
      title: match?.isDefault ? friendlyTitle(files[0]?.name ?? "upload") : group.title,
    });
    // live: keep the server's id/version/timeline but apply what this screen knows (upload tab targets, file names)
    const p: Project = server ? { ...server, files: fresh.files, photos: fresh.photos, platforms: fresh.platforms, title: fresh.title } : fresh;
    if (!p.files.length) p.files = group.inputs.map((i) => i.filenames[0]);
    if (!isPhotoReel(group) && useStore.getState().creatorDNA.editing.zooms === "punchy") p.timeline = p.timeline.map((s, i) => (i === 0 ? { ...s, zoom: 12 } : s));
    const song = useStore.getState().pickedTrack;
    if (song) { p.audioId = song.id; if (p.noAudio) p.noAudio = false; }
    upsertProject(p);
    if (isPhotoReel(group)) addAssets(photoAssets(group, match, p.createdAt));
    useStore.getState().notify("Video generated", `${p.title} is ready in Studio.`);
    setResult(p); setBusy(null);
    toast("Generated", "Opened in Studio history");
  };

  const generateRef = useRef(generate);
  generateRef.current = generate;
  useEffect(() => {
    if (!match || match.isDefault || busy || job || result || existing || !(isPhotoReel(group) ? match.matched.length >= GENERATE_MIN : (group?.kind === "lecture-merge" || group?.kind === "vlog-merge") && match.matched.length === group.inputs.length)) return;
    const id = setTimeout(() => void generateRef.current(), 1100); // long enough to read "Recognised 18 photos"
    return () => clearTimeout(id);
  }, [match, busy, job, result, existing, group]);

  const visible = projects.filter((p) => {
    if (p.type !== (kind === "short" ? "Short" : "Video")) return false;
    if (kind === "video" && tab !== "All") { const t = groupById(p.groupId).type; return tab === "Other" ? !["Podcast", "Lecture", "Vlog"].includes(t) : t === tab; }
    return true;
  });
  const missing = match?.missingRoles.length ?? 0;
  const tie = (match?.candidates.length ?? 0) > 1 && !pick;

  return (
    <div className="mx-auto max-w-[1400px]">
      {!embedded && <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="t-label text-muted">{kind === "short" ? "9:16 · Reels, Shorts, Stories, Ads" : "16:9 · Podcasts, lectures, vlogs"}</p>
          <h1 className="t-h1 mt-2">{kind === "short" ? "Short Videos" : "Videos"}</h1>
        </div>
        <SlidingNav id={`ws-${kind}`} items={tabs as unknown as { id: string; label: string }[]} value={tab} onChange={setTab} />
      </Reveal>}

      {!embedded && <AiClipLab format={kind} />}

      {/* upload zone */}
      {showDrop && kind === "short" && <div className="mb-3"><SongPick /></div>}
      {showDrop && <section aria-label="Upload" className={embedded ? "grid gap-3" : "grid gap-6 lg:grid-cols-5"}>
        <div className={embedded ? "" : "lg:col-span-3"}>
          <motion.div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); onFiles(e.dataTransfer.files); }}
            animate={{ scale: drag ? 1.02 : 1 }} transition={{ type: "spring", stiffness: 400, damping: 14 }}
            className={clsx("grain relative grid place-items-center rounded-3xl border-2 border-dashed text-center transition-colors", embedded ? "min-h-[190px] p-5" : "min-h-[300px] p-8", drag ? "border-brand bg-brand/10" : "border-line bg-surface")}>
            <div className={clsx("relative z-10 grid justify-items-center", embedded ? "gap-2.5" : "gap-4")}>
              <motion.div animate={{ y: drag ? -10 : [0, -6, 0] }} transition={drag ? undefined : { repeat: Infinity, duration: 2.6 }} className={clsx("grid place-items-center rounded-2xl bg-brand text-brand-ink", embedded ? "h-12 w-12" : "h-16 w-16")}><UploadCloud /></motion.div>
              <h2 className={embedded ? "font-display text-2xl tracking-tight" : "t-h2"}>{dropTitle ?? "Drop your videos and photos here"}</h2>
              <p className="max-w-md text-sm text-muted">{dropHint ?? "Add a set of videos plus photos and audio, in any order. We recognise the set by fingerprint, not by upload order."}</p>
              <input ref={input} type="file" multiple accept="video/*,image/*,audio/*" className="sr-only" aria-label="Choose files" onChange={(e) => e.target.files && onFiles(e.target.files)} />
              <div className="flex flex-wrap justify-center gap-2">
                <button className="btn-primary" onClick={() => input.current?.click()}>Choose files</button>
              </div>
            </div>
          </motion.div>
        </div>

        {embedded ? (
          <details className="group mx-auto w-full max-w-2xl text-center">
            <summary className="cursor-pointer list-none text-sm text-muted underline-offset-4 hover:text-text hover:underline">No files handy? Try a sample set</summary>
            <div className="card mt-3 p-4 text-left">

            <h2 className="t-label text-muted">No files handy? Try a sample set</h2>
            <ul className="mt-4 grid gap-2">
              {groups.filter((g) => kind === "short" || true).map((g) => (
                <li key={g.id}>
                  <button onClick={() => useSample(g.id)} className="flex w-full items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-left text-sm transition-colors hover:border-brand hover:bg-sunken">
                    <Poster seed={g.hue} className="h-10 w-10 shrink-0 rounded-lg"><span className="absolute inset-0 grid place-items-center text-xs font-bold text-brand-ink">{g.id.toUpperCase()}</span></Poster>
                    <span className="min-w-0 flex-1"><span className="block truncate font-medium">{g.title}</span><span className="text-xs text-muted">{isPhotoReel(g) ? `${g.inputs.length} photos` : "3 clips + 1 photo"} · {g.format === "short" ? "Short" : "Video"} · {g.type}</span></span>
                  </button>
                </li>
              ))}
            </ul>
          
</div>
          </details>
        ) : (
          <div className="lg:col-span-2">
            <div className="card h-full p-6">

            <h2 className="t-label text-muted">No files handy? Try a sample set</h2>
            <ul className="mt-4 grid gap-2">
              {groups.filter((g) => kind === "short" || true).map((g) => (
                <li key={g.id}>
                  <button onClick={() => useSample(g.id)} className="flex w-full items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-left text-sm transition-colors hover:border-brand hover:bg-sunken">
                    <Poster seed={g.hue} className="h-10 w-10 shrink-0 rounded-lg"><span className="absolute inset-0 grid place-items-center text-xs font-bold text-brand-ink">{g.id.toUpperCase()}</span></Poster>
                    <span className="min-w-0 flex-1"><span className="block truncate font-medium">{g.title}</span><span className="text-xs text-muted">{isPhotoReel(g) ? `${g.inputs.length} photos` : "3 clips + 1 photo"} · {g.format === "short" ? "Short" : "Video"} · {g.type}</span></span>
                  </button>
                </li>
              ))}
            </ul>
          
</div>
          </div>
        )}
      </section>}

      {!embedded && kind === "short" && tab === "Ads" && (
        <Reveal className="card mt-6 grid gap-4 p-6 sm:grid-cols-3">
          <div><label className="t-label mb-2 block text-muted" htmlFor="cta">CTA text</label><input id="cta" className="input" value={cta} onChange={(e) => setCta(e.target.value)} /></div>
          <div><span className="t-label mb-2 block text-muted">Length variant</span><div className="flex gap-2">{([15, 30] as const).map((v) => <button key={v} aria-pressed={variant === v} onClick={() => setVariant(v)} className={clsx("chip px-4 py-2 text-sm", variant === v && "border-brand bg-brand text-brand-ink")}>{v} s</button>)}</div></div>
          <label className="flex items-center gap-3 pt-6 text-sm"><input type="checkbox" checked={safe} onChange={(e) => setSafe(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--brand))]" />Show safe-zone overlay</label>
        </Reveal>
      )}

      {/* reading / match summary */}
      <AnimatePresence mode="wait">
        {busy === "reading" && (
          <motion.div key="read" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="card grid gap-4 p-6" role="status">
            <div className="flex items-center gap-3 text-sm font-medium">Reading your files
              <span className="flex gap-1" aria-hidden="true">{[0, 1, 2].map((i) => <motion.span key={i} className="h-1.5 w-1.5 rounded-full bg-brand" animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.15 }} />)}</span></div>
            <span className="relative h-1.5 overflow-hidden rounded-full bg-sunken"><motion.span className="absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-brand to-transparent" animate={{ left: ["-33%", "100%"] }} transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }} /></span>
            <p className="text-xs text-muted">Matching your clips to known sets.</p>
          </motion.div>
        )}
        {match && busy !== "reading" && !result && (
          <motion.section key="match" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={clsx("card p-6", !embedded && "mt-6")} aria-live="polite">
            {match.isDefault ? (
              <>
                <h2 className="font-display text-2xl">Didn't recognise this set, no problem</h2>
                <p className="mt-1 text-sm text-muted">We'll run a generic quick edit on {files.length} file(s): hook, story beat, CTA.</p>
              </>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="font-display text-2xl">{isPhotoReel(group) ? recognisedLabel(match.matched.length, group?.inputs.length ?? PHOTO_COUNT) : <>Recognised {match.matched.length} clip{match.matched.length !== 1 && "s"}{match.photosMatched.length ? ` · ${match.photosMatched.length} photo` : ""}</>}</h2>
                  {group && <span className="chip">{group.title}</span>}
                </div>
                <ul className="mt-4 flex flex-wrap gap-2 text-sm">
                  {isPhotoReel(group)
                    ? <li className="chip py-1.5"><ImageIcon size={14} /> {match.matched.length} of {group?.inputs.length} photos</li>
                    : <>{match.matched.map((m) => <li key={m.role} className="chip py-1.5"><FileVideo size={14} /> Role {m.role} · {m.fileName}</li>)}
                  {match.photosMatched.map((n) => <li key={n} className="chip py-1.5"><ImageIcon size={14} /> {n}</li>)}</>}
                  {match.unused.map((n) => <li key={n} className="chip py-1.5 text-muted">{n} · not used</li>)}
                  {match.duplicates.map((n) => <li key={n} className="chip py-1.5 text-muted">{n} · duplicate ignored</li>)}
                </ul>
                {tie && <div className="mt-4"><p className="mb-2 text-sm">Which set did you mean?</p><div className="flex gap-2">{match.candidates.map((c) => <button key={c.groupId} className="chip px-4 py-2 text-sm hover:bg-sunken" onClick={() => setPick(c.groupId)}>{c.groupId.toUpperCase()} · {groupById(c.groupId).title}</button>)}</div></div>}
                {missing > 0 && !tie && <p className="mt-4 rounded-xl border border-warn/40 bg-warn/10 p-3 text-sm">{isPhotoReel(group) ? `${missing} photo${missing === 1 ? "" : "s"} missing (${match.missingRoles.join(", ")}). Add them, or generate anyway.` : `${missing} clip missing (role ${match.missingRoles.join(", ")}). Add it, or generate with what you have.`}</p>}
                {match.photosMatched.length === 0 && group?.photos.length ? <p className="mt-3 text-sm text-muted">No photo uploaded, using this set's default photo.</p> : null}
              </>
            )}
            {existing && !tie && (
              <p className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-sunken p-3 text-sm">Already generated · <button className="font-medium text-brand underline" onClick={() => router.push(`/studio/${existing.id}`)}>open it?</button></p>
            )}
            <div className="mt-6 flex flex-wrap gap-2">
              <button className="btn-brand" disabled={tie || busy === "job"} onClick={generate}><Sparkles size={16} />{existing ? "Generate again" : missing ? "Generate anyway" : "Generate"}</button>
              <button className="btn-ghost" onClick={reset}>Start over</button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* job theatre */}
      {job && !result && (
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className={clsx("card grid items-center gap-6 p-6 sm:grid-cols-[auto_1fr]", !embedded && "mt-6")} aria-live="polite" aria-label="Generation progress">
          <JobRing progress={job.progress} />
          <ol className="grid grid-cols-1 gap-x-8 gap-y-1.5 text-sm md:grid-cols-2">
            {job.steps.map((s, i) => (
              <motion.li key={s.label} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className={clsx("flex items-center gap-3 transition-colors duration-500", i > job.step ? "text-muted" : i === job.step && "font-medium")}>
                <span className={clsx("grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px] transition-colors duration-500", i < job.step ? "border-ok bg-ok text-bg" : i === job.step ? "border-brand" : "border-line")}>
                  {i < job.step ? <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 22 }}><Check size={12} /></motion.span> : i === job.step ? <motion.span className="h-2 w-2 rounded-full bg-brand" animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1 }} /> : null}
                </span>{s.label}
              </motion.li>
            ))}
          </ol>
        </motion.section>
      )}

      {/* output */}
      {result && group && (
        <motion.section initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className={clsx("card grid gap-6 p-6", embedded ? "md:grid-cols-[120px_1fr]" : "mt-6 md:grid-cols-[220px_1fr]")} aria-label="Generated video">
          {result.reel ? (
            <div className={clsx("relative w-full overflow-hidden rounded-2xl border border-line", result.groupId === "lecture-merge" ? "aspect-video max-w-[360px]" : embedded ? "aspect-[9/16] max-w-[120px]" : "aspect-[9/16] max-w-[220px]")}>
              <ReelPreview src={result.reel.video} poster={result.reel.poster} label={result.title} className="h-full w-full" muted={result.groupId !== "lecture-merge" && result.groupId !== "vlog-merge"} />
              <span className="pointer-events-none absolute bottom-3 right-3 rounded-md bg-text/80 px-2 py-0.5 text-xs text-bg">{fmtTime(totalDur(result.timeline))}</span>
            </div>
          ) : (
            <Poster seed={result.hue} label={result.title} className={clsx("w-full rounded-2xl border border-line", result.aspect === "9:16" ? (embedded ? "aspect-[9/16] max-w-[120px]" : "aspect-[9/16] max-w-[220px]") : (embedded ? "aspect-video md:w-[120px]" : "aspect-video md:w-[220px]"))}>
              <span className="absolute bottom-3 right-3 rounded-md bg-text/80 px-2 py-0.5 text-xs text-bg">{fmtTime(totalDur(result.timeline))}</span>
              <motion.span className="absolute right-3 top-3 text-brand-ink" animate={{ rotate: [0, 20, 0], scale: [1, 1.3, 1] }} transition={{ repeat: 3, duration: 0.8 }}><Sparkles size={18} /></motion.span>
            </Poster>
          )}
          <div className="flex flex-col justify-between gap-6">
            <div>
              <span className="chip border-ok/40 bg-ok/10 text-ok"><Check size={14} />Generated just now</span>
              <h2 className="t-h2 mt-3">{result.title}</h2>
              <p className="mt-2 text-sm text-muted">{result.groupId === "vlog-merge" ? `Full video from 3 clips · ${fmtTime(totalDur(result.timeline))}` : result.groupId === "lecture-merge" ? `Full video from 3 parts · ${fmtTime(totalDur(result.timeline))} · 16:9` : result.reel ? `From ${result.photos} photos · 9:16 · ${result.platforms.map((p) => PROFILES[p].label).join(" + ")}` : `From ${result.files.length} clips + ${result.photos} photo · ${result.timeline.length} edits placed by AI · ${result.platforms.map((p) => PROFILES[p].label).join(" + ")}`}</p>
              {kind === "video" && group.chapters.length > 0 && (
                <div className="mt-4"><p className="t-label text-muted">Auto chapters</p><ul className="mt-2 grid gap-1 text-sm">{group.chapters.map((c) => <li key={c.t}><span className="mr-3 font-mono text-xs text-muted">{fmtTime(c.t)}</span>{c.title}</li>)}</ul></div>
              )}
              {kind === "short" && tab === "Ads" && <p className="mt-3 text-sm">CTA end card: “{cta}” · {variant} s variant{safe ? " · safe zones on" : ""}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn-primary" onClick={() => router.push(`/studio/${result.id}`)}>Edit in Studio</button>
              {result.groupId === "lecture-merge" && <><button className="btn-ghost" onClick={() => setReport(true)}>View AI report</button><LectureReport open={report} onClose={() => setReport(false)} /></>}
              <button className="btn-ghost" onClick={reset}>Add another set</button>
            </div>
          </div>
        </motion.section>
      )}

      {/* previous projects */}
      {!embedded && <section className="mt-14" aria-labelledby="prev-h">
        <h2 id="prev-h" className="t-h2 mb-6">Previous projects</h2>
        {visible.length === 0 ? <p className="text-sm text-muted">Nothing here yet, generate your first one above.</p> : (
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {visible.map((p) => (
              <li key={p.id}>
                <Link href={`/studio/${p.id}`} className="group block">
                  <Poster seed={p.hue} label={p.title} className={clsx("w-full rounded-2xl border border-line transition-transform group-hover:scale-[0.98]", p.type === "Short" ? "aspect-[4/5]" : "aspect-video")}>
                    {p.cover && <CoverFit src={p.cover} alt={p.title} className="absolute inset-0 h-full w-full" />}
                    <span className="chip absolute left-3 top-3 border-transparent bg-bg/90 text-text">{p.status}</span>
                  </Poster>
                  <div className="mt-3 text-sm font-medium leading-snug">{p.title}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">{p.platforms.map((pl) => <span key={pl} className="rounded border border-line px-1.5">{PROFILES[pl].label.split(" ").map((w) => w[0]).join("")}</span>)}<span title={absTime(p.createdAt)}>{relTime(p.createdAt)}</span></div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>}
    </div>
  );
}
