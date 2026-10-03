"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Lock, Scale } from "lucide-react";
import { useMemo } from "react";
import clsx from "clsx";
import { STRICT_SEC, clamp, mmss, packRows, stripBlocks } from "@/lib/compliance/analyze";
import type { Compliance, MonIssue } from "@/lib/compliance/types";

export type Lane = "mon" | "pii" | "claims" | "people";
export type Focus = { lane: Lane; id: string } | null;
type Pick = (lane: Lane, id: string, t: number) => void;

const pct = (t: number, total: number) => `${clamp((t / Math.max(total, 0.1)) * 100, 0, 100)}%`;
const Tip = ({ children }: { children: React.ReactNode }) => (
  <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-lg bg-text px-2 py-1 text-[11px] font-medium normal-case tracking-normal text-bg opacity-0 shadow-soft transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">{children}</span>
);

/** |<---- Strict 15s ---->| : the opening seconds get the harshest ad-safety rules. */
export function StrictBracket({ total }: { total: number }) {
  const w = (Math.min(STRICT_SEC, total) / Math.max(total, 0.1)) * 100;
  return (
    <div className="mt-1 flex h-4 items-center text-[10px] font-medium text-muted" style={{ width: `${w}%` }} title="The first 15 seconds are checked more strictly for ads" aria-label="First 15 seconds: strict ad-safety checking">
      <span className="h-2.5 w-px bg-current" /><span className="text-[8px]">◂</span><span className="h-px flex-1 bg-current" />
      <span className="whitespace-nowrap px-1.5 uppercase tracking-wider">Strict 15s</span>
      <span className="h-px flex-1 bg-current" /><span className="text-[8px]">▸</span><span className="h-2.5 w-px bg-current" />
    </div>
  );
}

const tone = { safe: "bg-ok/60", limited: "bg-warn", red: "bg-bad" } as const;
/** Thin strip right above the video timeline: green safe, yellow limited ads, red non-monetizable. */
export function MonStrip({ issues, total, focus, onPick }: { issues: MonIssue[]; total: number; focus: Focus; onPick: Pick }) {
  const blocks = useMemo(() => stripBlocks(issues, total), [issues, total]);
  return (
    <div className="relative mb-1.5 h-2.5" role="list" aria-label="Monetization status along the video">
      {blocks.map((b) => {
        const i = b.issueId ? issues.find((x) => x.id === b.issueId) : undefined;
        const left = (b.start / total) * 100, width = ((b.end - b.start) / total) * 100;
        return (
          <div key={b.id} role="listitem" className="group absolute inset-y-0" style={{ left: `${left}%`, width: `${width}%` }}>
            <button disabled={!i} onClick={() => i && onPick("mon", i.id, i.at)} aria-label={`${mmss(b.start)} ${b.label}`}
              className={clsx("block h-full w-full rounded-sm outline-none transition-colors duration-700 focus-visible:ring-2 focus-visible:ring-text", tone[b.status], i && "cursor-pointer hover:brightness-110", focus?.id === b.issueId && "ring-2 ring-text")} />
            {i && <Tip>{mmss(i.at)}, {i.status === "cleaned" ? `${i.title}: cleaned` : b.status === "red" && i.severity !== "red" ? `${i.reason} (strict first 15 s)` : i.reason}</Tip>}
          </div>
        );
      })}
    </div>
  );
}

const LaneRow = ({ label, children, h = "h-6" }: { label: string; children: React.ReactNode; h?: string }) => (
  <div className="flex items-center gap-2"><span className="w-16 shrink-0">{label}</span><div className={clsx("relative min-w-0 flex-1 rounded-lg bg-sunken", h)}>{children}</div></div>
);

/** Audio bleeps are drawn on the existing Music lane (this renders only the marks). */
export function BleepMarks({ c, total }: { c: Compliance; total: number }) {
  return (
    <AnimatePresence>
      {c.bleeps.map((b) => (
        <motion.span key={b.id} title={`Bleep at ${mmss(b.at)}`} className="absolute inset-y-0 z-10 w-1.5 rounded-sm bg-bad" style={{ left: pct(b.at, total), minWidth: 4 }} initial={{ scaleY: 0, opacity: 0 }} animate={{ scaleY: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 20 }} />
      ))}
    </AnimatePresence>
  );
}

