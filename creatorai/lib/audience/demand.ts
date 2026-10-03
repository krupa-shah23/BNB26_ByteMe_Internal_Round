import { mode } from "../services";
import { demandFixture, type DemandItem, type DemandPlatform } from "./data";
export * from "./data";

/** BACKEND-SLOT(audience-demand): GET /api/v1/audience/demand?platform=. Same shape; falls back to the fixture on any failure. */
export const demandService = {
  async list(platform: DemandPlatform): Promise<DemandItem[]> {
    if (mode("audience") === "live") {
      try {
        const r = await fetch(`/api/v1/audience/demand?platform=${platform}`);
        if (r.ok) { const j = (await r.json()) as { items: DemandItem[] }; if (Array.isArray(j.items)) return j.items; }
      } catch { /* fixture */ }
    }
    return demandFixture(platform);
  },
};
