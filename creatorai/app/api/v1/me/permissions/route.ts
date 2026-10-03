import { ok, parse, body, withRoute } from "@/lib/server/http";
import { permissionsBody } from "@/lib/schemas/calendar";
import { permissions } from "@/lib/server/b7Repo";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withRoute(() => ok({ permissions: permissions.get() }));
export const PUT = withRoute(async (req) => ok({ permissions: permissions.set(parse(permissionsBody, await body(req))) }));
