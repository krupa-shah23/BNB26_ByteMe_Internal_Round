"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Seamless marquee: children rendered twice, track animates translateX(-50%).
 * Pauses on hover/focus (CSS), when off-screen (IntersectionObserver) and under prefers-reduced-motion (CSS).
 */
export function Marquee({ children, duration = 40, reverse = false, className = "", gap = "gap-6", label, paused = false }: {
  children: React.ReactNode; duration?: number; reverse?: boolean; className?: string; gap?: string; label?: string; paused?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "100px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`marquee ${className}`} data-paused={!visible || paused} role="group" aria-label={label} style={{ ["--dur" as string]: `${duration}s`, ["--dir" as string]: reverse ? "reverse" : "normal" }}>
      <div className="marquee-track">
        <div className={`flex shrink-0 ${gap} pr-6`}>{children}</div>
        <div className={`flex shrink-0 ${gap} pr-6`} aria-hidden="true" ref={(el) => el?.setAttribute("inert", "")}>{children}</div>
      </div>
    </div>
  );
}
