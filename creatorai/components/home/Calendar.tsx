"use client";
import { motion } from "framer-motion";
import { AlarmClock, CalendarPlus, ChevronLeft, ChevronRight, Handshake, Megaphone, PartyPopper, Send, Target } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Overlay } from "@/components/ui/Overlay";
import { Badge } from "@/components/ui/bits";
import { nowMs, useStore } from "@/lib/store";
import type { CalType, CalendarItem } from "@/lib/types";

const STAGES = ["Idea", "Scripted", "Recorded", "Editing", "Review", "Scheduled", "Published"];
const ICON: Record<CalType, typeof Handshake> = { collab: Handshake, post: Send, reminder: AlarmClock, deadline: Target, event: PartyPopper };
const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const fmt = (iso: string) => new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

function countdown(iso: string) {
  const ms = new Date(iso).getTime() - nowMs();
  if (ms <= 0) return "due";
  const h = Math.floor(ms / 3_600_000);
  return h >= 24 ? `in ${Math.floor(h / 24)}d ${h % 24}h` : `in ${h}h ${Math.floor((ms % 3_600_000) / 60_000)}m`;
}

function QuickAdd({ open, onClose, date }: { open: boolean; onClose: () => void; date: Date }) {
  const { addCal, projects, calendar, toast } = useStore();
  const [f, setF] = useState({ title: "", type: "reminder" as CalType, when: toLocalInput(date), withHandle: "", projectId: "", platform: "Instagram", remind: "15", sound: true, repeat: "none" });
  useEffect(() => { if (open) { const d = new Date(date); d.setHours(18, 0, 0, 0); setF((x) => ({ ...x, when: toLocalInput(d) })); } }, [open, date]);
  const past = new Date(f.when).getTime() < nowMs();
  const conflict = calendar.find((c) => c.type === "post" && same(new Date(c.startsAt), new Date(f.when)));
  const dupe = f.type === "post" && calendar.some((c) => c.type === "post" && c.title.toLowerCase() === f.title.toLowerCase());
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.title.trim()) return;
    let when = new Date(f.when);
    if (past) when = new Date(nowMs() + 86_400_000); // "set for tomorrow instead"
    addCal({ type: f.type, title: f.title, startsAt: when.toISOString(), withHandle: f.type === "collab" ? f.withHandle : undefined, projectId: f.type === "post" ? f.projectId || undefined : undefined, platform: f.platform, remindMin: f.remind === "none" ? undefined : +f.remind, sound: f.sound, stage: f.type === "post" ? "Scheduled" : "Idea" });
    if (f.type === "post" && f.projectId) useStore.getState().patchProject(f.projectId, { status: "Scheduled", scheduledAt: when.toISOString() });
    toast(past ? "Set for tomorrow instead" : "Added to calendar", f.title); onClose();
    setF((x) => ({ ...x, title: "" }));
  };
  return (
    <Overlay open={open} onClose={onClose} labelledBy="qa-h" width="max-w-md">
      <form onSubmit={submit} className="grid gap-4 p-8 pt-20">
        <h2 id="qa-h" className="t-h2">Add to calendar</h2>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Type">{([["collab", "🤝 Collab"], ["post", "📤 Scheduled send"], ["reminder", "⏰ Reminder"], ["deadline", "🎯 Deadline"], ["event", "🎉 Event"]] as [CalType, string][]).map(([t, l]) => <button type="button" role="radio" aria-checked={f.type === t} key={t} onClick={() => setF({ ...f, type: t })} className={clsx("chip px-3 py-1.5", f.type === t && "border-brand bg-brand text-brand-ink")}>{l}</button>)}</div>
        <div><label className="t-label mb-1 block text-muted" htmlFor="qa-t">Title</label><input data-autofocus id="qa-t" required className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder={f.type === "collab" ? "Collab with @creator on 14 Oct" : "What's happening?"} /></div>
        <div><label className="t-label mb-1 block text-muted" htmlFor="qa-w">Date & time (IST)</label><input id="qa-w" type="datetime-local" className="input" value={f.when} onChange={(e) => setF({ ...f, when: e.target.value })} />
          {past && <p role="alert" className="mt-1 text-xs text-warn">That's in the past — we'll set it for tomorrow instead.</p>}
          {conflict && <p className="mt-1 text-xs text-warn">Gentle heads-up: a post is already scheduled that day ("{conflict.title}").</p>}
          {dupe && <p className="mt-1 text-xs text-warn">Similar content is already scheduled — duplicate topic warning.</p>}</div>
        {f.type === "collab" && <div><label className="t-label mb-1 block text-muted" htmlFor="qa-h2">With whom</label><input id="qa-h2" className="input" placeholder="@handle" value={f.withHandle} onChange={(e) => setF({ ...f, withHandle: e.target.value })} /></div>}
        {f.type === "post" && <div><label className="t-label mb-1 block text-muted" htmlFor="qa-p">Project</label><select id="qa-p" className="input" value={f.projectId} onChange={(e) => setF({ ...f, projectId: e.target.value })}><option value="">Choose…</option>{projects.filter((p) => p.status !== "Published").map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></div>}
        <div className="grid grid-cols-2 gap-3">
          <div><label className="t-label mb-1 block text-muted" htmlFor="qa-r">Remind me</label><select id="qa-r" className="input" value={f.remind} onChange={(e) => setF({ ...f, remind: e.target.value })}><option value="0">At time</option><option value="15">15 min before</option><option value="60">1 hour before</option><option value="1440">1 day before</option><option value="none">No reminder</option></select></div>
          <div><label className="t-label mb-1 block text-muted" htmlFor="qa-rep">Repeat</label><select id="qa-rep" className="input" value={f.repeat} onChange={(e) => setF({ ...f, repeat: e.target.value })}><option value="none">Never</option><option>Weekly</option><option>Monthly</option></select></div>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.sound} onChange={(e) => setF({ ...f, sound: e.target.checked })} className="accent-[rgb(var(--brand))]" />Alarm sound</label>
        <button className="btn-primary h-12">Add</button>
      </form>
    </Overlay>
  );
}

