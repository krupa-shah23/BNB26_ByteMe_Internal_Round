import { jobView, type JobView } from "../schemas/job";
import type { JobListener } from "../services/types";
import { api } from "./client";

const toProgress = (j: JobView) => {
  const stepIndex = j.status === "done" ? j.steps.length : Math.max(0, j.steps.findIndex((s) => s.status !== "done"));
  return { stepIndex, progress: j.progress, steps: j.steps.map((s) => ({ key: s.key, label: s.label, ms: 0 })), done: j.status === "done" };
};

/**
 * BACKEND-SLOT(job-stream): live mode. Opens SSE at /api/v1/jobs/:id/stream and falls back to polling
 * GET /jobs/:id if EventSource is unavailable or errors. Resolves with the final job (result included).
 */
export function watchJob(jobId: string, onProgress: JobListener): Promise<JobView> {
  return new Promise((resolve, reject) => {
    let finished = false;
    const finish = (j: JobView) => { if (finished) return; finished = true; es?.close(); clearInterval(poll); j.status === "done" ? resolve(j) : reject(new Error(`Job ${j.status}`)); };
    const handle = (j: JobView) => { onProgress(toProgress(j)); if (j.status === "done" || j.status === "cancelled" || j.status === "failed") finish(j); };
    let es: EventSource | undefined;
    let poll: ReturnType<typeof setInterval> | undefined;
    const startPolling = () => { if (poll) return; poll = setInterval(() => api(`/jobs/${jobId}`, jobView).then(handle).catch((e) => { if (!finished) { finished = true; clearInterval(poll); reject(e); } }), 500); };
    if (typeof EventSource === "undefined") return startPolling();
    es = new EventSource(`/api/v1/jobs/${jobId}/stream`);
    const onMsg = (e: MessageEvent) => { try { handle(jobView.parse(JSON.parse(e.data))); } catch { /* ignore a malformed frame */ } };
    ["step", "done", "end"].forEach((n) => es!.addEventListener(n, onMsg as EventListener));
    es.onerror = () => { es?.close(); startPolling(); }; // reconnect by polling; the server returns the current state either way
  });
}
