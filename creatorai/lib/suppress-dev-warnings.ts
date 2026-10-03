/**
 * Suppress known third-party library warnings that cannot be fixed from userland.
 * This module is imported in providers.tsx so it runs before any component renders.
 *
 * Currently suppressed:
 * - Remotion 4.x: AbsoluteFillWithTiming / AbsoluteFillInner ref warnings
 *   (upstream bug — AbsoluteFillWithTiming is not wrapped in React.forwardRef)
 */

if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const _orig = console.error.bind(console);

  console.error = (...args: unknown[]) => {
    const first = typeof args[0] === "string" ? args[0] : "";

    // Remotion: AbsoluteFillWithTiming is not forwardRef'd (internal lib bug)
    if (first.includes("AbsoluteFillWithTiming: `ref` is not a prop")) return;

    // Remotion: React warning about giving refs to function components (same root cause)
    if (
      first.includes("Function components cannot be given refs") &&
      (typeof args[1] === "string" ? args[1] : "").includes("AbsoluteFillInner")
    ) return;

    _orig(...args);
  };

  const _origWarn = console.warn.bind(console);
  console.warn = (...args: unknown[]) => {
    const first = typeof args[0] === "string" ? args[0] : "";
    // Remotion license acknowledgement nudge (non-actionable in dev)
    if (first.includes("acknowledgeRemotionLicense")) return;
    _origWarn(...args);
  };
}

export {};
