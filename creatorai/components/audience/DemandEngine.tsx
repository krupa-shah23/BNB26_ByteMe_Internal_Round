"use client";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronDown, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { Skeleton } from "@/components/ui/bits";
import { DEMAND_PLATFORMS, buildResponse, demandLevel, demandService, type DemandItem, type DemandPlatform } from "@/lib/audience/demand";
import { friendlyTitle, makeProject } from "@/lib/projects";
import { groupById } from "@/lib/match";
import { useStore } from "@/lib/store";

const PLATFORM_LABEL = Object.fromEntries(DEMAND_PLATFORMS.map((p) => [p.id, p.label])) as Record<DemandPlatform, string>;
const n = (v: number) => v.toLocaleString("en-IN");

function useDemand(platform: DemandPlatform) {
  const [items, setItems] = useState<DemandItem[] | null>(null);
  useEffect(() => {
    let alive = true;
    setItems(null);
    demandService.list(platform).then((r) => { if (alive) setItems(r); });
    return () => { alive = false; };
  }, [platform]);
  return items;
}

/** Audience question → a new Studio project with the hook and script already drafted (editable, never published). */
export function useCreateResponse() {
  const router = useRouter();
  const upsert = useStore((s) => s.upsertProject);
  const toast = useStore((s) => s.toast);
  return (q: DemandItem) => {
    const r = buildResponse(q);
    const p = makeProject(groupById("_default"), { title: `Reply: ${q.q}`, prefill: { question: q.q, hook: r.hook, script: r.script, source: PLATFORM_LABEL[q.source] } });
    upsert(p);
    toast("Studio is ready", `Hook and script drafted for “${friendlyTitle(q.q)}”`);
    router.push(`/studio/${p.id}`);
  };
}

/** Segmented demand bar. Width comes from a normalised level, not the raw count. */
function DemandBar({ level, label }: { level: number; label: string }) {
  const on = Math.max(1, Math.round(level * 10));
  return (
    <span className="flex h-4 items-end gap-[3px]" role="img" aria-label={label}>
      {Array.from({ length: 10 }, (_, i) => (
        <motion.span key={i} className={clsx("w-1.5 origin-bottom rounded-sm", i < on ? "bg-brand" : "bg-line")} style={{ height: 6 + i * 1 }} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: i * 0.03, duration: 0.3 }} />
      ))}
    </span>
  );
}

function Row({ item, max, open, toggle, create }: { item: DemandItem; max: number; open: boolean; toggle: () => void; create: () => void }) {
  return (
    <li className={clsx("card overflow-hidden transition-colors", open && "border-brand")}>
      <div className="flex flex-wrap items-center gap-2 p-3 sm:flex-nowrap sm:gap-3">
        <button className="flex min-w-0 flex-1 basis-full items-center gap-3 text-left sm:basis-auto" aria-expanded={open} onClick={toggle}>
          <span className="w-16 shrink-0 text-right font-display text-2xl tabular-nums tracking-tight">{n(item.count)}</span>
          <span className="min-w-0 flex-1 text-sm font-medium sm:text-base">{item.q}</span>
          <span className="hidden shrink-0 sm:block"><DemandBar level={demandLevel(item.count, max)} label={`Demand: ${n(item.count)} similar comments`} /></span>
          <ChevronDown size={16} className={clsx("shrink-0 text-muted transition-transform", open && "rotate-180")} />
        </button>
        <button className="btn-brand shrink-0 py-2 text-xs" onClick={create}>Create response</button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
            <div className="grid gap-3 border-t border-line bg-sunken/40 p-4 text-sm">
              <div className="sm:hidden"><DemandBar level={demandLevel(item.count, max)} label={`Demand: ${n(item.count)} similar comments`} /></div>
              <p className="t-label text-muted">Example comments</p>
              <ul className="grid gap-1.5">{item.examples.slice(0, 3).map((e) => <li key={e} className="flex gap-2"><span className="text-brand">•</span><span>“{e}”</span></li>)}</ul>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="chip">Source: {PLATFORM_LABEL[item.source]}</span>
                <span className="chip">Engagement score: <b>{item.engagement}</b></span>
                <span className="h-1.5 w-24 overflow-hidden rounded-full bg-line" aria-hidden="true"><motion.span className="block h-full rounded-full bg-accent" initial={{ width: 0 }} animate={{ width: `${item.engagement}%` }} /></span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

/** Dashboard → Audience. */
export function DemandEngine() {
  const [platform, setPlatform] = useState<DemandPlatform>("youtube");
  const [open, setOpen] = useState<string | null>(null);
  const items = useDemand(platform);
  const create = useCreateResponse();
  const max = Math.max(0, ...(items ?? []).map((i) => i.count));
  return (
    <section className="mb-6" aria-labelledby="dem-h">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 id="dem-h" className="t-h2">Your audience is asking…</h2>
        <div role="group" aria-label="Platform" className="flex gap-2">
          {DEMAND_PLATFORMS.map((p) => (
            <button key={p.id} aria-pressed={platform === p.id} onClick={() => { setPlatform(p.id); setOpen(null); }} className={clsx("chip px-4 py-1.5 transition-colors", platform === p.id ? "border-brand bg-brand text-brand-ink" : "hover:bg-sunken")}>{p.label}{platform === p.id && " ✓"}</button>
          ))}
        </div>
      </div>
      <ul className="grid gap-2" aria-live="polite">
        {!items && [0, 1, 2, 3].map((i) => <li key={i}><Skeleton className="h-16" /></li>)}
        {items?.map((it) => <Row key={it.id} item={it} max={max} open={open === it.id} toggle={() => setOpen(open === it.id ? null : it.id)} create={() => create(it)} />)}
      </ul>
      <p className="mt-2 flex items-center gap-1 text-xs text-muted"><Sparkles size={12} />Create response opens Studio with a hook and script drafted. Nothing is published.</p>
    </section>
  );
}

/** Home → Overview: top 3 only, with a link to the full page. */
export function DemandCompact({ onNavigate }: { onNavigate?: () => void }) {
  const items = useDemand("youtube");
  const create = useCreateResponse();
  return (
    <section className="mt-4" aria-labelledby="demc-h">
      <p id="demc-h" className="t-label text-muted">Audience is asking…</p>
      <ol className="mt-2 grid gap-1.5">
        {!items && [0, 1, 2].map((i) => <li key={i}><Skeleton className="h-11" /></li>)}
        {items?.slice(0, 3).map((it, i) => (
          <li key={it.id} className="flex items-center justify-between gap-3 rounded-2xl border border-line px-4 py-2 text-sm">
            <span className="min-w-0 truncate"><span className="mr-2 text-muted">{i + 1}.</span><span className="font-medium">{it.q}</span></span>
            <button className="btn-ghost shrink-0 py-1.5 text-xs" onClick={() => { onNavigate?.(); create(it); }}>Create response</button>
          </li>
        ))}
      </ol>
      <div className="mt-2 text-right"><Link href="/dashboard?section=audience" onClick={onNavigate} className="inline-flex items-center gap-1 text-sm font-medium text-brand underline-offset-4 hover:underline">View all <ArrowRight size={14} /></Link></div>
    </section>
  );
}
