import { ok, withRoute } from "@/lib/server/http";
import { jobStore } from "@/lib/server/jobStore";
import { reset } from "@/lib/server/projectRepo";
import { resetB7 } from "@/lib/server/b7Repo";
export const runtime = "nodejs";

/** Re-seeds server state: projects, history, jobs, generations, idempotency keys. The client store has its own reset. */
export const POST = withRoute(async () => {
  reset();
  resetB7();
  jobStore.reset();
  return ok({ ok: true });
});
