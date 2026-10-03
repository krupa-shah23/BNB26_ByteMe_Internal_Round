"use client";
import SwipeToast from "@/components/reactbits/SwipeToast";
import { useStore } from "@/lib/store";

const ICONS = {
  success: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9.5" /><path d="m7.8 12.4 3 3 5.4-6" /></svg>,
  error: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9.5" /><path d="M12 7.5v5.5M12 16.6v.1" /></svg>,
  info: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9.5" /><path d="M12 11v5.5M12 7.4v.1" /></svg>,
};

/** App-wide notifications, rendered with the React Bits Swipe Toast (stacked inline; swipe down or wait for the fuse to dismiss). */
export function ToastHost() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);
  return (
    <div className="pointer-events-none fixed bottom-24 left-1/2 z-[150] flex w-[min(92vw,380px)] -translate-x-1/2 flex-col lg:bottom-6 lg:left-auto lg:right-6 lg:translate-x-0" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <SwipeToast
            inline
            open
            title={t.title}
            description={t.body}
            icon={ICONS[t.kind]}
            duration={t.duration}
            closeButton
            width={380}
            radius={16}
            background="rgb(var(--text))"
            color="rgb(var(--bg))"
            fuseColor={t.kind === "error" ? "rgb(var(--bad))" : "rgb(var(--accent))"}
            onClose={() => dismiss(t.id)}
          />
        </div>
      ))}
    </div>
  );
}
