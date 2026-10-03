"use client";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";

/** Sun↔moon morph + circular View-Transition reveal from the button (fallback: instant swap + CSS fade). */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";

  const toggle = () => {
    const next = dark ? "light" : "dark";
    const apply = () => { document.documentElement.setAttribute("data-theme", next); setTheme(next); };
    const r = btn.current?.getBoundingClientRect();
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
    if (!doc.startViewTransition || !r || reduce) { apply(); return; }
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    doc.startViewTransition(apply).ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 650, easing: "cubic-bezier(.4,0,.2,1)", pseudoElement: "::view-transition-new(root)" },
      );
    }).catch(() => undefined);
  };

  return (
    <button ref={btn} onClick={toggle} aria-label={dark ? "Switch to light theme" : "Switch to dark theme"} aria-pressed={dark}
      className="grid h-10 w-10 place-items-center rounded-full border border-line bg-surface hover:bg-sunken">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <motion.circle cx="12" cy="12" initial={false} animate={{ r: dark ? 8 : 4.5 }} transition={{ type: "spring", stiffness: 260, damping: 20 }} fill="currentColor" stroke="none" />
        {/* moon cut-out */}
        <motion.circle cx="12" cy="12" initial={false} animate={{ r: dark ? 6 : 0, cx: dark ? 17 : 12, cy: dark ? 7 : 12 }} transition={{ type: "spring", stiffness: 260, damping: 20 }} fill="rgb(var(--surface))" stroke="none" />
        <motion.g initial={false} animate={{ opacity: dark ? 0 : 1, scale: dark ? 0.4 : 1, rotate: dark ? 90 : 0 }} style={{ originX: "12px", originY: "12px" }}>
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <line key={a} x1="12" y1="2.2" x2="12" y2="4.2" transform={`rotate(${a} 12 12)`} />
          ))}
        </motion.g>
      </svg>
    </button>
  );
}
