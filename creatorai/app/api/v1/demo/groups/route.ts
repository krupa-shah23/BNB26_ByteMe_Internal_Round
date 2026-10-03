import { groups, defaultGroup } from "@/lib/match";
import { ok, withRoute } from "@/lib/server/http";
export const runtime = "nodejs";

export const GET = withRoute(async () =>
  ok({ groups: [...groups, defaultGroup].map((g) => ({ id: g.id, title: g.title, format: g.format, inputRoles: g.inputs.map((i) => i.role), hasPhotos: g.photos.length > 0 })) }));
