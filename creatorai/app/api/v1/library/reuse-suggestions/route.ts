import { ok, withRoute } from "@/lib/server/http";
import home from "@/fixtures/home.json";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withRoute(() => { return ok({ unusedClips: home.unusedClips, library: home.library.filter((a) => !a.used) }); });
