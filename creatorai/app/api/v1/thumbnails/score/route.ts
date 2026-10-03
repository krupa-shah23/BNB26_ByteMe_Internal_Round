import { scoreBody } from "@/lib/schemas/thumbnails";
import { clickReadiness } from "@/lib/thumbScore";
import { frameCandidates } from "@/lib/thumbs";
import { findProject } from "@/lib/server/guards";
import { body, ok, parse, withRoute } from "@/lib/server/http";
export const runtime = "nodejs";

// BACKEND-SLOT(thumb-score): same heuristic as the browser. Always an estimate: the UI shows "Est.", never "predicted reach".
export const POST = withRoute(async (req) => {
  const b = parse(scoreBody, await body(req));
  const frameFace = b.frameFace ?? frameCandidates(findProject(b.projectId!))[b.frame!].face;
  const r = clickReadiness({ text: b.text, frameFace, cutout: b.cutout, template: b.template });
  return ok({ ...r, estimated: true, label: "Click-readiness (heuristic)" });
});
