import { matchFiles } from "@/lib/match";
import { matchBody } from "@/lib/schemas/groups";
import { forcedScenario } from "@/lib/server/demo";
import { body, ok, parse, withRoute } from "@/lib/server/http";
import type { FileFingerprint } from "@/lib/types";
export const runtime = "nodejs";

// BACKEND-SLOT(groups-match): scoring runs server-side on the same fixtures (hash > filename > duration).
export const POST = withRoute(async (req) => {
  const { files } = parse(matchBody, await body(req));
  const fps: FileFingerprint[] = files.map((f) => ({ name: f.name, size: f.size, sha: f.sha256First1MB, durationSec: f.durationSec, kind: f.kind }));
  const forced = forcedScenario(req);
  const result = matchFiles(fps, forced && forced !== "_default" ? { only: forced } : {});
  return ok(result);
});
