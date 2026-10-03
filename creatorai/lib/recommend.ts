import creatorsFx from "@/fixtures/creators.json";

export interface Creator { id: string; name: string; handle: string; niche: string; followers: number; topics: string[]; vec: number[] }
export const allCreators = creatorsFx.creators as Creator[];
/** The signed-in creator's profile. BACKEND-SLOT(recommendations): from Creator DNA + analytics. */
export const ME = { vec: [0.8, 0.3, 0.2, 0.8, 0.4, 0.7, 0.3, 0.4], topics: ["startup-india", "education", "comedy", "career"], followers: 48200 };

export interface Rec {
  c: Creator; score: number;
  /** 0-100: how much your topics overlap with theirs */
  content: number;
  /** 0-100: estimated audience similarity */
  audience: number;
  /** 0-100: how close the follower counts are */
  size: number;
  shared: string[];
}

const cosine = (a: number[], b: number[]) => {
  const d = a.reduce((s, x, i) => s + x * b[i], 0), na = Math.hypot(...a), nb = Math.hypot(...b);
  return na && nb ? d / (na * nb) : 0;
};
/** log-scale closeness, so 50K vs 80K is a good fit and 50K vs 2M is not */
const sizeFit = (f: number) => Math.max(0, 1 - Math.abs(Math.log10(f / ME.followers)) / 1.3);

/** Who to collaborate with: similar content, similar audience, similar size. Higher score first. */
export function recommend(pref: number[] = []): Rec[] {
  const target = ME.vec.map((v, i) => v + (pref[i] ?? 0));
  return allCreators.map((c) => {
    const shared = c.topics.filter((t) => ME.topics.includes(t));
    const content = Math.min(1, shared.length / Math.min(c.topics.length, ME.topics.length));
    const audience = Math.max(0, Math.min(1, (cosine(c.vec, target) - 0.5) / 0.5));
    const size = sizeFit(c.followers);
    const score = 0.4 * content + 0.35 * audience + 0.25 * size;
    return { c, score, content: Math.round(content * 100), audience: Math.round(audience * 100), size: Math.round(size * 100), shared };
  }).sort((a, b) => b.score - a.score);
}
