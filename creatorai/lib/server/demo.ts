/** Demo controls arrive as headers set by the Demo Panel. Stripped in production unless ALLOW_DEMO_HEADERS=true. */
const allowed = () => process.env.NODE_ENV !== "production" || process.env.ALLOW_DEMO_HEADERS === "true";

export function now(req: Request): Date {
  const h = allowed() ? req.headers.get("x-demo-now") : null;
  const d = h ? new Date(h) : null;
  return d && !isNaN(d.getTime()) ? d : new Date();
}
export const forcedScenario = (req: Request) => (allowed() ? req.headers.get("x-demo-scenario") : null);
export const slowMultiplier = (req: Request) => {
  const n = Number(allowed() ? req.headers.get("x-demo-slow") : 1);
  return Number.isFinite(n) && n > 0 ? n : 1;
};
export const slowMs = (req: Request, ms: number) => ms * slowMultiplier(req);

/** SERVICE_<NAME> then DEMO_MODE (default true). */
export function isDemo(service: string): boolean {
  const s = process.env[`SERVICE_${service.toUpperCase()}`];
  if (s === "live") return false;
  if (s === "demo") return true;
  return process.env.DEMO_MODE !== "false";
}
