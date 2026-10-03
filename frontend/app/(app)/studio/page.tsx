"use client";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Copy, ExternalLink, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { Badge } from "@/components/ui/bits";
import { Glyph } from "@/components/short/Glyphs";
import { ThumbCard } from "@/components/studio/Tools";
import { PROFILES, absTime, fmtTime, friendlyTitle, makeProject, relTime, totalDur } from "@/lib/projects";
import { groupById } from "@/lib/match";
import { useStore } from "@/lib/store";
import type { Project, ProjectStatus } from "@/lib/types";

const STATUSES: (ProjectStatus | "All")[] = ["All", "Generated", "Editing", "In review", "Scheduled", "Published"];
const tone = { Generated: "brand", Editing: "warn", "In review": "muted", Scheduled: "brand", Published: "ok" } as const;

/** "Podcast", "Reel", "Vlog"… from the source set, falling back to Short / Video. */
function kindLabel(p: Project) {
  const t = groupById(p.groupId).type;
  return t && t !== "generic" ? t : p.type;
}

function Poster({ p }: { p: Project }) {
  return (
    <motion.div whileHover={{ y: -6 }} transition={{ type: "spring", stiffness: 300, damping: 22 }}>
      <Link href={`/studio/${p.id}`} className="group block rounded-[28px] border border-text/10 bg-surface p-3 transition-shadow hover:shadow-soft" aria-label={`Open ${p.title}`}>
        <ThumbCard hue={p.hue} frame={p.thumb?.frame ?? 0} text={p.thumb?.text ?? ""} template={p.thumb?.template ?? "blur"} cutout={!!p.thumb} badge={fmtTime(totalDur(p.timeline))} className="rounded-2xl" />
        <div className="flex items-end justify-between gap-3 px-2 pb-2 pt-4">
          <div className="min-w-0">
            <div className="truncate font-display text-xl tracking-tight">{friendlyTitle(p.title)}</div>
            <div className="mt-1 text-sm text-muted">{kindLabel(p)} · {relTime(p.updatedAt)}</div>
          </div>
          <Badge tone={tone[p.status]}>{p.status}</Badge>
        </div>
      </Link>
    </motion.div>
  );
}

export default function StudioList() {
  const router = useRouter();
  const { projects, upsertProject, removeProject, toast } = useStore();
  const [all, setAll] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<ProjectStatus | "All">("All");
  const [type, setType] = useState<"All" | "Short" | "Video">("All");

  const sorted = useMemo(() => [...projects].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)), [projects]);
  const rows = useMemo(() => sorted.filter((p) => (status === "All" || p.status === status) && (type === "All" || p.type === type) && p.title.toLowerCase().includes(q.toLowerCase())), [sorted, q, status, type]);

  return (
    <div className="mx-auto max-w-[1100px] pb-10 pt-2">
      <h1 className="sr-only">Studio</h1>

      {/* New project */}
      <section aria-label="New project">
        <motion.button type="button" onClick={() => setNewOpen((o) => !o)} aria-expanded={newOpen} whileHover={{ y: -4 }}
          className="grain relative grid min-h-[200px] w-full place-items-center overflow-hidden rounded-[28px] border-2 border-dashed border-text/25 bg-accent/60 p-8 text-center transition-colors hover:bg-accent">
          <span className="relative z-10 grid justify-items-center gap-3 text-black">
            <Glyph name="upload" size={56} />
            <span className="inline-flex items-center gap-2 font-display text-3xl tracking-tight"><Plus size={26} />New Project</span>
            <span className="text-sm opacity-70">Start editing your content</span>
          </span>
        </motion.button>
        <AnimatePresence>
          {newOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="grid gap-4 pt-4 sm:grid-cols-2">
                <Link href="/short-videos" className="flex items-center justify-between rounded-[24px] border border-text/10 bg-brand-2 p-5 text-black transition-transform hover:-translate-y-1"><span><span className="block font-display text-2xl tracking-tight">Short video</span><span className="text-sm opacity-70">Reels, Shorts, Stories, Ads</span></span><ArrowRight /></Link>
                <Link href="/videos" className="flex items-center justify-between rounded-[24px] border border-text/10 bg-brand p-5 text-brand-ink transition-transform hover:-translate-y-1"><span><span className="block font-display text-2xl tracking-tight">Video</span><span className="text-sm opacity-70">Podcast, lecture, vlog</span></span><ArrowRight /></Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Recent / all */}
      <section className="mt-14" aria-labelledby="recent-h">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <h2 id="recent-h" className="font-display text-3xl tracking-tight">{all ? "All projects" : "Recent"}</h2>
          {all && <button className="text-sm underline underline-offset-4 hover:opacity-60" onClick={() => setAll(false)}>Show recent</button>}
        </div>

        {!all ? (
          sorted.length === 0 ? (
            <div className="rounded-[28px] border border-line bg-surface p-10 text-center text-muted">Nothing here yet — start a project above and it will show up with a timestamp.</div>
          ) : (
            <>
              <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{sorted.slice(0, 3).map((p) => <li key={p.id}><Poster p={p} /></li>)}</ul>
              {sorted.length > 3 && <div className="mt-8 text-center"><button className="inline-flex items-center gap-2 font-medium underline-offset-4 hover:underline" onClick={() => setAll(true)}>View all ({sorted.length}) <ArrowRight size={16} /></button></div>}
            </>
          )
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-center gap-2" role="group" aria-label="Filters">
              <div className="relative w-full sm:w-64"><Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" /><input className="input rounded-pill pl-10" placeholder="Search projects" aria-label="Search projects" value={q} onChange={(e) => setQ(e.target.value)} /></div>
              {STATUSES.map((s) => <button key={s} aria-pressed={status === s} onClick={() => setStatus(s)} className={clsx("chip px-3 py-1.5", status === s && "border-brand bg-brand text-brand-ink")}>{s}</button>)}
              <span className="mx-1 h-5 w-px bg-line" />
              {(["All", "Short", "Video"] as const).map((s) => <button key={s} aria-pressed={type === s} onClick={() => setType(s)} className={clsx("chip px-3 py-1.5", type === s && "border-text bg-text text-bg")}>{s}</button>)}
            </div>
            {rows.length === 0 ? <p className="text-sm text-muted">No projects match.</p> : (
              <ul className="grid gap-3">
                <AnimatePresence initial={false}>
                  {rows.map((p) => {
                    const g = groupById(p.groupId);
                    return (
                      <motion.li key={p.id} layout initial={{ opacity: 0, y: -24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: -40 }} transition={{ type: "spring", stiffness: 300, damping: 28 }}
                        className="grid items-center gap-4 rounded-[24px] border border-text/10 bg-surface p-3 md:grid-cols-[168px_1fr_auto]">
                        <Link href={`/studio/${p.id}`} className="block" aria-label={`Open ${p.title}`}>
                          <ThumbCard hue={p.hue} frame={p.thumb?.frame ?? 0} text={p.thumb?.text ?? ""} template={p.thumb?.template ?? "blur"} cutout={!!p.thumb} badge={fmtTime(totalDur(p.timeline))} className="rounded-xl" />
                        </Link>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2"><Link href={`/studio/${p.id}`} className="truncate font-display text-xl hover:text-brand">{friendlyTitle(p.title)}</Link><Badge tone={tone[p.status]}>{p.status}</Badge></div>
                          <p className="mt-1 text-sm text-muted">{kindLabel(p)} · {p.files.length} clips{p.photos ? ` + ${p.photos} photo` : ""} · set {g.id === "_default" ? "custom" : g.id.toUpperCase()}</p>
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
          </>
        )}
      </section>
    </div>
  );
}
