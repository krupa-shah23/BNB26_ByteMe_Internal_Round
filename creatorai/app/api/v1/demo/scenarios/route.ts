import { groups, defaultGroup } from "@/lib/match";
import { ok, withRoute } from "@/lib/server/http";
export const runtime = "nodejs";

/** A scenario is a group; the Demo Panel forces one by sending x-demo-scenario. */
export const GET = withRoute(async () =>
  ok({ scenarios: [...groups, defaultGroup].map((g) => ({ id: g.id, title: g.title, type: g.type, topic: g.topic, format: g.format })) }));
