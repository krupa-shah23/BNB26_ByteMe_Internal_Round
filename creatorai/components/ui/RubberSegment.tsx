"use client";
import { motion } from "framer-motion";
import { useId, useState } from "react";
import clsx from "clsx";

/**
 * Pill segmented control whose highlight stretches and snaps back like rubber (low-damping spring).
 * The highlight follows hover/focus; with `value={null}` it is a row of action buttons with no persistent selection.
 */
export function RubberSegment<T extends string>({ items, value, onChange, label, size = "md" }: {
  items: readonly { id: T; label: React.ReactNode }[]; value: T | null; onChange: (v: T) => void; label: string; size?: "sm" | "md";
}) {
  const uid = useId();
  const [hot, setHot] = useState<T | null>(null);
  const target = hot ?? value;
  return (
    <div role={value === null ? "group" : "tablist"} aria-label={label} onPointerLeave={() => setHot(null)} className="relative inline-flex rounded-pill border border-line bg-surface p-1">
      {items.map((it) => {
        const on = it.id === target;
        const selected = it.id === value;
        return (
          <button key={it.id} type="button" role={value === null ? undefined : "tab"} aria-selected={value === null ? undefined : selected}
            onClick={() => onChange(it.id)} onPointerEnter={() => setHot(it.id)} onFocus={() => setHot(it.id)} onBlur={() => setHot(null)}
            className={clsx("relative rounded-pill font-medium transition-colors", size === "sm" ? "px-3.5 py-1.5 text-xs" : "px-5 py-2 text-sm", on ? (selected ? "text-brand-ink" : "text-black") : "text-muted")}>
            {on && <motion.span layoutId={`rubber-${uid}`} className={clsx("absolute inset-0 rounded-pill", selected ? "bg-brand" : "bg-accent")} transition={{ type: "spring", stiffness: 420, damping: 13, mass: 0.9 }} />}
            <span className="relative">{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}
