"use client";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

const FOCUSABLE = 'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

/** Accessible overlay: portal, focus trap, Esc to close, scroll lock, restores focus. */
export function Overlay({ open, onClose, title, side = "right", width = "max-w-xl", children, full = false, labelledBy }: {
  open: boolean; onClose: () => void; title?: string; side?: "right" | "left" | "center"; width?: string; children: React.ReactNode; full?: boolean; labelledBy?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const prev = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    prev.current = document.activeElement as HTMLElement;
    const el = ref.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => (el?.querySelector<HTMLElement>("[data-autofocus]") ?? el?.querySelector<HTMLElement>(FOCUSABLE))?.focus(), 60);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
      if (e.key === "Tab" && el) {
        const f = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((x) => x.offsetParent !== null);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => { clearTimeout(t); document.removeEventListener("keydown", onKey, true); document.body.style.overflow = overflow; prev.current?.focus?.(); };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;
  const panelPos = side === "center" ? "inset-0 m-auto h-fit max-h-[92vh]" : side === "right" ? "right-0 top-0 h-full" : "left-0 top-0 h-full";
  const from = side === "center" ? { opacity: 0, y: 24, scale: 0.98 } : { x: side === "right" ? "100%" : "-100%" };
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100]">
          <motion.div className="absolute inset-0 bg-text/40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            ref={ref} role="dialog" aria-modal="true" aria-label={labelledBy ? undefined : title} aria-labelledby={labelledBy}
            className={`absolute ${panelPos} w-full ${full ? "max-w-none" : width} overflow-y-auto bg-bg shadow-soft ${side === "center" ? "rounded-3xl border border-line" : "border-line " + (side === "right" ? "border-l" : "border-r")}`}
            initial={from} animate={{ x: 0, y: 0, opacity: 1, scale: 1 }} exit={from}
            transition={{ type: "spring", stiffness: 260, damping: 32 }}
          >
            <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full border border-line bg-surface hover:bg-sunken">
              <X size={18} />
            </button>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
