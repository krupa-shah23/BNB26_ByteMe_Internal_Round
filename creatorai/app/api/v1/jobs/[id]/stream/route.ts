import { fail } from "@/lib/server/http";
import { getJob } from "@/lib/server/jobs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * SSE. Sends the current state immediately, so a reconnect resumes at the right step, then an event per change.
 * BACKEND-SLOT(job-stream): the frontend's useJobStream opens this in live mode.
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  if (!getJob(params.id)) return fail("NOT_FOUND", 404, `Unknown job ${params.id}`);
  const enc = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | undefined;
  const stream = new ReadableStream({
    start(ctrl) {
      let last = "";
      let closed = false;
      const send = (event: string, data: unknown) => ctrl.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      const tick = () => {
        const j = getJob(params.id);
        if (!j) { send("error", { code: "NOT_FOUND" }); return stop(); }
        const sig = j.steps.map((s) => s.status[0]).join("") + j.status;
        if (sig !== last) { last = sig; send("step", j); }
        if (j.status === "done" || j.status === "cancelled" || j.status === "failed") { send(j.status === "done" ? "done" : "end", j); stop(); }
      };
      const stop = () => { closed = true; if (timer) clearInterval(timer); timer = undefined; try { ctrl.close(); } catch { /* already closed */ } };
      req.signal.addEventListener("abort", stop);
      tick();
      if (!closed) timer = setInterval(tick, 200);
    },
    cancel() { if (timer) clearInterval(timer); },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" } });
}
