import { frameCandidates } from "@/lib/thumbs";
import { findProject } from "@/lib/server/guards";
import { ok, withRoute } from "@/lib/server/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// BACKEND-SLOT(thumb-candidates): ffmpeg frame mining plus face/eye/sharpness scoring replaces the fixture stats.
export const GET = withRoute<{ id: string }>(async (_req, { params }) => ok({ candidates: frameCandidates(findProject(params.id)) }));
