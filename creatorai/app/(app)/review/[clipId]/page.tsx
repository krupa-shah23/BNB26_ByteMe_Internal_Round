"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, ExternalLink, Heart, MessageCircle, Music2, Send } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { Badge, Ring } from "@/components/ui/bits";
import { ThumbCard } from "@/components/studio/Tools";
import { ScoreChip } from "@/components/studio/compliance/ScoreChip";
import { analyzeProject, computeAdSafe, openPii, unknownPeople } from "@/lib/compliance/analyze";
import { DISCLAIMER, precheck, trackById, type PrecheckItem, type Severity } from "@/lib/precheck";
import { fireHearts } from "@/lib/hearts";
import { PROFILES, fmtTime, normalize, totalDur } from "@/lib/projects";
import { runJob } from "@/lib/services/demo";
import { useStore } from "@/lib/store";
import rules from "@/fixtures/rules.json";

const sevTone: Record<Severity, "ok" | "warn" | "bad"> = { pass: "ok", warn: "warn", fail: "bad" };

export default function Review() {
  const { clipId } = useParams<{ clipId: string }>();
  const router = useRouter();
  const { projects, patchProject, toast, notify } = useStore();
  const project = projects.find((p) => p.clipId === clipId || `clip_${p.id}` === clipId);
  const [open, setOpen] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [phase, setPhase] = useState<"review" | "publishing" | "done">("review");
  const [step, setStep] = useState("");
  const [cheers, setCheers] = useState(0);
  const publishing = useRef(false); // idempotency: double-click Publish does nothing

  const res = useMemo(() => (project ? precheck(project) : null), [project]);
  useEffect(() => { if (res && !open) { const first = res.items.find((i) => i.severity !== "pass"); if (first) setOpen(first.id); } /* eslint-disable-next-line */ }, [!!project]);

  const comp = useMemo(() => (project ? project.compliance ?? analyzeProject(project) : null), [project]);

  if (!project || !res || !comp) return <div className="grid place-items-center gap-4 py-24 text-center"><h1 className="t-h2">Clip not found</h1><Link href="/studio" className="btn-primary">Back to Studio</Link></div>;

  const grouped = (["fail", "warn", "pass"] as Severity[]).map((s) => ({ s, items: res.items.filter((i) => i.severity === s) })).filter((g) => g.items.length);
  const unknown = unknownPeople(comp);
  const piiLeft = openPii(comp).length;
  const ad = computeAdSafe(project, comp);
  // unresolved consent blocks publishing; PII and claims are advisory
  const canPublish = res.summary.fail === 0 && (res.summary.warn === 0 || accepted) && unknown.length === 0;
  const track = trackById(project.audioId);

  const fix = (i: PrecheckItem) => {
    if (!i.fix) return;
    if (i.fix.action === "swap-audio") { const next = rules.swapAudio[0]; patchProject(project.id, { audioId: next }); toast("Audio swapped", `${trackById(next)?.title}, re-running checks`); }
    if (i.fix.action === "add-cta") {
      const tl = normalize([...project.timeline, { id: `cta_${Date.now()}`, at: 0, dur: 3, kind: "cta", caption: "Follow for more", touched: true }]);
      patchProject(project.id, { timeline: tl }); toast("CTA slate added");
    }
    if (i.fix.action === "shorten-thumb" && project.thumb) patchProject(project.id, { thumb: { ...project.thumb, text: project.thumb.text.split(" ").slice(0, 3).join(" ") } });
  };

  const publish = async () => {
    if (publishing.current || !canPublish) return;
    publishing.current = true; setPhase("publishing");
    await runJob([{ label: "Uploading video", ms: 900 }, { label: "Setting cover + caption", ms: 800 }, ...project.platforms.map((p) => ({ label: `Publishing to ${PROFILES[p].label}`, ms: 700 }))], (p) => setStep(p.steps[Math.min(p.stepIndex, p.steps.length - 1)].label));
    patchProject(project.id, { status: "Published" });
    notify("Published 🎉", project.title);
    setPhase("done");
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    fireHearts({ count: 100, onCount: setCheers });
  };

  const first = project.timeline[0];
  return (
    <div className="mx-auto max-w-[1300px]">
      <Link href={`/studio/${project.id}`} className="t-label text-muted hover:text-text">← Back to editor</Link>
      <h1 className="t-h1 mt-2">Review</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[360px_1fr]">
        {/* phone mockup */}
        <div className="mx-auto w-full max-w-[340px]">
          <div className="rounded-[2.5rem] border-[8px] border-text bg-surface p-2 shadow-soft">
            <div className="relative overflow-hidden rounded-[1.8rem]">
              <div className={clsx("relative", project.aspect === "9:16" ? "aspect-[9/16]" : "aspect-video")}>
                <ThumbCard hue={project.hue} url={project.thumb?.url ?? project.cover} frame={project.thumb?.frame ?? 0} text={project.thumb?.text ?? "No thumbnail"} template={project.thumb?.template ?? "blur"} cutout={!!project.thumb && !project.reel} className="!aspect-auto h-full" />
                {first?.caption && <div className="absolute inset-x-4 bottom-[34%] text-center"><span className="inline-block rounded-xl bg-text/75 px-3 py-1.5 font-display text-sm text-bg">{first.caption}</span></div>}
                <div className="absolute right-3 bottom-[22%] grid gap-4 text-brand-ink"><Heart size={22} /><MessageCircle size={22} /><Send size={22} /></div>
                <div className="absolute inset-x-3 bottom-3 text-brand-ink" style={{ textShadow: "0 1px 6px rgb(var(--text) / .7)" }}>
                  <div className="text-xs font-semibold">@aarav.makes</div>
                  <div className="line-clamp-2 text-xs">{project.caption?.caption ?? "Add a caption in Studio"}</div>
                  <div className="mt-1 text-[11px] opacity-90">{(project.caption?.hashtags ?? project.hashtags).join(" ")}</div>
                  {!project.noAudio && <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-text/50 px-2 py-0.5 text-[10px]"><Music2 size={10} />{track?.title ?? "Original audio"}</div>}
                </div>
              </div>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-muted">{PROFILES[project.platforms[0]].label} preview · {fmtTime(totalDur(project.timeline))}</p>
        </div>

        <div>
          <div className="card flex flex-wrap items-center gap-6 p-6">
            <Ring value={res.score} label="Readiness" />
            <div className="grid flex-1 gap-2">
              <div className="flex flex-wrap gap-2"><ScoreChip score={ad.score} /><Badge tone="bad">{res.summary.fail} fail</Badge><Badge tone="warn">{res.summary.warn} warn</Badge><Badge tone="ok">{res.summary.pass} pass</Badge></div>
              <p className="text-sm text-muted">{res.summary.fail ? "Fix the failing checks to publish." : res.summary.warn ? "Warnings can be accepted, or fixed in one click." : "All clear. Nice work."}</p>
              {res.summary.fail === 0 && res.summary.warn > 0 && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--brand))]" />I've read the warnings, publish anyway</label>}
            </div>
            <button className="btn-brand h-14 px-8 text-base" disabled={!canPublish || phase !== "review"} onClick={publish}>Publish</button>
          </div>

          {unknown.length > 0 && (
            <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-2xl border border-bad/50 bg-bad/10 p-4" aria-label="Consent review">
              <p className="text-sm font-semibold text-bad">⚠ {unknown.length} {unknown.length === 1 ? "person requires" : "people require"} consent review</p>
              <ul className="mt-2 grid gap-1 text-sm">{unknown.map((p) => <li key={p.id} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-bad" />{p.name || p.label}, Unknown</li>)}</ul>
              <div className="mt-3 flex flex-wrap items-center gap-3"><button className="btn-brand py-2" onClick={() => router.push(`/studio/${project.id}?check=people`)}>Review people</button><span className="text-xs text-muted">Publishing stays off until these are resolved.</span></div>
            </motion.section>
          )}
          {unknown.length === 0 && piiLeft > 0 && <p className="mt-4 rounded-2xl border border-warn/40 bg-warn/10 p-3 text-sm text-warn">🔒 {piiLeft} personal-info {piiLeft === 1 ? "item is" : "items are"} still visible. <Link className="underline" href={`/studio/${project.id}?check=pii`}>Review in Studio</Link></p>}

          <div className="mt-6 grid gap-6">
            {grouped.map((g) => (
              <section key={g.s} aria-label={`${g.s} checks`}>
                <h2 className="t-label mb-3 capitalize text-muted">{g.s === "pass" ? "Passed" : g.s === "warn" ? "Warnings" : "Must fix"} · {g.items.length}</h2>
                <ul className="grid gap-2">
                  {g.items.map((i) => (
                    <li key={i.id} className="card overflow-hidden">
                      <button className="flex w-full items-center gap-3 p-4 text-left" aria-expanded={open === i.id} onClick={() => setOpen(open === i.id ? null : i.id)}>
                        <span className={clsx("grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold text-bg", { ok: "bg-ok", warn: "bg-warn", bad: "bg-bad" }[sevTone[i.severity]])}>{i.severity === "pass" ? <Check size={14} /> : "!"}</span>
                        <span className="flex-1 text-sm font-medium">{i.title}</span>
                        {i.platform !== "all" && <span className="chip py-0.5 text-[11px]">{PROFILES[i.platform].label}</span>}
                        <ChevronDown size={16} className={clsx("transition-transform", open === i.id && "rotate-180")} />
                      </button>
                      <AnimatePresence initial={false}>
                        {open === i.id && (
                          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                            <div className="grid gap-3 border-t border-line p-4 pt-3 text-sm text-muted">
                              <p>{i.detail}</p>
                              <div className="flex flex-wrap items-center gap-3">
                                {i.fix && <button className="btn-brand py-2" onClick={() => fix(i)}>{i.fix.label}</button>}
                                {i.policyUrl && <a href={i.policyUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-brand underline">Policy <ExternalLink size={12} /></a>}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          <p className="mt-6 text-xs text-muted">Ad-safe score and claims review are estimates, not legal advice. {DISCLAIMER} A Content ID claim is not a copyright strike; royalty-free does not mean claim-free; Meta uses a separate system (Rights Manager).</p>
        </div>
      </div>

      {/* publishing + success */}
      <AnimatePresence>
        {phase !== "review" && (
          <motion.div className="fixed inset-0 z-[90] grid place-items-center bg-text/50 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div role="dialog" aria-modal="true" aria-label="Publishing" className="card w-full max-w-md p-8 text-center" initial={{ scale: 0.8, y: 30 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 260, damping: 18 }}>
              {phase === "publishing" ? (
                <div role="status"><motion.div className="mx-auto h-12 w-12 rounded-full border-4 border-brand border-t-transparent" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }} /><p className="mt-6 font-display text-2xl">{step || "Publishing…"}</p></div>
              ) : (
                <>
                  <motion.div animate={{ scale: [1, 1.12, 1] }} transition={{ repeat: Infinity, duration: 1.6 }} className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-brand-2 text-bg"><Heart fill="currentColor" size={36} /></motion.div>
                  <h2 className="t-h2 mt-5">It's live!</h2>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">{project.platforms.map((p, i) => <motion.span key={p} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.25 }} className="chip border-ok/40 bg-ok/10 text-ok"><Check size={12} />Published to {PROFILES[p].label}</motion.span>)}</div>
                  <p className="mt-4 text-sm text-muted">Fans cheering: <b className="text-text">{cheers}</b> <span className="text-xs">(tap the hearts!)</span></p>
                  <div className="mt-6 grid gap-2"><button className="btn-primary" onClick={() => router.push("/studio")}>See it in Studio</button><button className="btn-ghost" onClick={() => router.push("/dashboard")}>Open Dashboard</button></div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
