"use client";
import { CalendarPlus, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { Overlay } from "@/components/ui/Overlay";
import RubberSegment from "@/components/reactbits/RubberSegment";
import { QuickAdd } from "./Calendar";
import { nowMs, useStore } from "@/lib/store";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" });
const dateLabel = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

/** Month/year dropdowns, month grid + agenda, add and delete events. Used on /calendar (and available as an overlay). */
export function CalendarPanel() {
  const { calendar, removeCal, toast } = useStore();
  const [view, setView] = useState(() => { const d = new Date(nowMs()); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [sel, setSel] = useState(() => new Date(nowMs()));
  const [adding, setAdding] = useState(false);
  const [mode, setMode] = useState<"month" | "agenda">("month");

  const years = useMemo(() => { const y = new Date().getFullYear(); return Array.from({ length: 11 }, (_, i) => y - 3 + i); }, []);
  const cells = useMemo(() => {
    const first = new Date(view.y, view.m, 1);
    const start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  }, [view]);
  const byDay = (d: Date) => calendar.filter((c) => same(new Date(c.startsAt), d)).sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
  const dayItems = byDay(sel);
  const agenda = [...calendar].filter((c) => !c.done).sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
  const step = (n: number) => setView((v) => { const d = new Date(v.y, v.m + n, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  const today = new Date(nowMs());
  const del = (id: string, title: string) => { removeCal(id); toast("Event deleted", title, { kind: "info" }); };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button className="btn-ghost h-10 w-10 p-0" aria-label="Previous month" onClick={() => step(-1)}><ChevronLeft size={16} /></button>
          <label className="sr-only" htmlFor="cal-m">Month</label>
          <select id="cal-m" className="chip bg-surface px-3 py-2 text-sm" value={view.m} onChange={(e) => setView({ ...view, m: +e.target.value })}>{MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}</select>
          <label className="sr-only" htmlFor="cal-y">Year</label>
          <select id="cal-y" className="chip bg-surface px-3 py-2 text-sm" value={view.y} onChange={(e) => setView({ ...view, y: +e.target.value })}>{years.map((y) => <option key={y}>{y}</option>)}</select>
          <button className="btn-ghost h-10 w-10 p-0" aria-label="Next month" onClick={() => step(1)}><ChevronRight size={16} /></button>
        </div>
        <div className="flex items-center gap-3">
          <RubberSegment aria-label="Calendar view" items={[{ value: "month", label: "Month" }, { value: "agenda", label: "Agenda" }]} value={mode} onChange={(v) => setMode(v as "month" | "agenda")}
            size="lg" radius={22} trackColor="rgb(var(--sunken))" thumbColor="rgb(var(--brand))" textColor="rgb(var(--text))" activeTextColor="rgb(var(--brand-ink))" />
          <button className="btn-brand h-11 py-0" onClick={() => setAdding(true)}><CalendarPlus size={16} />Add event</button>
        </div>
      </div>

      {mode === "month" ? (
        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="overflow-hidden rounded-2xl border border-line bg-line">
            <div className="grid grid-cols-7 gap-px text-center text-[11px] font-semibold uppercase tracking-wider text-muted">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="bg-surface py-2">{d}</div>)}</div>
            <div className="mt-px grid grid-cols-7 gap-px">
              {cells.map((d) => {
                const items = byDay(d);
                const isSel = same(d, sel);
                return (
                  <button key={d.toISOString()} onClick={() => { setSel(d); if (d.getMonth() !== view.m) setView({ y: d.getFullYear(), m: d.getMonth() }); }} aria-pressed={isSel}
                    aria-label={`${d.toDateString()}, ${items.length} event${items.length === 1 ? "" : "s"}`}
                    className={clsx("flex h-16 flex-col items-start bg-surface p-1.5 text-left transition-colors hover:bg-sunken md:h-[84px]", d.getMonth() !== view.m && "opacity-40", isSel && "ring-2 ring-inset ring-brand")}>
                    <span className={clsx("grid h-6 w-6 place-items-center rounded-full text-xs", same(d, today) && "bg-brand text-brand-ink")}>{d.getDate()}</span>
                    {items.length > 0 && <span className="mt-auto flex gap-0.5">{items.slice(0, 4).map((c) => <span key={c.id} className="h-1.5 w-1.5 rounded-full bg-accent" />)}{items.length > 4 && <span className="text-[9px] text-muted">+</span>}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <section aria-label="Events on selected day">
            <h3 className="font-display text-xl">{sel.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}</h3>
            <ul className="mt-3 grid gap-2">
              {dayItems.map((c) => (
                <li key={c.id} className="flex items-start justify-between gap-2 rounded-xl border border-line p-3 text-sm">
                  <div className="min-w-0"><p className="font-medium">{c.title}</p><p className="text-xs text-muted">{time(c.startsAt)} · <span className="capitalize">{c.type}</span>{c.withHandle ? ` · ${c.withHandle}` : ""}</p></div>
                  <button className="btn-ghost h-8 w-8 shrink-0 p-0 text-bad" aria-label={`Delete ${c.title}`} onClick={() => del(c.id, c.title)}><Trash2 size={14} /></button>
                </li>
              ))}
              {dayItems.length === 0 && <li className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">No events. Add one for this day.</li>}
            </ul>
          </section>
        </div>
      ) : (
        <ul className="mt-5 grid gap-2" aria-label="All upcoming events">
          {agenda.map((c) => (
            <li key={c.id} className="card flex items-center gap-4 p-4">
              <div className="min-w-0 flex-1"><p className="font-medium">{c.title}</p><p className="text-xs text-muted">{dateLabel(c.startsAt)} · {time(c.startsAt)}{c.withHandle ? ` · with ${c.withHandle}` : ""}</p></div>
              <span className="chip capitalize">{c.type}</span>
              <button className="btn-ghost h-9 w-9 p-0 text-bad" aria-label={`Delete ${c.title}`} onClick={() => del(c.id, c.title)}><Trash2 size={14} /></button>
            </li>
          ))}
          {agenda.length === 0 && <li className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">Nothing scheduled.</li>}
        </ul>
      )}
      <QuickAdd open={adding} onClose={() => setAdding(false)} date={sel} />
    </div>
  );
}

/** Overlay wrapper kept for reuse; the navbar Calendar control now routes to /calendar. */
export function CalendarOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Overlay open={open} onClose={onClose} side="center" width="max-w-5xl" labelledBy="cal-h">
      <div className="p-5 pt-16 md:p-8 md:pt-16"><h2 id="cal-h" className="t-h2 mb-4">Calendar</h2><CalendarPanel /></div>
    </Overlay>
  );
}
