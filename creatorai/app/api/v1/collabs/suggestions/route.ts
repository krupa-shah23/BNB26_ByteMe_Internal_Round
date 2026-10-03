import { ok, withRoute } from "@/lib/server/http";
import creators from "@/fixtures/creators.json";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withRoute(() => { return ok({ creators: creators.creators }); });
