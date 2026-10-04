"use client";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import clsx from "clsx";
import { LEGAL, type Risk } from "@/lib/legalReview";
import { fmtTime } from "@/lib/projects";
import { useStore } from "@/lib/store";

const tone: Record<Risk, string> = { HIGH: "border-bad/40 bg-bad/10 text-bad", "MEDIUM-HIGH": "border-warn/40 bg-warn/10 text-warn", MEDIUM: "border-warn/40 bg-warn/10 text-warn", "LOW-MEDIUM": "border-line text-warn", LOW: "border-line text-ok" };
const Pill = ({ r }: { r: Risk }) => <span className={clsx("inline-block whitespace-nowrap rounded-pill border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider", tone[r])}>{r.toLowerCase()} risk</span>;
const Tag = ({ children }: { children: React.ReactNode }) => <span className="inline-block rounded-pill bg-sunken px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted">{children}</span>;
const card = "rounded-[28px] border border-text/10 bg-surface p-6";
const head = "text-xs font-semibold uppercase tracking-[0.14em] text-muted";

export default function LegalPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const { projects, toast } = useStore();
  const project = projects.find((p) => p.id === projectId);
  const review = project ? LEGAL[project.groupId] : undefined;
  const video = useRef<HTMLVideoElement>(null);
  const [choice, setChoice] = useState<"open" | "replaced" | "kept">("open");
  const [alt, setAlt] = useState(0);
  const [ack, setAck] = useState(false);
  const [now, setNow] = useState(0);

  if (!project || !review) return <div className="grid place-items-center gap-4 py-24 text-center"><h1 className="t-h2">No legal review for this project</h1><Link href="/studio" className="btn-primary">Back to Studio</Link></div>;

  const dur = project.reel?.durationSec ?? 60;
  const f = review.flagged;
  const jump = (t: number) => { const v = video.current; if (!v) return; v.currentTime = Math.min(t, Math.max(0, dur - 3)); setNow(v.currentTime); void v.play().catch(() => {}); };
  const pos = (t: number) => `${(Math.min(t, dur - 3) / dur) * 100}%`;
  const resolved = !review.blocking || choice === "replaced" || (choice === "kept" && ack);
  const rewrite = review.rewrites[alt % review.rewrites.length];

  return (
    <div className="mx-auto max-w-6xl pb-28">
      <Link href={`/studio/${project.id}`} className="inline-flex items-center gap-1 text-sm text-muted hover:text-text"><ArrowLeft size={14} />Back to Studio</Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={head}>Legal review</p>
          <h1 className="mt-1 font-display text-[clamp(1.6rem,3vw,2.3rem)] font-medium leading-tight tracking-[-0.03em]">{review.title}</h1>
        </div>
        <span className={clsx("chip py-1.5 text-xs font-semibold uppercase tracking-wider", tone[review.overall])}><AlertTriangle size={13} />{review.overall.toLowerCase()} risk overall</span>
      </div>
      <p className="mt-2 max-w-3xl text-muted">{review.headline}</p>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section aria-label="Video" className={clsx(card, "p-4")}>
          <div className="overflow-hidden rounded-2xl bg-text/5">
            <video ref={video} src={project.reel?.video} controls playsInline preload="metadata" onTimeUpdate={(e) => setNow(e.currentTarget.currentTime)} className="mx-auto max-h-[440px] w-full object-contain" />
          </div>
          <div className="mt-4 px-1" aria-label="Risk timeline">
            <div className="relative h-8">
              <div className="absolute inset-x-0 top-3.5 h-1 rounded-full bg-sunken" />
              <div className="absolute left-0 top-3.5 h-1 rounded-full bg-brand" style={{ width: `${Math.min(100, (now / dur) * 100)}%` }} />
              <button aria-label={`Flagged statement at ${f.ts}`} onClick={() => jump(f.at)} style={{ left: pos(f.at) }} className={clsx("absolute top-1 grid h-6 w-6 -translate-x-1/2 place-items-center rounded-full text-bg", f.risk === "HIGH" ? "bg-bad" : "bg-warn")}><AlertTriangle size={12} /></button>
              {review.related.map((r) => <button key={r.ts} aria-label={`${r.risk} at ${r.ts}`} onClick={() => jump(r.at)} style={{ left: pos(r.at) }} className={clsx("absolute top-2.5 h-3 w-3 -translate-x-1/2 rounded-full", r.risk === "LOW" ? "bg-ok" : "bg-warn")} />)}
            </div>
            <div className="flex justify-between text-xs text-muted"><span>0:00</span><span>{fmtTime(now)} / {fmtTime(dur)}</span></div>
          </div>
        </section>

        <aside aria-label="Flagged statement" className={card}>
          <div className="flex items-center justify-between gap-2">
            <p className={head}>Flagged statement</p>
            <Pill r={f.risk} />
          </div>
          <button className="mt-3 font-mono text-sm text-brand underline underline-offset-4" onClick={() => jump(f.at)}>{f.ts}</button>
          <blockquote className="mt-1 font-display text-2xl leading-snug tracking-tight">“{f.text}”</blockquote>
          <div className="mt-3"><Tag>{f.kind}</Tag></div>
          <p className={clsx(head, "mt-5")}>Why it was flagged</p>
          <p className="mt-1.5 text-sm leading-relaxed">{f.why}</p>
        </aside>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section aria-label="Assertion versus opinion" className={card}>
          <p className={head}>Assertion vs opinion</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-line p-4">
              <p className="text-xs text-muted">Detected as</p>
              <p className="mt-1 font-display text-lg tracking-tight">{review.contrast.detected}</p>
              <p className="mt-2 text-sm text-muted">{review.contrast.why}</p>
            </div>
            <div className="rounded-2xl border border-ok/40 bg-ok/5 p-4">
              <p className="text-xs text-muted">Lower-risk framing</p>
              <p className="mt-1 font-display text-lg tracking-tight">{review.contrast.lowerLabel}</p>
              <p className="mt-2 text-sm">“{review.contrast.lowerText}”</p>
            </div>
          </div>
        </section>

        <section aria-label="Suggested rewrite" className={card}>
          <p className={head}>Suggested rewrite</p>
          <p className="mt-3 rounded-2xl border border-brand/40 bg-brand/5 p-3.5 text-sm leading-relaxed">“{rewrite}”</p>
          <p className="mt-2 text-xs text-muted"><b className="font-medium text-text">Why this rewrite: </b>{review.rewriteWhy[0]}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn-primary px-4 py-2 text-sm" onClick={() => { setChoice("replaced"); toast("Statement replaced", "Applied the suggested wording to your script"); }}>{choice === "replaced" ? <><Check size={14} />Replaced</> : "Replace statement"}</button>
            <button className="btn-ghost px-3 py-2 text-sm" onClick={() => { setAlt((a) => a + 1); if (choice === "replaced") setChoice("open"); }}><RefreshCw size={13} />Another</button>
            <button className={clsx("btn-ghost px-3 py-2 text-sm", choice === "kept" && "border-text")} onClick={() => setChoice("kept")}>Keep original</button>
          </div>
          {choice === "kept" && review.blocking && (
            <label className="mt-3 flex items-start gap-2 rounded-2xl border border-warn/40 bg-warn/10 p-3 text-sm">
              <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-1 accent-[rgb(var(--brand))]" />
              <span>I understand this claim may need supporting evidence.</span>
            </label>
          )}
        </section>
      </div>

      {review.related.length > 0 && (
        <section className={clsx(card, "mt-5")} aria-label="Other observations">
          <p className={head}>Other observations</p>
          <ul className="mt-3 divide-y divide-text/10">
            {review.related.map((r) => (
              <li key={r.ts} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <button className="min-w-0 flex-1 text-left text-sm hover:opacity-70" onClick={() => jump(r.at)}>
                  <span className="mr-2 font-mono text-xs text-brand">{r.ts}</span>“{r.text}”
                  <span className="mt-1 block"><Tag>{r.kind}</Tag></span>
                  <span className="mt-1 block text-xs text-muted">{r.note}</span>
                </button>
                <Pill r={r.risk} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/90 px-5 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm">{resolved && review.blocking ? <Check size={16} className="text-ok" /> : <AlertTriangle size={16} className="text-warn" />}{resolved && review.blocking ? "Ready to publish" : review.bar}</p>
          <button className="btn-primary" disabled={!resolved} onClick={() => router.push(`/review/clip_${project.id}`)}>Continue to publish<ArrowRight size={16} /></button>
        </div>
      </div>
    </div>
  );
}
