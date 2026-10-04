"use client";
import { animate } from "framer-motion";
import { AlertTriangle, Check, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { ThumbCard } from "../Tools";
import type { gate } from "@/lib/compliance/analyze";
import type { Project } from "@/lib/types";

function useTween(to: number) {
  const [v, setV] = useState(to);
  const from = useRef(to);
  useEffect(() => {
    const c = animate(from.current, to, { duration: 0.6, ease: "easeOut", onUpdate: (x) => { from.current = x; setV(Math.round(x)); } });
    return () => c.stop();
  }, [to]);
  return v;
}

/** "Ad-safe: 92%": same chip in the Studio header and on Review. */
export function ScoreChip({ score, className }: { score: number; className?: string }) {
  const v = useTween(score);
  const tone = score >= 85 ? "border-ok/40 bg-ok/10 text-ok" : score >= 65 ? "border-warn/40 bg-warn/10 text-warn" : "border-bad/40 bg-bad/10 text-bad";
  return <span className={clsx("chip gap-1.5 py-1.5 transition-colors duration-500", tone, className)} title="Estimated ad-safety. Updates as you clean or add issues."><ShieldCheck size={13} />Ad-safe: <b className="tabular-nums">{v}%</b></span>;
}

const Mark = ({ ok }: { ok: boolean | null }) => ok === null ? <span className="text-muted">—</span> : ok ? <Check size={14} className="text-ok" aria-label="Safe" /> : <AlertTriangle size={14} className="text-warn" aria-label="Potential monetization issue" />;

/** Title + thumbnail gate: a small status badge on each. */
export function GateRow({ project, g, title }: { project: Project; g: ReturnType<typeof gate>; title: string }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-[24px] border border-text/10 bg-surface px-4 py-3 text-sm" aria-label="Title and thumbnail ad-safety">
      <span className="flex min-w-0 items-center gap-2" title={g.title.note}><span className="text-muted">Title:</span><span className="truncate font-medium">“{title}”</span><Mark ok={g.title.ok} /></span>
      <span className="flex items-center gap-2" title={g.thumb.note}><span className="text-muted">Thumbnail:</span>
        {project.thumb ? <span className="block w-14 overflow-hidden rounded"><ThumbCard hue={project.hue} url={project.thumb.url} frame={project.thumb.frame} text={project.thumb.text} template={project.thumb.template} className="rounded" /></span> : <span className="text-xs text-muted">none yet</span>}
        <Mark ok={g.thumb.ok} /></span>
    </div>
  );
}
