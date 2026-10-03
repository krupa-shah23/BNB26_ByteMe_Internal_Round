import { clipSuggestions, groupOf } from "@/lib/clips";
import { clipsBody } from "@/lib/schemas/thumbnails";
import { slowMultiplier } from "@/lib/server/demo";
import { findProject } from "@/lib/server/guards";
import { body, ok, parse, withRoute } from "@/lib/server/http";
import { startResultJob } from "@/lib/server/jobs";
export const runtime = "nodejs";

// BACKEND-SLOT(clips-generate): LLM-scored candidate windows plus scene detection replace the hand-set scores.
export const POST = withRoute<{ id: string }>(async (req, { params }) => {
  const { count } = parse(clipsBody, await body(req));
  const project = findProject(params.id);
  const clips = clipSuggestions(groupOf(project)).slice(0, count ?? 10);
  const job = startResultJob("clips", [
    { key: "scan", label: "Scanning the footage", ms: 900 },
    { key: "score", label: "Scoring candidate clips", ms: 1100 },
    { key: "rank", label: "Ranking by hook and payoff", ms: 600 },
  ], { clips, source: "demo" }, slowMultiplier(req));
  return ok({ jobId: job.id }, 202);
});
