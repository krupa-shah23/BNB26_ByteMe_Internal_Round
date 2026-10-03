"use client";
import { motion } from "framer-motion";
import Link from "next/link";

export type AuthMode = "login" | "signup";
const ITEMS: { mode: AuthMode; label: string; href: string }[] = [
  { mode: "login", label: "Log in", href: "/login" },
  { mode: "signup", label: "Sign up", href: "/signup" },
];

/**
 * One pill holding both "Log in" and "Sign up"; the active one is highlighted and the highlight slides between them.
 * With `onSelect` the items are buttons (used on the auth pages, no navigation); otherwise they are links (landing page).
 */
export function AuthSwitch({ active, onSelect }: { active: AuthMode; onSelect?: (m: AuthMode) => void }) {
  return (
    <div role={onSelect ? "tablist" : undefined} aria-label="Account" className="relative isolate inline-flex rounded-pill border border-line bg-surface p-1">
      {ITEMS.map((it) => {
        const on = it.mode === active;
        const cls = `relative z-10 rounded-pill px-4 py-2 text-sm font-medium transition-colors duration-200 ${on ? "text-white delay-150 dark:text-bg" : "text-text hover:opacity-60"}`;
        const pill = on && <motion.span layoutId="auth-pill" className="absolute inset-0 -z-10 rounded-pill bg-text" transition={{ type: "spring", stiffness: 420, damping: 32 }} />;
        return onSelect ? (
          <button key={it.mode} type="button" role="tab" aria-selected={on} onClick={() => onSelect(it.mode)} className={cls}>{pill}{it.label}</button>
        ) : (
          <Link key={it.mode} href={it.href} aria-current={on ? "page" : undefined} className={cls}>{pill}{it.label}</Link>
        );
      })}
    </div>
  );
}
