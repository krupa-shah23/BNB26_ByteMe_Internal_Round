"use client";
import { AlertTriangle, ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import clsx from "clsx";
import { LEGAL, type Risk } from "@/lib/legalReview";
import { fmtTime } from "@/lib/projects";
import { useStore } from "@/lib/store";

const tone: Record<Risk, string> = { HIGH: "border-bad/50 bg-bad/10 text-bad", "MEDIUM-HIGH": "border-warn/50 bg-warn/10 text-warn", "LOW-MEDIUM": "border-line text-warn", LOW: "border-line text-ok" };
const Pill = ({ r }: { r: Risk }) => <span className={clsx("rounded-pill border px-2.5 py-0.5 text-xs font-semibold", tone[r])}>{r}</span>;
const STAGES = ["Upload", "Analyse", "Edit", "Legal review", "Export"];

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
  const [ev, setEv] = useState<string[]>([]);
  const [warn, setWarn] = useState(true);
  const [now, setNow] = useState(0);

  if (!project || !review) return <div className="grid place-items-center gap-4 py-24 text-center"><h1 className="t-h2">No legal review for this project</h1><Link href="/studio" className="btn-primary">Back to Studio</Link></div>;

  const dur = project.reel?.durationSec ?? 60;
  const f = review.flagged;
  const jump = (t: number) => { const v = video.current; if (!v) return; v.currentTime = Math.min(t, Math.max(0, dur - 3)); setNow(v.currentTime); };
  const pos = (t: number) => `${(Math.min(t, dur - 3) / dur) * 100}%`;
  const resolved = choice === "replaced" || (choice === "kept" && ack);
  const issues = 1 + review.related.length;
  const highCount = 1, lowCount = review.related.length;
  const rewrite = review.rewrites[alt % review.rewrites.length];

  return (
    <div className="mx-auto max-w-6xl pb-24">
      <Link href={`/studio/${project.id}`} className="inline-flex items-center gap-1 text-sm text-muted hover:text-text"><ArrowLeft size={14} />Back to Studio</Link>
      <ol className="mt-3 flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted" aria-label="Stages">{STAGES.map((s, i) => <li key={s} className={clsx(s === "Legal review" && "font-semibold text-text")}>{i > 0 && "→ "}{s}</li>)}</ol>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="t-h1">Legal &amp; Safety Review</h1><p className="mt-1 text-muted">Review potential risks before publishing.</p></div>
        <span className="chip border-ok text-ok">● Analysis complete</span>
      </div>

      <section className={clsx("mt-6 rounded-3xl border p-6", tone[review.overall])} aria-label="Risk summary">
        <p className="t-label">Overall risk</p>
        <p className="font-display text-4xl tracking-tight">{review.overall} RISK</p>
        <p className="mt-2 text-sm"><b>{highCount} high-risk issue</b> · {lowCount} lower-risk observations</p>
        <p className="mt-2 max-w-3xl text-sm text-text">{review.headline}</p>
        <button className="btn-primary mt-4" onClick={() => jump(f.at)}>Review flagged content</button>
      </section>

      {warn && (
        <section role="alert" className="mt-6 rounded-3xl border border-warn/40 bg-warn/10 p-5">
          <p className="flex items-center gap-2 font-semibold"><AlertTriangle size={16} />Publication risk detected</p>
          <p className="mt-2 text-sm">{review.warning}</p>
          <p className="mt-2 text-sm"><b>Recommended action:</b> Review before publishing.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn-primary py-2" onClick={() => { setChoice("replaced"); toast("Statement replaced", "Applied the suggested wording to your script"); }}>Replace statement</button>
            <button className="btn-ghost py-2" onClick={() => { setChoice("kept"); document.getElementById("ev")?.scrollIntoView({ behavior: "smooth" }); }}>Keep &amp; review</button>
            <button className="btn-ghost py-2" onClick={() => setWarn(false)}>Dismiss warning</button>
          </div>
        </section>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <section className="lg:col-span-3" aria-label="Video">
          <div className="overflow-hidden rounded-3xl border border-line bg-sunken">
            <video ref={video} src={project.reel?.video} controls playsInline preload="metadata" onTimeUpdate={(e) => setNow(e.currentTarget.currentTime)} className="mx-auto max-h-[460px] w-full object-contain" />
          </div>
          <div className="mt-4" aria-label="Risk timeline">
            <div className="relative h-8">
              <div className="absolute inset-x-0 top-3.5 h-1 rounded-full bg-sunken" />
              <div className="absolute left-0 top-3.5 h-1 rounded-full bg-brand" style={{ width: `${Math.min(100, (now / dur) * 100)}%` }} />
              <button aria-label={`High risk at ${f.ts}`} onClick={() => jump(f.at)} style={{ left: pos(f.at) }} className="absolute top-1 grid h-6 w-6 -translate-x-1/2 place-items-center rounded-full bg-bad text-bg"><AlertTriangle size={12} /></button>
              {review.related.map((r) => <button key={r.ts} aria-label={`${r.risk} at ${r.ts}`} onClick={() => jump(r.at)} style={{ left: pos(r.at) }} className={clsx("absolute top-2.5 h-3 w-3 -translate-x-1/2 rounded-full", r.risk === "LOW" ? "bg-ok" : "bg-warn")} />)}
            </div>
            <div className="flex justify-between text-xs text-muted"><span>0:00</span><span>{fmtTime(now)} / {fmtTime(dur)}</span></div>
          </div>
        </section>

        <aside className="card p-6 lg:col-span-2" aria-label="Flagged claim">
          <p className="t-label flex items-center gap-2 text-bad"><AlertTriangle size={14} />High-risk claim</p>
          <button className="mt-2 font-mono text-sm text-brand underline underline-offset-4" onClick={() => jump(f.at)}>{f.ts}</button>
          <blockquote className="mt-2 font-display text-2xl leading-snug">“{f.text}”</blockquote>
          <dl className="mt-4 grid gap-3 text-sm">
            {([["Classification", f.kind], ["Target", f.target], ["Alleged conduct", f.conduct], ["Evidence detected in transcript", f.evidence]] as const).map(([k, v]) => <div key={k}><dt className="text-xs text-muted">{k}</dt><dd className="font-medium">{v}</dd></div>)}
            <div><dt className="text-xs text-muted">Risk level</dt><dd className="mt-1"><Pill r={f.risk} /></dd></div>
          </dl>
        </aside>
      </div>

      <section className="mt-8" aria-labelledby="why-h">
        <h2 id="why-h" className="t-label text-muted">Why was this flagged?</h2>
        <ul className="mt-3 grid max-w-3xl gap-2 text-sm">{f.why.map((w) => <li key={w}>{w}</li>)}</ul>
        <div className="mt-4 overflow-hidden rounded-2xl border border-line">
          <table className="w-full text-left text-sm"><thead className="bg-sunken text-xs text-muted"><tr><th className="p-3">Statement</th><th className="p-3">AI classification</th><th className="p-3">Risk</th></tr></thead>
            <tbody>
              <tr className="border-t border-line"><td className="p-3"><button className="text-left underline-offset-4 hover:underline" onClick={() => jump(f.at)}>{f.ts} · “{f.text}”</button></td><td className="p-3">{f.kind}</td><td className="p-3"><Pill r={f.risk} /></td></tr>
              {review.related.map((r) => <tr key={r.ts} className="border-t border-line"><td className="p-3"><button className="text-left underline-offset-4 hover:underline" onClick={() => jump(r.at)}>{r.ts} · “{r.text}”</button><p className="mt-1 text-xs text-muted">{r.note}</p></td><td className="p-3">{r.kind}</td><td className="p-3"><Pill r={r.risk} /></td></tr>)}
            </tbody></table>
        </div>
      </section>

      <section className="mt-8" aria-labelledby="rw-h">
        <h2 id="rw-h" className="t-label text-muted">Suggested rewrite</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-line p-4"><p className="text-xs text-muted">Original</p><p className="mt-1">“{f.text}”</p></div>
          <div className={clsx("rounded-2xl border p-4", choice === "replaced" ? "border-ok" : "border-brand")}><p className="text-xs text-muted">CreatorAI suggestion</p><p className="mt-1">“{rewrite}”</p></div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn-primary py-2" onClick={() => { setChoice("replaced"); toast("Statement replaced", "Applied the suggested wording to your script"); }}>{choice === "replaced" ? "✓ Replaced" : "Replace statement"}</button>
          <button className="btn-ghost py-2" onClick={() => setAlt((a) => a + 1)}>Generate another rewrite</button>
          <button className="btn-ghost py-2" onClick={() => setChoice("kept")}>Keep original</button>
        </div>
        {choice === "kept" && (
          <label className="mt-3 flex max-w-xl items-start gap-2 rounded-2xl border border-warn/40 bg-warn/10 p-3 text-sm">
            <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-1 accent-[rgb(var(--brand))]" />
            <span>This statement has been identified as potentially high-risk. I understand this claim may require supporting evidence.</span>
          </label>
        )}
      </section>

      <section id="ev" className="mt-8" aria-labelledby="ev-h">
        <details open>
          <summary id="ev-h" className="t-label cursor-pointer text-muted">Evidence check</summary>
          <p className="mt-3 text-sm">What could support this claim? No supporting evidence was detected in the uploaded video.</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">{review.evidence.map((e) => <li key={e}><label className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm"><input type="checkbox" checked={ev.includes(e)} onChange={() => setEv((c) => (c.includes(e) ? c.filter((x) => x !== e) : [...c, e]))} className="accent-[rgb(var(--brand))]" />{e}</label></li>)}</ul>
        </details>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/95 px-5 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm">{resolved ? <Check size={16} className="text-ok" /> : <AlertTriangle size={16} className="text-warn" />}{resolved ? `${issues} items reviewed` : "Resolve the high-risk statement to continue"}</p>
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => toast("Changes saved", "Your review choices are saved")}>Save changes</button>
            <button className="btn-primary" disabled={!resolved} onClick={() => router.push(`/review/clip_${project.id}`)}>Continue to Publish</button>
          </div>
        </div>
      </div>
    </div>
  );
}
