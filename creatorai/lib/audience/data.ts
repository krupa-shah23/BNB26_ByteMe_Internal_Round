import demand from "@/fixtures/demand.json";

export type DemandPlatform = "youtube" | "twitch" | "reddit";
export const DEMAND_PLATFORMS: { id: DemandPlatform; label: string }[] = [{ id: "youtube", label: "YouTube" }, { id: "twitch", label: "Twitch" }, { id: "reddit", label: "Reddit" }];

export interface DemandItem {
  id: string; q: string; topic: string; kind: string;
  /** similar comments seen */
  count: number;
  /** 0-100 */
  engagement: number;
  examples: string[];
  source: DemandPlatform;
}

const fixture = (p: DemandPlatform): DemandItem[] => (demand.items[p] ?? []).map((i) => ({ ...i, source: p })).sort((a, b) => b.count - a.count);

export const demandFixture = fixture;

/** 0-1. Square-root scale so the top question doesn't flatten the rest; never fully empty. */
export function demandLevel(count: number, max: number) {
  return max <= 0 ? 0 : Math.min(1, Math.max(0.08, Math.sqrt(count / max)));
}

const fmt = (n: number) => n.toLocaleString("en-IN");
/** Draft hook + script for a question. BACKEND-SLOT(hooks/script): swap for hookService / scriptService when live. */
export function buildResponse(q: DemandItem): { hook: string; script: string[] } {
  const hook = `You've been asking ${q.topic}…`;
  const ask = `${fmt(q.count)} of you asked "${q.q}" so here's the straight answer.`;
  const body: Record<string, string[]> = {
    gear: ["Short version: here's exactly what I use and why.", "I picked it for the price and how it looks on camera, nothing fancy.", "If you're just starting, you don't need the expensive version. Here's what to buy first."],
    tutorial: ["I'll keep this simple and take it one step at a time.", "Step one: set things up. Step two: the part everyone gets stuck on. Step three: the finishing touch.", "Save this so you can follow along while you try it."],
    process: ["Here's how it came together, from the first rough idea to the finished thing.", "The first version was messy. This is what changed along the way.", "The one decision that saved me the most time was this."],
    general: ["Short answer first, then the details.", "Here's what I found when I tried it myself.", "There are a couple of things worth knowing before you start."],
  };
  return { hook, script: [hook, ask, ...(body[q.kind] ?? body.general), "Got a question I missed? Drop it below and it could be the next video."] };
}