export function SubtitleLane({ c, total }: { c: Compliance; total: number }) {
  return (
    <LaneRow label="Subs">
      <div className="absolute inset-0 overflow-hidden rounded-lg">
        {c.cues.map((q) => (
          <div key={q.id} className="absolute inset-y-0.5 overflow-hidden rounded bg-brand-2/40 px-1 text-[10px] normal-case leading-5 text-text" style={{ left: pct(q.at, total), width: `max(${(q.dur / total) * 100}%, 24px)` }} title={q.text}>
            <AnimatePresence mode="wait" initial={false}><motion.span key={q.text} className="block truncate" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>{q.text}</motion.span></AnimatePresence>
          </div>
        ))}
      </div>
    </LaneRow>
  );
}

const Marker = ({ left, active, onClick, tip, children, className }: { left: string; active: boolean; onClick: () => void; tip: string; children: React.ReactNode; className?: string }) => (
  <div className="group absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2" style={{ left }}>
    <button onClick={onClick} aria-label={tip} className={clsx("grid h-5 min-w-5 place-items-center rounded-full border bg-surface px-0.5 outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-text", active && "ring-2 ring-text", className)}>{children}</button>
    <Tip>{tip}</Tip>
  </div>
);

const personWord = (s: string) => (s === "opted_out" ? "Opted out" : s === "unknown" ? "Unknown" : "Consented");

/** PII, Claims, People and Blur lanes: one thin row each, every mark clickable. */
export function ReviewLanes({ c, total, focus, onPick, onBlurChange, selectedBlur, onSelectBlur }: {
  c: Compliance; total: number; focus: Focus; onPick: Pick;
  onBlurChange: (id: string, start: number, end: number) => void; selectedBlur?: string; onSelectBlur: (id: string) => void;
}) {
  const rows = useMemo(() => packRows(c.blurs), [c.blurs]);
  const nRows = Math.max(1, ...Array.from(rows.values()).map((r) => r + 1));
  return (
    <>
      <SubtitleLane c={c} total={total} />
      <LaneRow label="PII">
        {c.pii.map((p) => (
          <Marker key={p.id} left={pct(p.at, total)} active={focus?.id === p.id} onClick={() => onPick("pii", p.id, p.at)} tip={`${mmss(p.at)}, ${p.title}${p.status !== "open" ? ` (${p.status})` : ""}`}
            className={p.status === "open" ? "border-bad text-bad" : p.status === "blurred" ? "border-ok text-ok" : "border-line text-muted"}><Lock size={11} /></Marker>
        ))}
      </LaneRow>
      <LaneRow label="Claims">
        {c.claims.map((k) => (
          <Marker key={k.id} left={pct(k.at, total)} active={focus?.id === k.id} onClick={() => onPick("claims", k.id, k.at)} tip={`${mmss(k.at)}, “${k.statement}”${k.status !== "open" ? ` (${k.status === "applied" ? "rephrased" : "kept"})` : ""}`}
            className={k.status === "open" ? "border-warn text-warn" : "border-line text-muted"}><Scale size={11} /></Marker>
        ))}
      </LaneRow>
      <LaneRow label="People">
        {c.people.flatMap((p) => p.appearances.map((a, i) => (
          <Marker key={p.id + i} left={pct(a.at, total)} active={focus?.id === p.id} onClick={() => onPick("people", p.id, a.at)} tip={`${mmss(a.at)}, ${p.name || p.label} · ${personWord(p.status)}`}
            className="!border-transparent !bg-transparent !px-0"><span className={clsx("h-3.5 w-3.5 rounded-full border-2 border-surface", p.status === "consented" ? "bg-ok" : p.status === "unknown" ? "bg-warn" : "bg-muted")} /></Marker>
        )))}
      </LaneRow>
      <LaneRow label="Blur" h="">
        <div data-blurlane className="relative" style={{ height: nRows * 20 + 4 }}>
          {c.blurs.length === 0 && <span className="absolute inset-0 grid place-items-center text-[10px] normal-case text-muted">Blur a person or PII to add an overlay here</span>}
          <AnimatePresence>
            {c.blurs.map((b) => <BlurBar key={b.id} b={b} total={total} row={rows.get(b.id) ?? 0} selected={selectedBlur === b.id} onChange={onBlurChange} onSelect={() => onSelectBlur(b.id)} />)}
          </AnimatePresence>
        </div>
      </LaneRow>
    </>
  );
}

