"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Copy, ExternalLink, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { Badge, Empty, Reveal } from "@/components/ui/bits";
import { ThumbCard } from "@/components/studio/Tools";
import { PROFILES, absTime, fmtTime, makeProject, relTime, totalDur } from "@/lib/projects";
import { groupById } from "@/lib/match";
import { useStore } from "@/lib/store";
import type { ProjectStatus } from "@/lib/types";

const STATUSES: (ProjectStatus | "All")[] = ["All", "Generated", "Editing", "In review", "Scheduled", "Published"];
const tone = { Generated: "brand", Editing: "warn", "In review": "muted", Scheduled: "brand", Published: "ok" } as const;

export default function StudioList() {
  const router = useRouter();
  const { projects, upsertProject, removeProject, toast } = useStore();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<ProjectStatus | "All">("All");
  const [type, setType] = useState<"All" | "Short" | "Video">("All");
  const [range, setRange] = useState<"all" | "7" | "30">("all");

  const rows = useMemo(() => projects
    .filter((p) => (status === "All" || p.status === status) && (type === "All" || p.type === type) && p.title.toLowerCase().includes(q.toLowerCase()) &&
      (range === "all" || Date.now() - new Date(p.createdAt).getTime() < +range * 86_400_000))
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)), [projects, q, status, type, range]);

  return (
    <div className="mx-auto max-w-[1400px]">
      <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div><p className="t-label text-muted">History</p><h1 className="t-h1 mt-2">Studio</h1></div>
        <div className="relative w-full sm:w-72"><Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" /><input className="input pl-10" placeholder="Search projects" aria-label="Search projects" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </Reveal>
      <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Filters">
        {STATUSES.map((s) => <button key={s} aria-pressed={status === s} onClick={() => setStatus(s)} className={clsx("chip px-3 py-1.5", status === s && "border-brand bg-brand text-brand-ink")}>{s}</button>)}
        <span className="mx-2 w-px bg-line" />
        {(["All", "Short", "Video"] as const).map((s) => <button key={s} aria-pressed={type === s} onClick={() => setType(s)} className={clsx("chip px-3 py-1.5", type === s && "border-text bg-text text-bg")}>{s}</button>)}
        <select aria-label="Date range" className="chip bg-surface px-3 py-1.5" value={range} onChange={(e) => setRange(e.target.value as "all")}><option value="all">Any date</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option></select>
      </div>

      {rows.length === 0 ? (
        <Empty title="Nothing here yet" hint="Upload your first set and it will show up here with a timestamp." action={<Link href="/short-videos" className="btn-primary">Upload your first set</Link>} />
      ) : (
        <ul className="grid gap-3">
          <AnimatePresence initial={false}>
            {rows.map((p) => {
              const g = groupById(p.groupId);
              return (
                <motion.li key={p.id} layout initial={{ opacity: 0, y: -24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: -40 }} transition={{ type: "spring", stiffness: 300, damping: 28 }}
                  className="card grid items-center gap-4 p-3 md:grid-cols-[168px_1fr_auto]">
                  <Link href={`/studio/${p.id}`} className="block" aria-label={`Open ${p.title}`}>
                    <ThumbCard hue={p.hue} frame={p.thumb?.frame ?? 0} text={p.thumb?.text ?? ""} template={p.thumb?.template ?? "blur"} cutout={!!p.thumb} badge={fmtTime(totalDur(p.timeline))} className="rounded-xl" />
                  </Link>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><Link href={`/studio/${p.id}`} className="truncate font-display text-xl hover:text-brand">{p.title}</Link><Badge tone={tone[p.status]}>{p.status}</Badge></div>
                    <p className="mt-1 text-sm text-muted">{p.type} · {p.files.length} clips{p.photos ? ` + ${p.photos} photo` : ""} · set {g.id === "_default" ? "custom" : g.id.toUpperCase()}</p>
                    <p className="mt-1 text-xs text-muted"><span title={absTime(p.createdAt)}>Generated {relTime(p.createdAt)}</span> · {absTime(p.createdAt)} · last edited {relTime(p.updatedAt)}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">{p.platforms.map((pl) => <span key={pl} className="chip py-0.5 text-[11px]">{PROFILES[pl].label}</span>)}</div>
                  </div>
                  <div className="flex flex-wrap gap-2 md:flex-col">
                    <button className="btn-primary py-2" onClick={() => router.push(`/studio/${p.id}`)}><ExternalLink size={14} />Open</button>
                    <div className="flex gap-2">
                      <button className="btn-ghost h-10 w-10 p-0" aria-label="Duplicate" onClick={() => { const c = makeProject(g, { ...p, id: undefined as never, title: `${p.title} (copy)`, status: "Generated" }); c.id = `p_${Math.random().toString(36).slice(2, 8)}`; c.createdAt = c.updatedAt = new Date().toISOString(); upsertProject(c); toast("Duplicated"); }}><Copy size={14} /></button>
                      {(p.status === "Editing" || p.status === "In review") && <Link href={`/review/${p.clipId ?? `clip_${p.id}`}`} className="btn-ghost py-2" onClick={() => !p.clipId && useStore.getState().patchProject(p.id, { clipId: `clip_${p.id}` })}>Review</Link>}
                      <button className="btn-ghost h-10 w-10 p-0 text-bad" aria-label="Delete" onClick={() => { removeProject(p.id); toast("Deleted", p.title); }}><Trash2 size={14} /></button>
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