export function CalendarSection() {
  const { calendar, patchCal, removeCal, toast } = useStore();
  const [view, setView] = useState<"month" | "agenda" | "kanban">("month");
  const [month, setMonth] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [add, setAdd] = useState(false);
  const [day, setDay] = useState(new Date());
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 30_000); return () => clearInterval(t); }, []);

  const cells = useMemo(() => {
    const first = new Date(month); const start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  }, [month]);
  const sorted = [...calendar].sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
  const missed = calendar.filter((c) => c.missed && !c.done);

  const chip = (c: CalendarItem) => { const I = ICON[c.type]; return (<span key={c.id} className={clsx("flex items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium", c.type === "collab" ? "bg-brand/15 text-brand" : c.type === "post" ? "bg-accent/15 text-accent" : "bg-sunken")}><I size={10} className="shrink-0" /><span className="truncate">{c.title}</span></span>); };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button className="btn-ghost h-10 w-10 p-0" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft size={16} /></button>
          <h2 className="t-h2 min-w-44 text-center">{month.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</h2>
          <button className="btn-ghost h-10 w-10 p-0" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight size={16} /></button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(["month", "agenda", "kanban"] as const).map((v) => <button key={v} onClick={() => setView(v)} aria-pressed={view === v} className={clsx("chip px-4 py-1.5 capitalize", view === v && "border-text bg-text text-bg")}>{v}</button>)}
          <button className="btn-brand py-2" onClick={() => { setDay(new Date()); setAdd(true); }}><CalendarPlus size={16} />Add</button>
        </div>
      </div>

      {missed.length > 0 && (
        <div className="mb-5 grid gap-2" role="region" aria-label="Missed reminders">
          {missed.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warn/40 bg-warn/10 p-3 text-sm"><span><Badge tone="warn">Missed</Badge> <b className="ml-2">{c.title}</b> · {fmt(c.startsAt)}</span>
              <span className="flex gap-2"><button className="btn-ghost py-1.5" onClick={() => patchCal(c.id, { startsAt: new Date(nowMs() + 10 * 60_000).toISOString(), remindMin: 0, fired: false, missed: false })}>Snooze 10 min</button>
                <button className="btn-ghost py-1.5" onClick={() => patchCal(c.id, { startsAt: new Date(nowMs() + 86_400_000).toISOString(), remindMin: 0, fired: false, missed: false })}>Reschedule</button>
                <button className="btn-primary py-1.5" onClick={() => patchCal(c.id, { done: true })}>Done</button></span></div>
          ))}
        </div>
      )}

      {view === "month" && (
        <div className="overflow-hidden rounded-2xl border border-line bg-line">
          <div className="grid grid-cols-7 gap-px text-center text-[11px] font-semibold uppercase tracking-wider text-muted">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="bg-surface py-2">{d}</div>)}</div>
          <div className="mt-px grid grid-cols-7 gap-px">
            {cells.map((d) => {
              const items = sorted.filter((c) => same(new Date(c.startsAt), d));
              return (
                <button key={d.toISOString()} onClick={() => { setDay(d); setAdd(true); }} aria-label={`${d.toDateString()}, ${items.length} items. Add entry`}
                  className={clsx("min-h-24 bg-surface p-1.5 text-left align-top transition-colors hover:bg-sunken", d.getMonth() !== month.getMonth() && "opacity-45")}>
                  <span className={clsx("mb-1 grid h-6 w-6 place-items-center rounded-full text-xs", same(d, new Date(nowMs())) && "bg-brand text-brand-ink")}>{d.getDate()}</span>
                  <span className="grid gap-0.5">{items.slice(0, 3).map(chip)}{items.length > 3 && <span className="text-[10px] text-muted">+{items.length - 3} more</span>}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {view === "agenda" && (
        <ul className="grid gap-2">
          {sorted.filter((c) => !c.done).map((c) => { const I = ICON[c.type]; return (
            <li key={c.id} className="card flex flex-wrap items-center gap-4 p-4">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/15 text-brand"><I size={18} /></span>
              <div className="min-w-0 flex-1"><p className="font-medium">{c.title}</p><p className="text-xs text-muted">{fmt(c.startsAt)}{c.withHandle ? ` · with ${c.withHandle}` : ""}{c.platform ? ` · ${c.platform}` : ""}</p></div>
              {(c.type === "post" || c.remindMin !== undefined) && !c.fired && <span className="chip">{countdown(c.startsAt)}</span>}
              <span className="chip capitalize">{c.type}</span>
              <button className="btn-ghost py-1.5 text-bad" onClick={() => removeCal(c.id)}>Remove</button>
            </li>); })}
        </ul>
      )}

      {view === "kanban" && (
        <div className="no-scrollbar grid auto-cols-[240px] grid-flow-col gap-3 overflow-x-auto pb-3">
          {STAGES.map((st) => (
            <div key={st} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { const id = e.dataTransfer.getData("text/plain"); if (id) { patchCal(id, { stage: st }); toast(`Moved to ${st}`); } }} className="min-h-72 rounded-2xl border border-line bg-sunken p-3" aria-label={st}>
              <h3 className="t-label mb-3 text-muted">{st}</h3>
              <div className="grid gap-2">
                {sorted.filter((c) => (c.stage ?? "Idea") === st && !c.done).map((c) => (
                  <motion.div layout key={c.id} draggable onDragStart={(e) => (e as unknown as DragEvent).dataTransfer?.setData("text/plain", c.id)} className="cursor-grab rounded-xl border border-line bg-surface p-3 text-sm active:cursor-grabbing">
                    <p className="font-medium">{c.title}</p><p className="mt-1 text-xs text-muted">{fmt(c.startsAt)}</p>
                    <select aria-label={`Stage for ${c.title}`} className="mt-2 w-full rounded-lg border border-line bg-bg px-2 py-1 text-xs" value={c.stage ?? "Idea"} onChange={(e) => patchCal(c.id, { stage: e.target.value })}>{STAGES.map((s) => <option key={s}>{s}</option>)}</select>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2"><button className="btn-ghost py-2" onClick={() => { const un = ["a4", "a5", "a7"]; toast("Unused content to schedule", `${un.length} clips in your Library haven't been posted`); }}><Megaphone size={14} />Suggest unused content</button></div>
      <QuickAdd open={add} onClose={() => setAdd(false)} date={day} />
    </div>
  );
}
