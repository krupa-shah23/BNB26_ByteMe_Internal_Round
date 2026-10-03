"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import clsx from "clsx";

export interface StepDef { id: string; label: string }

/** Guided-journey indicator: numbered nodes joined by lines that fill as you progress. */
export function StepIndicator({ steps, current, onJump, left = false }: { steps: StepDef[]; current: number; onJump?: (i: number) => void; left?: boolean }) {
  return (
    <ol className={clsx("flex w-full max-w-xl items-start", !left && "mx-auto")} aria-label="Progress">
      {steps.map((s, i) => {
        const done = i < current, on = i === current;
        return (
          <li key={s.id} className={clsx("flex items-start", i < steps.length - 1 && "flex-1")} aria-current={on ? "step" : undefined}>
            <button type="button" disabled={!done} onClick={() => onJump?.(i)} className="relative flex w-9 shrink-0 flex-col items-center disabled:cursor-default">
              <motion.span
                animate={{ scale: on ? 1.08 : 1 }}
                className={clsx("grid h-9 w-9 place-items-center rounded-full border-2 text-sm font-semibold transition-colors", done || on ? "border-brand" : "border-line", done ? "bg-brand text-brand-ink" : on ? "bg-accent text-black" : "bg-surface text-muted")}>
                {done ? <Check size={16} /> : i + 1}
              </motion.span>
              <span className={clsx("absolute top-11 whitespace-nowrap text-xs font-medium", on ? "text-text" : "text-muted")}>{s.label}</span>
            </button>
            {i < steps.length - 1 && (
              <span className="relative mx-2 mt-[17px] h-0.5 flex-1 overflow-hidden rounded-full bg-line" aria-hidden="true">
                <motion.span className="absolute inset-y-0 left-0 bg-brand" initial={false} animate={{ width: done ? "100%" : "0%" }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }} />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Slides step content in/out; direction follows navigation. */
export function StepPanel({ index, direction, children }: { index: number; direction: 1 | -1; children: React.ReactNode }) {
  return (
    <AnimatePresence mode="wait" initial={false} custom={direction}>
      <motion.div key={index} custom={direction}
        variants={{ in: (d: number) => ({ opacity: 0, x: 48 * d }), show: { opacity: 1, x: 0 }, out: (d: number) => ({ opacity: 0, x: -48 * d }) }}
        initial="in" animate="show" exit="out" transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
