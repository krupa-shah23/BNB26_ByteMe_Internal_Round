import { alignScript } from "@/lib/clips";
import { slowMultiplier } from "@/lib/server/demo";
import { findProject } from "@/lib/server/guards";
import { ok, withRoute } from "@/lib/server/http";
import { startResultJob } from "@/lib/server/jobs";
export const runtime = "nodejs";

// BACKEND-SLOT(align): transcript + embedding match (DTW-style) replaces the hand-authored script mapping.
export const POST = withRoute<{ id: string }>(async (req, { params }) => {
  const project = findProject(params.id);
  const alignments = alignScript(project);
  const job = startResultJob("align", [
    { key: "transcript", label: "Reading transcript", ms: 800 },
    { key: "match", label: "Matching script lines to footage", ms: 1000 },
    { key: "flag", label: "Flagging lines with no footage", ms: 500 },
  ], { alignments, unmatchedLines: alignments.filter((a) => !a.matched).map((a) => a.lineId), source: "demo" }, slowMultiplier(req));
  return ok({ jobId: job.id }, 202);
});
