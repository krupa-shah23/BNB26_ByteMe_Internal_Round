import { NextResponse, type NextRequest } from "next/server";

/**
 * API hardening, applied to /api/v1/**:
 *  - CORS stays closed: a browser request carrying a foreign Origin is refused (same-origin and non-browser clients pass).
 *  - x-demo-* headers are dropped in production unless ALLOW_DEMO_HEADERS=true, so a visitor cannot force a scenario or the clock.
 *  - oversized bodies are refused before they are read.
 */
const MAX_BODY = 1_000_000;

export function middleware(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) {
    return NextResponse.json({ error: { code: "FORBIDDEN_ORIGIN", message: "Cross-origin requests are not allowed", details: [] } }, { status: 403 });
  }
  if (!req.nextUrl.pathname.startsWith("/api/upload") && Number(req.headers.get("content-length") ?? 0) > MAX_BODY) {
    return NextResponse.json({ error: { code: "VALIDATION_FAILED", message: "Body too large", details: [] } }, { status: 413 });
  }
  const headers = new Headers(req.headers);
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_HEADERS !== "true") {
    for (const k of [...headers.keys()]) if (k.startsWith("x-demo-")) headers.delete(k);
  }
  const res = NextResponse.next({ request: { headers } });
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export const config = { matcher: ["/api/v1/:path*", "/api/chat", "/api/video/:path*", "/api/upload/:path*", "/api/analyze"] };
