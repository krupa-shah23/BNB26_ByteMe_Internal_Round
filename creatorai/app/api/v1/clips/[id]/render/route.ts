import { PROFILES, totalDur } from "@/lib/projects";
import { renderBody } from "@/lib/schemas/thumbnails";
import { slowMultiplier } from "@/lib/server/demo";
import { findByClip } from "@/lib/server/publish";
import { body, ok, parse, withRoute } from "@/lib/server/http";
import { startResultJob } from "@/lib/server/jobs";
export const runtime = "nodejs";

// BACKEND-SLOT(clip-render): the Remotion CLI renders the EDL; today this returns the group's pre-baked file.
export const POST = withRoute<{ id: string }>(async (req, { params }) => {
  const b = parse(renderBody, await body(req));
  const project = findByClip(params.id);
  const aspect = b.aspect ?? project.aspect;
  const dir = `/demo/${project.groupId}`;
  const dur = totalDur(project.timeline);
  const edited = project.version > 1 || project.timeline.some((s) => s.touched);
  const result = {
    url: aspect === "9:16" ? `${dir}/output_9x16.mp4` : `${dir}/output.mp4`,
    aspect, prebaked: true, edited,
    // an edited timeline still returns the pre-baked file; say so instead of implying the edit was rendered
    note: edited ? "Your edits are saved in the project. This demo returns the group's pre-rendered file." : undefined,
    specReport: project.platforms.map((pl) => ({ platform: pl, label: PROFILES[pl].label, aspect: PROFILES[pl].aspect, res: PROFILES[pl].res, durationSec: +dur.toFixed(1), maxSec: PROFILES[pl].maxSec, withinLimit: dur <= PROFILES[pl].maxSec })),
  };
  const job = startResultJob("render", [
    { key: "composite", label: "Compositing EDL", ms: 900 },
    { key: "encode", label: "Encoding 1080p", ms: 1100 },
    { key: "package", label: "Packaging for platforms", ms: 800 },
  ], result, slowMultiplier(req));
  return ok({ jobId: job.id, projectId: project.id }, 202);
});