/** A blur overlay on the timeline: drag the body to retime it, drag either edge to resize it. */
function BlurBar({ b, total, row, selected, onChange, onSelect }: { b: Compliance["blurs"][number]; total: number; row: number; selected: boolean; onChange: (id: string, s: number, e: number) => void; onSelect: () => void }) {
  const MIN = 0.5;
  const drag = (mode: "move" | "start" | "end") => (ev: React.PointerEvent<HTMLElement>) => {
    ev.preventDefault(); ev.stopPropagation(); onSelect();
    const lane = ev.currentTarget.closest("[data-blurlane]") as HTMLElement;
    const pps = lane.clientWidth / Math.max(total, 0.1);
    const x0 = ev.clientX, s0 = b.start, e0 = b.end;
    const move = (m: PointerEvent) => {
      const d = (m.clientX - x0) / pps;
      let s = s0, e = e0;
      if (mode === "move") { const len = e0 - s0; s = clamp(s0 + d, 0, total - len); e = s + len; }
      else if (mode === "start") s = clamp(s0 + d, 0, e0 - MIN);
      else e = clamp(e0 + d, s0 + MIN, total);
      onChange(b.id, +s.toFixed(2), +e.toFixed(2));
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };
  const key = (mode: "move" | "start" | "end") => (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 1 : 0.1, dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!dir) return;
    e.preventDefault(); e.stopPropagation();
    const len = b.end - b.start;
    if (mode === "move") { const s = clamp(b.start + dir * step, 0, total - len); onChange(b.id, +s.toFixed(2), +(s + len).toFixed(2)); }
    else if (mode === "start") onChange(b.id, +clamp(b.start + dir * step, 0, b.end - MIN).toFixed(2), b.end);
    else onChange(b.id, b.start, +clamp(b.end + dir * step, b.start + MIN, total).toFixed(2));
  };
  const handle = "absolute inset-y-0 w-2 cursor-ew-resize bg-text/50 outline-none hover:bg-text focus-visible:bg-text";
  return (
    <motion.div className="group absolute h-5" style={{ left: pct(b.start, total), width: `${((b.end - b.start) / total) * 100}%`, top: row * 20 + 2, minWidth: 18 }} initial={{ opacity: 0, scaleX: 0.6 }} animate={{ opacity: 1, scaleX: 1 }} exit={{ opacity: 0 }}>
      <div role="slider" tabIndex={0} aria-label={`${b.label} blur, ${mmss(b.start)} to ${mmss(b.end)}. Arrow keys move it.`} aria-valuenow={b.start} aria-valuemin={0} aria-valuemax={total} onPointerDown={drag("move")} onKeyDown={key("move")}
        className={clsx("flex h-full cursor-grab touch-none items-center overflow-hidden rounded border px-2.5 text-[10px] font-medium normal-case text-text outline-none active:cursor-grabbing", selected ? "border-text" : "border-brand/60", b.kind === "pii" ? "bg-bad/25" : "bg-brand/30")}>
        <span className="truncate">{b.kind === "pii" ? "🔒" : "👤"} {b.label}</span>
      </div>
      <div role="slider" tabIndex={0} aria-label="Blur start" aria-valuenow={b.start} onPointerDown={drag("start")} onKeyDown={key("start")} className={clsx(handle, "left-0 touch-none rounded-l")} />
      <div role="slider" tabIndex={0} aria-label="Blur end" aria-valuenow={b.end} onPointerDown={drag("end")} onKeyDown={key("end")} className={clsx(handle, "right-0 touch-none rounded-r")} />
      <Tip>{b.label} · {mmss(b.start)}–{mmss(b.end)}</Tip>
    </motion.div>
  );
}
