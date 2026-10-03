import { NextResponse } from "next/server";
import { z } from "zod";

export type ErrorCode = "VALIDATION_FAILED" | "NOT_FOUND" | "CONFLICT" | "RATE_LIMITED" | "UPSTREAM_TIMEOUT" | "INTERNAL" | "PERMISSION_REQUIRED" | "NOT_CONFIGURED" | "UPSTREAM_ERROR";

export class ApiError extends Error {
  constructor(public code: ErrorCode, public status: number, message: string, public details: unknown[] = [], public extra?: Record<string, unknown>) { super(message); }
}

export const ok = <T>(data: T, status = 200) => NextResponse.json(data, { status });
export const fail = (code: ErrorCode, status: number, message: string, details: unknown[] = [], extra: Record<string, unknown> = {}) =>
  NextResponse.json({ error: { code, message, details, ...extra } }, { status });

export function parse<S extends z.ZodType>(schema: S, input: unknown): z.infer<S> {
  const r = schema.safeParse(input);
  if (!r.success) throw new ApiError("VALIDATION_FAILED", 400, "Request did not match the schema", r.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })));
  return r.data;
}

export async function body(req: Request): Promise<unknown> {
  const text = await req.text();
  if (text.length > 1_000_000) throw new ApiError("VALIDATION_FAILED", 413, "Body too large");
  if (!text) return {};
  try { return JSON.parse(text); } catch { throw new ApiError("VALIDATION_FAILED", 400, "Body is not valid JSON"); }
}

type Ctx<P> = { params: P };
/** Catches throws and returns the agreed error shape. */
export function withRoute<P = Record<string, string>>(handler: (req: Request, ctx: Ctx<P>) => Promise<Response> | Response) {
  return async (req: Request, ctx: Ctx<P>) => {
    try { return await handler(req, ctx); } catch (e) {
      if (e instanceof ApiError) return fail(e.code, e.status, e.message, e.details, e.extra);
      console.error(e);
      return fail("INTERNAL", 500, "Something went wrong");
    }
  };
}
