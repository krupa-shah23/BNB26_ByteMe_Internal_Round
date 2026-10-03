"use client";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { Overlay } from "@/components/ui/Overlay";
import { RubberSegment } from "@/components/ui/RubberSegment";
import { nowMs, useStore } from "@/lib/store";
import type { CalType } from "@/lib/types";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const TYPES: { id: CalType; label: string }[] = [{ id: "event", label: "Event" }, { id: "reminder", label: "Reminder" }, { id: "collab", label: "Collab" }, { id: "deadline", label: "Deadline" }];
const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" });

export function CalendarOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { calendar, addCal, removeCal, toast } = useStore();
  const [cursor, setCursor] = useState(() => { const d = new Date(nowMs()); d.setDate(1); return d; });
  const [day, setDay] = useState(() => new Date(nowMs()));
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ title: "", type: "event" as CalType, time: "18:00" });

  const year = cursor.getFullYear(), month = cursor.getMonth();
  const years = Array.from({ length: 7 }, (_, i) => new Date(nowMs()).getFullYear() - 1 + i);
  const cells = useMemo(() => {
    const start = new Date(year, month, 1); start.setDate(1 - ((start.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  }, [year, month]);
  const dayItems = calendar.filter((c) => same(new Date(c.startsAt), day)).sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
  const go = (n: number) => setCursor(new Date(year, month + n, 1));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.title.trim()) return;
    const [h, m] = f.time.split(":").map(Number);
    const when = new Date(day); when.setHours(h, m, 0, 0);
    addCal({ type: f.type, title: f.title.trim(), startsAt: when.toISOString(), stage: "Idea", remindMin: f.type === "reminder" ? 0 : 15, sound: true });
    toast("Added to calendar", f.title.trim());
    setF({ ...f, title: "" }); setAdding(false);
  };

  return (
    <Overlay open={open} onClose={onClose} side="center" width="max-w-md" labelledBy="cal-h">
      <div className="p-6 pt-16 md:p-8 md:pt-16">
        <h2 id="cal-h" className="font-display text-3xl tracking-tight">Calendar</h2>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center rounded-pill border border-line bg-surface p-1">
            <motion.button whileTap={{ scale: 0.8, scaleX: 1.2 }} transition={{ type: "spring", stiffness: 500, damping: 10 }} onClick={() => go(-1)} aria-label="Previous month" className="grid h-8 w-8 place-items-center rounded-pill hover:bg-accent hover:text-black"><ChevronLeft size={16} /></motion.button>
            <select aria-label="Month" value={month} onChange={(e) => setCursor(new Date(year, +e.target.value, 1))} className="cursor-pointer bg-transparent px-2 py-1 text-sm font-medium outline-none">{MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}</select>
            <select aria-label="Year" value={year} onChange={(e) => setCursor(new Date(+e.target.value, month, 1))} className="cursor-pointer bg-transparent px-2 py-1 text-sm font-medium outline-none">{years.map((y) => <option key={y}>{y}</option>)}</select>
            <motion.button whileTap={{ scale: 0.8, scaleX: 1.2 }} transition={{ type: "spring", stiffness: 500, damping: 10 }} onClick={() => go(1)} aria-label="Next month" className="grid h-8 w-8 place-items-center rounded-pill hover:bg-accent hover:text-black"><ChevronRight size={16} /></motion.button>
          </div>
          <RubberSegment size="sm" label="Jump" value={null} onChange={() => { const n = new Date(nowMs()); setCursor(new Date(n.getFullYear(), n.getMonth(), 1)); setDay(n); }} items={[{ id: "today", label: "Today" }]} />
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1 text-center" role="grid" aria-label={`${MONTHS[month]} ${year}`}>
          {DOW.map((d) => <div key={d} className="py-1 text-xs font-semibold text-muted">{d}</div>)}
          {cells.map((d) => {
            const inMonth = d.getMonth() === month, on = same(d, day), today = same(d, new Date(nowMs()));
            const n = calendar.filter((c) => same(new Date(c.startsAt), d)).length;
            return (
              <button key={d.toISOString()} role="gridcell" aria-selected={on} onClick={() => { setDay(d); if (!inMonth) setCursor(new Date(d.getFullYear(), d.getMonth(), 1)); }}
                className={clsx("relative grid aspect-square place-items-center rounded-xl text-sm transition-colors", on ? "bg-brand text-brand-ink" : "hover:bg-sunken", !inMonth && !on && "text-muted/50", today && !on && "ring-1 ring-brand")}>
                {d.getDate()}
                {n > 0 && <span className={clsx("absolute bottom-1 h-1.5 w-1.5 rounded-full", on ? "bg-accent" : "bg-brand")} />}
              </button>
            );
          })}
        </div>

        <div className="mt-5 border-t border-line pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">{day.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
          {dayItems.length === 0 && !adding && <p className="text-sm text-muted">Nothing planned.</p>}
          <ul className="grid gap-2">
            <AnimatePresence initial={false}>
              {dayItems.map((c) => (
                <motion.li key={c.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} className="flex items-center justify-between gap-3 rounded-2xl border border-line px-4 py-2.5 text-sm">
                  <span className="min-w-0"><span className="block truncate font-medium">{c.title}</span><span className="text-xs capitalize text-muted">{c.type} · {time(c.startsAt)}</span></span>
                  <button aria-label={`Delete ${c.title}`} onClick={() => { removeCal(c.id); toast("Event deleted", c.title); }} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-bad hover:bg-bad/10"><Trash2 size={15} /></button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>

          {adding ? (
            <form onSubmit={submit} className="mt-3 grid gap-3 rounded-2xl bg-sunken p-4">
              <input data-autofocus className="input" required placeholder="What’s happening?" aria-label="Event title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
              <div className="flex flex-wrap items-center gap-3">
                <RubberSegment size="sm" label="Event type" items={TYPES} value={f.type} onChange={(t) => setF({ ...f, type: t })} />
                <input type="time" aria-label="Time" className="input w-auto py-1.5" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} />
              </div>
              <div className="flex gap-2"><button className="btn-primary">Add event</button><button type="button" className="btn-ghost" onClick={() => setAdding(false)}>Cancel</button></div>
            </form>
          ) : (
            <div className="mt-3 flex justify-center"><RubberSegment size="md" label="Add" value={null} onChange={() => setAdding(true)} items={[{ id: "add", label: <span className="inline-flex items-center gap-2"><Plus size={16} />Add Event</span> }]} /></div>
          )}
        </div>
      </div>
    </Overlay>
  );
}
