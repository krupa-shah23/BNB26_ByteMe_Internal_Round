import analytics from "@/fixtures/analytics.json";
import { ok, withRoute } from "@/lib/server/http";
import { calendar } from "@/lib/server/b7Repo";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** One calendar record type: collab entries from the calendar also show in the collab log. */
export const GET = withRoute(() => ok({
  log: analytics.collabLog,
  planned: calendar.all().filter((c) => c.type === "collab").map((c) => ({ id: c.id, what: c.title, when: c.startsAt, withWhom: c.withHandle ?? null, platform: c.platform ?? null, stage: c.stage ?? null })),
}));
