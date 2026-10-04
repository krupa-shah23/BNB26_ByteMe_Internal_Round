import { totalDur } from "../projects";
import type { Project } from "../types";
import type { Blur, Box, Compliance, MonIssue, MonStatus, Person, StripBlock } from "./types";

export const STRICT_SEC = 15;
const r1 = (n: number) => Math.round(n * 10) / 10;
export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/* ───────────── text helpers (also used to re-scan edited captions) ───────────── */
const ROOTS = ["fuck", "shit", "bullshit", "damn", "pissed", "crap", "asshole", "bitch"];
const PROFANITY = new RegExp(`\\b(${ROOTS.sort((a, b) => b.length - a.length).join("|")})(\\w*)`, "gi");
/** "fucking" → "f***ing" */
export const maskProfanity = (s: string) => s.replace(PROFANITY, (_m, root: string, rest: string) => root[0] + "*".repeat(root.length - 1) + rest);
export const profanityIn = (s: string) => Array.from(s.matchAll(PROFANITY), (m) => m[0]);
const RISKY_THUMB = /\b(dead|death|blood|kill|scam|exposed|shocking|fuck|shit|nsfw|sex)\b/i;

/** Title / thumbnail gate. `ok === null` means nothing chosen yet. */
export function gate(project: Pick<Project, "title" | "thumb">) {
  const title = project.title;
  const titleBad = profanityIn(title).length > 0 || /\b(scam|exposed|shocking)\b/i.test(title);
  const th = project.thumb?.text;
  return {
    title: { ok: !titleBad, note: titleBad ? "Title wording may limit ads" : "Title looks fine" },
    thumb: th === undefined ? { ok: null as boolean | null, note: "No thumbnail yet" } : { ok: !RISKY_THUMB.test(th) && profanityIn(th).length === 0, note: RISKY_THUMB.test(th) ? "Thumbnail text may trigger limited ads" : "Thumbnail looks fine" },
  };
}

/* ───────────── demo analyzer ─────────────
 * BACKEND-SLOT(compliance): swap this for POST /api/v1/projects/:id/compliance. Same `Compliance` shape in, same out.
 * Positions scale with the video so the demo works for a 12 s short and a 40 s lecture alike. */
export function analyzeProject(project: Project): Compliance {
  // A fixed video file (photo reel) is never inspected, so there is nothing to flag and nothing is invented about it.
  if (project.reel) return { version: 1, cues: [], monetization: [], bleeps: [], pii: [], claims: [], people: [], blurs: [] };
  const T = Math.max(8, totalDur(project.timeline));
  const at = (f: number, d: number) => { const dur = r1(Math.min(d, T * 0.14)); return { at: r1(clamp(T * f, 0.5, T - dur - 0.2)), dur }; };

  const p1 = at(0.08, 4), p2 = at(0.36, 5), v1 = at(0.68, 3);
  const cue = (id: string, w: { at: number; dur: number }, text: string) => ({ id, at: w.at, dur: w.dur, text, original: text });
  const c1 = "This is fucking amazing, holy shit, what a damn setup";
  const c2 = "I was so pissed, this bullshit app crashed, crap";
  const claim1 = at(0.54, 3.5), claim2 = at(0.88, 3);
  const cues = [
    cue("q1", p1, c1), cue("q2", p2, c2), cue("q3", v1, "Then the whole scene gets pretty intense"),
    cue("q4", claim1, "Brand X runs a scam"), cue("q5", claim2, "This supplement cures anxiety"),
  ];
  const spread = (w: { at: number; dur: number }, words: string[]) => words.map((word, i) => ({ word, at: r1(w.at + (w.dur * (i + 0.5)) / words.length) }));
  const monetization: MonIssue[] = [
    { id: "m1", kind: "profanity", ...p1, severity: "limited", title: "High profanity cluster", reason: `Profanity cluster, 3 words in ${p1.dur} s`, cueId: "q1", words: spread(p1, ["fucking", "shit", "damn"]), autoFixable: true, status: "open" },
    { id: "m2", kind: "profanity", ...p2, severity: "limited", title: "Profanity cluster", reason: `Profanity cluster, 3 words in ${p2.dur} s`, cueId: "q2", words: spread(p2, ["pissed", "bullshit", "crap", "damn"].slice(0, 3)), autoFixable: true, status: "open" },
    { id: "m3", kind: "violence", ...v1, severity: "limited", title: "Intense footage", reason: "Intense footage, may be read as graphic", cueId: "q3", autoFixable: false, status: "open" },
  ];
  const box = (x: number, y: number, w: number, h: number): Box => ({ x, y, w, h });
  const w1 = at(0.2, 4), w2 = at(0.5, 3.5), w3 = at(0.8, 3);
  const pii = [
    { id: "pii1", kind: "email" as const, ...w1, text: "john@example.com", label: "Email address", title: "Email in browser tab", box: box(14, 10, 66, 8), status: "open" as const },
    { id: "pii2", kind: "phone" as const, ...w2, text: "+91 98765 43210", label: "Phone number", title: "Phone number on screen", box: box(20, 46, 56, 8), status: "open" as const },
    { id: "pii3", kind: "address" as const, ...w3, text: "12 MG Road, Pune 411001", label: "Home address", title: "Address on a package label", box: box(12, 66, 76, 8), status: "open" as const },
  ];
  const claims = [
    { id: "cl1", ...claim1, cueId: "q4", statement: "Brand X runs a scam", note: "Direct factual accusation. May fall outside opinion protection if unsubstantiated.", suggestion: "In my experience with their customer service…", status: "open" as const },
    { id: "cl2", ...claim2, cueId: "q5", statement: "This supplement cures anxiety", note: "Health claim stated as fact. Hard to substantiate.", suggestion: "It helped me feel calmer, but talk to a doctor about your own situation.", status: "open" as const },
  ];
  const per = (f: number, d: number, b: Box) => ({ ...at(f, d), box: b });
  const people: Person[] = [
    { id: "pe1", label: "Person 1", hue: 3, name: "Alex", status: "consented", appearances: [per(0.04, 3, box(30, 22, 36, 48)), per(0.7, 3, box(30, 22, 36, 48))] },
    { id: "pe2", label: "Person 2", hue: 5, name: "", status: "consented", appearances: [per(0.3, 3, box(10, 28, 30, 44))] },
    { id: "pe3", label: "Person 3", hue: 7, name: "", status: "unknown", appearances: [per(0.4, 3, box(58, 26, 30, 44))] },
    { id: "pe4", label: "Person 4", hue: 9, name: "", status: "opted_out", appearances: [per(0.62, 3, box(34, 30, 32, 42))] },
    { id: "pe5", label: "Person 5", hue: 11, name: "", status: "unknown", appearances: [per(0.86, 3, box(14, 24, 32, 46))] },
  ];
  return { version: 1, cues, monetization, bleeps: [], pii, claims, people, blurs: [] };
}

