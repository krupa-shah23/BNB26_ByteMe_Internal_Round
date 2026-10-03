import { z } from "zod";
import { useStore } from "../store";

export class ApiError extends Error {
  constructor(public code: string, public status: number, message: string, public details: unknown[] = []) { super(message); }
}

const errorShape = z.object({ error: z.object({ code: z.string(), message: z.string(), details: z.array(z.unknown()).default([]) }) });

/** Demo Panel state travels as headers; the server ignores them in production unless ALLOW_DEMO_HEADERS=true. */
export function demoHeaders(): Record<string, string> {
  const s = useStore.getState();
  const h: Record<string, string> = {};
  if (s.slowNetwork) h["x-demo-slow"] = "2.5";
  if (s.forceGroup) h["x-demo-scenario"] = s.forceGroup;
  if (s.timeOffsetMs) h["x-demo-now"] = new Date(Date.now() + s.timeOffsetMs).toISOString();
  return h;
}

/** Every live call goes through here: parse the response with Zod, throw a typed ApiError on any mismatch. */
export async function api<S extends z.ZodType>(path: string, schema: S, init: RequestInit & { json?: unknown; idempotencyKey?: string; timeoutMs?: number } = {}): Promise<z.infer<S>> {
  const { json, idempotencyKey, timeoutMs = 4000, ...rest } = init;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`/api/v1${path}`, {
      ...rest, signal: ctrl.signal,
      headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}), ...demoHeaders(), ...rest.headers },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const e = errorShape.safeParse(data);
      throw e.success ? new ApiError(e.data.error.code, res.status, e.data.error.message, e.data.error.details) : new ApiError("INTERNAL", res.status, `Request failed (${res.status})`);
    }
    const parsed = schema.safeParse(data);
    if (!parsed.success) throw new ApiError("BAD_RESPONSE", res.status, "Response did not match the schema", parsed.error.issues);
    return parsed.data;
  } finally {
    clearTimeout(t);
  }
}
