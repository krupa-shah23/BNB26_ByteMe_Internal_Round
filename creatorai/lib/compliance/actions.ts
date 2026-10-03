import { maskProfanity } from "./analyze";
import type { Blur, Compliance, ConsentStatus, Person } from "./types";

/** Pure state transitions for the review lanes. The Studio hook applies them and persists the result on the project. */

const BLEEP_SEC = 0.4;

export function autoClean(c: Compliance): { next: Compliance; cleaned: number; manual: number } {
  const bleeps = [...c.bleeps];
  let cues = c.cues, cleaned = 0, manual = 0;
  const monetization = c.monetization.map((i) => {
    if (i.status === "cleaned") return i;
    if (!i.autoFixable) { manual++; return i; }
    cleaned++;
    for (const w of i.words ?? []) bleeps.push({ id: `b_${i.id}_${bleeps.length}`, issueId: i.id, at: w.at, dur: BLEEP_SEC });
    if (i.cueId) cues = cues.map((q) => (q.id === i.cueId ? { ...q, text: maskProfanity(q.text) } : q));
    return { ...i, status: "cleaned" as const };
  });
  return { next: { ...c, monetization, bleeps, cues }, cleaned, manual };
}

const piiBlur = (c: Compliance, id: string): Blur | null => {
  const p = c.pii.find((x) => x.id === id);
  return p ? { id: `bl_${p.id}`, kind: "pii", refId: p.id, label: p.label, start: p.at, end: p.at + p.dur, box: p.box } : null;
};
const addBlurs = (c: Compliance, add: Blur[]) => [...c.blurs.filter((b) => !add.some((a) => a.id === b.id)), ...add];

export function blurPii(c: Compliance, ids: string[]): Compliance {
  const add = ids.map((id) => piiBlur(c, id)).filter(Boolean) as Blur[];
  return { ...c, blurs: addBlurs(c, add), pii: c.pii.map((p) => (ids.includes(p.id) ? { ...p, status: "blurred" as const } : p)) };
}
export const ignorePii = (c: Compliance, id: string): Compliance => ({ ...c, pii: c.pii.map((p) => (p.id === id ? { ...p, status: "ignored" as const } : p)) });
export const reopenPii = (c: Compliance, id: string): Compliance => ({ ...c, blurs: c.blurs.filter((b) => b.refId !== id), pii: c.pii.map((p) => (p.id === id ? { ...p, status: "open" as const } : p)) });

export function claimDecision(c: Compliance, id: string, use: boolean): Compliance {
  const cl = c.claims.find((x) => x.id === id);
  if (!cl) return c;
  return {
    ...c,
    claims: c.claims.map((x) => (x.id === id ? { ...x, status: use ? "applied" : "kept" } : x)),
    cues: use ? c.cues.map((q) => (q.id === cl.cueId ? { ...q, text: cl.suggestion } : q)) : c.cues,
  };
}
export const reopenClaim = (c: Compliance, id: string): Compliance => {
  const cl = c.claims.find((x) => x.id === id);
  return cl ? { ...c, claims: c.claims.map((x) => (x.id === id ? { ...x, status: "open" as const } : x)), cues: c.cues.map((q) => (q.id === cl.cueId ? { ...q, text: q.original } : q)) } : c;
};

export const patchPerson = (c: Compliance, id: string, p: Partial<Pick<Person, "name" | "status" | "release">>): Compliance => ({ ...c, people: c.people.map((x) => (x.id === id ? { ...x, ...p } : x)) });
export const setStatus = (c: Compliance, id: string, status: ConsentStatus) => patchPerson(c, id, { status });

export const personBlurs = (c: Compliance, id: string) => c.blurs.filter((b) => b.kind === "person" && b.refId === id);
export function blurPerson(c: Compliance, id: string): Compliance {
  const p = c.people.find((x) => x.id === id);
  if (!p) return c;
  return { ...c, blurs: addBlurs(c, p.appearances.map((a, i) => ({ id: `bl_${p.id}_${i}`, kind: "person" as const, refId: p.id, label: p.name || p.label, start: a.at, end: a.at + a.dur, box: a.box }))) };
}
export const unblurPerson = (c: Compliance, id: string): Compliance => ({ ...c, blurs: c.blurs.filter((b) => !(b.kind === "person" && b.refId === id)) });

export const moveBlur = (c: Compliance, id: string, start: number, end: number): Compliance => ({ ...c, blurs: c.blurs.map((b) => (b.id === id ? { ...b, start, end } : b)) });