/* ───────────── monetization: effective severity, strip, score ───────────── */
/** The first 15 s are checked more strictly: any flag there is treated as non-monetizable. */
export const effSeverity = (i: Pick<MonIssue, "severity" | "at" | "status">): MonStatus => (i.status === "cleaned" ? "safe" : i.at < STRICT_SEC ? "red" : i.severity);

export function stripBlocks(issues: MonIssue[], total: number): StripBlock[] {
  const out: StripBlock[] = [];
  let t = 0;
  const sorted = [...issues].sort((a, b) => a.at - b.at);
  const safe = (s: number, e: number, id: string) => { if (e - s > 0.05) out.push({ id, start: s, end: e, status: "safe", label: "Safe" }); };
  for (const i of sorted) {
    const s = clamp(i.at, 0, total), e = clamp(i.at + i.dur, 0, total);
    if (e <= t) continue;
    safe(t, Math.max(t, s), `s${out.length}`);
    out.push({ id: i.id, issueId: i.id, start: Math.max(s, t), end: e, status: effSeverity(i), label: i.reason });
    t = e;
  }
  safe(t, total, `s${out.length}`);
  return out;
}

export function adSafeScore(issues: MonIssue[], g: ReturnType<typeof gate>) {
  let s = 100;
  for (const i of issues) { const e = effSeverity(i); s -= e === "red" ? 12 : e === "limited" ? 5 : 0; }
  if (g.title.ok === false) s -= 3;
  if (g.thumb.ok === false) s -= 3;
  return clamp(Math.round(s), 0, 100);
}

/** Issues the creator has typed into a caption since analysis: re-scanned live so the score reacts. */
export function captionIssues(tl: { id?: string; at: number; dur: number; caption?: string }[]): MonIssue[] {
  return tl.flatMap((s) => {
    const hits = s.caption ? profanityIn(s.caption) : [];
    return hits.length ? [{ id: `cap:${s.id}`, kind: "profanity" as const, at: s.at, dur: s.dur, severity: "limited" as const, title: "Profanity in caption", reason: `Profanity in caption, ${hits.length} word${hits.length > 1 ? "s" : ""}`, words: hits.map((word) => ({ word, at: s.at })), autoFixable: true, status: "open" as const }] : [];
  });
}

/* ───────────── PII / people / blur helpers ───────────── */
export const unknownPeople = (c?: Compliance | null) => (c?.people ?? []).filter((p) => p.status === "unknown");
export const openPii = (c?: Compliance | null) => (c?.pii ?? []).filter((p) => p.status === "open");

/** Greedy row packing so overlapping blur bars stack instead of hiding each other. */
export function packRows(blurs: Blur[]): Map<string, number> {
  const rows: number[] = [];
  const out = new Map<string, number>();
  for (const b of [...blurs].sort((a, c) => a.start - c.start)) {
    let r = rows.findIndex((end) => end <= b.start);
    if (r < 0) { r = rows.length; rows.push(0); }
    rows[r] = b.end; out.set(b.id, r);
  }
  return out;
}

export const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** One number for header chip + Review: analysed issues, plus anything profane the creator typed into a caption since. */
export function computeAdSafe(project: Project, c: Compliance) {
  const issues = [...c.monetization, ...captionIssues(project.timeline)];
  return { score: adSafeScore(issues, gate(project)), issues };
}
