"use client";
import { ArrowDown, ArrowUp, Check, Play, Plus, Sparkles } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";
import { fmtTime, uid } from "@/lib/projects";
import type { PlatformId, Segment } from "@/lib/types";

const chip = (on: boolean) => clsx("chip px-3 py-1.5 text-xs", on && "border-brand bg-brand text-brand-ink");
const label = "mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-muted";
const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/* ───────────────────────── Story ───────────────────────── */

const STYLES: { id: string; label: string; text: string }[] = [
  { id: "casual", label: "Casual", text: "A few moments, one reel. Add a line of text where it matters." },
  { id: "hook", label: "Hook-focused", text: "This started normally. Then things got interesting." },
  { id: "story", label: "Storytelling", text: "Here’s what happened, from the beginning to the part worth remembering." },
  { id: "minimal", label: "Minimal", text: "One moment. One story. That’s it." },
  { id: "creator", label: "Creator-style", text: "POV: you didn’t expect this to happen." },
  { id: "pro", label: "Professional", text: "A quick look at what happened and why it matters." },
];

const ACTIONS: { id: string; label: string; run: (l: string[]) => string[] }[] = [
  { id: "short", label: "Make it shorter", run: (l) => l.slice(0, Math.max(1, Math.ceil(l.length / 2))).map((x) => (x.length > 90 ? `${x.slice(0, 87).trimEnd()}…` : x)) },
  { id: "punchy", label: "Make it punchier", run: (l) => l.map((x) => `${x.split(/[,;:—]/)[0].replace(/[.!?…]+$/, "")}.`) },
  { id: "hook", label: "Add a hook", run: (l) => (/^(wait for it|pov:|you won)/i.test(l[0] ?? "") ? l : ["Wait for it…", ...l]) },
  { id: "casual", label: "Make it casual", run: (l) => l.map((x) => (/^okay so /i.test(x) ? x : `Okay so ${lower(x)}`)) },
  { id: "pro", label: "Make it professional", run: (l) => l.map((x) => x.replace(/^okay so /i, "").replace(/^./, (c) => c.toUpperCase()).replace(/[\u{1F300}-\u{1FAFF}]/gu, "").trim()) },
  { id: "cta", label: "Add CTA", run: (l) => (l.some((x) => /would you try this/i.test(x)) ? l : [...l, "Would you try this? Tell me below."]) },
];

const ADAPT: { id: string; label: string; run: (l: string[]) => string[] }[] = [
  { id: "ig_reel", label: "Instagram Reel", run: (l) => l.map((x) => (x.startsWith("🔥") ? x : `🔥 ${x}`)) },
  { id: "yt_short", label: "YouTube Short", run: (l) => [...l.slice(0, 3), "Subscribe for more."] },
  { id: "facebook", label: "Facebook Story", run: (l) => [l[0] ?? ""] },
  { id: "ig_cap", label: "Instagram caption", run: (l) => [`${l.join(" ")} #reel #story`] },
  { id: "yt_desc", label: "YouTube description", run: (l) => [`In this video: ${l.join(" ")}`] },
  { id: "fb_cap", label: "Facebook caption", run: (l) => [`${l.join(" ")} Tell us what you think!`] },
];

export function StoryEditor({ script, setScript, onGenerate, toast }: { script: string; setScript: (s: string) => void; onGenerate: () => void; toast: (t: string, d?: string) => void }) {
  const apply = (name: string, fn: (l: string[]) => string[]) => { const out = fn(lines(script)); if (!out.length) return; setScript(out.join("\n")); toast(name); };
  return (
    <div className="grid gap-4">
      <div>
        <label className={label} htmlFor="story">Your story</label>
        <textarea id="story" className="input min-h-32 leading-relaxed" value={script} onChange={(e) => setScript(e.target.value)} />
      </div>
      <div>
        <p className={label}>Style</p>
        <div className="flex flex-wrap gap-1.5">{STYLES.map((s) => <button key={s.id} type="button" className={chip(script.trim() === s.text)} onClick={() => { setScript(s.text); toast(`${s.label} story`); }}>{s.label}</button>)}</div>
      </div>
      <div>
        <p className={label}>Quick actions</p>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={onGenerate}><Sparkles size={13} />Generate new version</button>
          {ACTIONS.map((a) => <button key={a.id} type="button" className="chip px-3 py-1.5 text-xs hover:bg-sunken" onClick={() => apply(a.label, a.run)}>{a.label}</button>)}
        </div>
      </div>
      <div>
        <label className={label} htmlFor="adapt">Adapt for…</label>
        <select id="adapt" className="input py-2 text-sm" value="" onChange={(e) => { const a = ADAPT.find((x) => x.id === e.target.value); if (a) apply(`Adapted for ${a.label}`, a.run); }}>
          <option value="">Choose a platform or format</option>
          <optgroup label="Video">{ADAPT.slice(0, 3).map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}</optgroup>
          <optgroup label="Text">{ADAPT.slice(3).map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}</optgroup>
        </select>
      </div>
    </div>
  );
}

/* ───────────────────────── Clips ───────────────────────── */

const SUGGESTED: { key: string; label: string; from: number; to: number; text: string; kind: string }[] = [
  { key: "key", label: "Key moment", from: 0.2, to: 0.42, text: "This is where things changed.", kind: "story" },
  { key: "best", label: "Best moment", from: 0.42, to: 0.66, text: "The part worth watching.", kind: "demo" },
  { key: "reaction", label: "Reaction", from: 0.66, to: 0.8, text: "Wait for the reaction…", kind: "punch" },
  { key: "broll", label: "B-roll", from: 0.3, to: 0.5, text: "Useful supporting footage", kind: "demo" },
  { key: "ending", label: "Ending", from: 0.84, to: 1, text: "Would you try this?", kind: "cta" },
];
const CLIP_STYLES = ["Hook", "Question", "Statement", "POV", "Story", "CTA"] as const;
const CLIP_TONES = ["Casual", "Funny", "Professional", "Dramatic", "Minimal"] as const;
const REWRITES = ["Here’s how it started", "This started out normal…", "Okay, so this happened.", "Not what I expected.", "Let me show you."];

const styleText = (t: string, st: string) => {
  const base = t.replace(/^(wait for it… |pov: )/i, "").replace(/\?$/, "").replace(/^(here’s the thing: )/i, "");
  return st === "Hook" ? `Wait for it… ${base}` : st === "Question" ? `${base}?` : st === "POV" ? `POV: ${lower(base)}` : st === "CTA" ? `${base}. Would you try this?` : st === "Story" ? `Here’s the thing: ${lower(base)}` : base;
};
const toneText = (t: string, tone: string) => {
  const base = t.replace(/[.!…]+$/, "");
  return tone === "Funny" ? `${base} 😂` : tone === "Dramatic" ? `${base}…` : tone === "Casual" ? `Okay so ${lower(base.replace(/^okay so /i, ""))}` : tone === "Professional" ? `${base.replace(/^okay so /i, "").replace(/ 😂$/, "")}.` : base.replace(/^okay so /i, "").replace(/ 😂$/, "").split(/[,;:—]/)[0];
};

export interface ClipTools {
  tl: Segment[]; nameOf: (s: Segment) => string; edit: (id: string, p: Partial<Segment>) => void; commit: (next: Segment[]) => void;
  sel?: string; setSel: (id: string | undefined) => void; seekTo: (sec: number) => void; preview: () => void; toast: (t: string, d?: string) => void;
  sourceLen: number; regenerate: () => void; hoverSeg: (id: string | undefined) => void;
}

export function ClipsTab({ t }: { t: ClipTools }) {
  const { tl, nameOf, edit, commit, toast } = t;
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState({ text: "", start: "", end: "", style: "", tone: "" });
  const [rw, setRw] = useState(0);
  const tpl = tl.find((s) => s.src || s.url);
  const present = new Set(tl.map((s) => s.label));
  const suggestions = tpl ? SUGGESTED.filter((s) => !present.has(s.label)) : [];
  const L = Math.max(1, t.sourceLen);

  const openEdit = (s: Segment) => {
    if (open === s.id) return setOpen(null);
    setOpen(s.id ?? null); t.setSel(s.id); t.seekTo(s.at);
    const i = s.in ?? 0;
    setDraft({ text: s.caption ?? "", start: String(+i.toFixed(2)), end: String(+(i + s.dur * (s.speed ?? 1)).toFixed(2)), style: "", tone: "" });
  };
  const valid = (s: Segment) => { const a = +draft.start, b = +draft.end; return Number.isFinite(a) && Number.isFinite(b) && a >= 0 && b - a >= 0.5 && (!(s.src || s.url) || b <= L + 0.001); };
  const applyDraft = (s: Segment) => {
    const a = +draft.start, b = +draft.end, sp = s.speed ?? 1;
    edit(s.id!, { caption: draft.text.trim() || undefined, ...(s.src || s.url ? { in: a, out: +b.toFixed(2) } : {}), dur: +((b - a) / sp).toFixed(2) });
    setOpen(null); toast("Clip updated");
  };
  const move = (s: Segment, dir: -1 | 1) => {
    const i = tl.indexOf(s), j = i + dir; if (j < 0 || j >= tl.length) return toast(dir < 0 ? "Already first" : "Already last");
    const next = tl.slice(); [next[i], next[j]] = [next[j], next[i]]; t.commit(next.map((x) => ({ ...x, touched: x.id === s.id ? true : x.touched }))); toast(dir < 0 ? "Moved earlier" : "Moved later");
  };
  const addSuggested = (g: (typeof SUGGESTED)[number]) => {
    if (!tpl) return;
    const i = +(g.from * L).toFixed(2), d = +Math.max(0.5, (g.to - g.from) * L).toFixed(2);
    const seg: Segment = { ...tpl, id: uid("seg"), at: 0, dur: d, in: i, out: +(i + d).toFixed(2), kind: g.kind, label: g.label, caption: g.text, touched: true, ai: undefined, speed: undefined, photo: undefined };
    commit([...tl, seg]); toast(`${g.label} added`);
  };

  return (
    <div className="grid gap-5">
      <div>
        <p className={label}>Your clips</p>
        <ul className="grid gap-3">
          {tl.map((s) => (
            <li key={s.id} className={clsx("rounded-xl border p-3", t.sel === s.id ? "border-brand" : "border-line")} onMouseEnter={() => t.hoverSeg(s.id)} onMouseLeave={() => t.hoverSeg(undefined)}>
              <div className="flex items-center justify-between gap-2"><b>{nameOf(s)}</b><span className="font-mono text-xs text-muted">{fmtTime(s.at)} – {fmtTime(s.at + s.dur)}</span></div>
              {s.caption && <p className="mt-1 text-muted">“{s.caption}”</p>}
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" className="btn-ghost px-3 py-1.5" onClick={() => { t.setSel(s.id); t.seekTo(s.at); t.preview(); }}><Play size={13} />Preview</button>
                <button type="button" className="btn-ghost flex-1 py-1.5" aria-expanded={open === s.id} onClick={() => openEdit(s)}>{open === s.id ? "Close" : "Edit"}</button>
                <button type="button" className="btn-ghost py-1.5 text-bad" disabled={tl.length < 2} onClick={() => { commit(tl.filter((x) => x.id !== s.id)); if (open === s.id) setOpen(null); toast("Clip removed"); }}>Remove</button>
              </div>
              {open === s.id && (
                <div className="mt-3 grid gap-3 rounded-xl bg-sunken p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Edit clip</p>
                  <div><label className="mb-1 block font-medium" htmlFor={`ct-${s.id}`}>Text</label><input id={`ct-${s.id}`} className="input" value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="mb-1 block font-medium" htmlFor={`cs-${s.id}`}>Start (sec)</label><input id={`cs-${s.id}`} type="number" step="0.1" min="0" className="input" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} /></div>
                    <div><label className="mb-1 block font-medium" htmlFor={`ce-${s.id}`}>End (sec)</label><input id={`ce-${s.id}`} type="number" step="0.1" min="0" className="input" value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} /></div>
                  </div>
                  <div><p className="mb-1 font-medium">Style</p><div className="flex flex-wrap gap-1.5">{CLIP_STYLES.map((x) => <button key={x} type="button" className={chip(draft.style === x)} onClick={() => setDraft({ ...draft, style: x, text: styleText(draft.text || "Here’s how it started", x) })}>{x}</button>)}</div></div>
                  <div><p className="mb-1 font-medium">Tone</p><div className="flex flex-wrap gap-1.5">{CLIP_TONES.map((x) => <button key={x} type="button" className={chip(draft.tone === x)} onClick={() => setDraft({ ...draft, tone: x, text: toneText(draft.text || "Here’s how it started", x) })}>{x}</button>)}</div></div>
                  <div>
                    <p className="mb-1 font-medium">Quick actions</p>
                    <div className="flex flex-wrap gap-1.5">
                      <button type="button" className="chip px-3 py-1.5 text-xs hover:bg-sunken" onClick={() => { const end = Math.max(+draft.start + 0.5, +draft.end - Math.max(0.5, (+draft.end - +draft.start) * 0.2)); setDraft({ ...draft, end: String(+end.toFixed(2)) }); }}>Shorten</button>
                      <button type="button" className="chip px-3 py-1.5 text-xs hover:bg-sunken" onClick={() => { const end = +draft.end + 1; setDraft({ ...draft, end: String(+((s.src || s.url) ? Math.min(L, end) : end).toFixed(2)) }); }}>Extend</button>
                      <button type="button" className="chip px-3 py-1.5 text-xs hover:bg-sunken" onClick={() => move(s, -1)}><ArrowUp size={12} />Move earlier</button>
                      <button type="button" className="chip px-3 py-1.5 text-xs hover:bg-sunken" onClick={() => move(s, 1)}><ArrowDown size={12} />Move later</button>
                      <button type="button" className="chip px-3 py-1.5 text-xs hover:bg-sunken" onClick={() => { const n = (rw + 1) % REWRITES.length; setRw(n); setDraft({ ...draft, text: REWRITES[n] }); }}>Rewrite text</button>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2"><button type="button" className="btn-ghost px-3 py-1.5" onClick={() => setOpen(null)}>Cancel</button><button type="button" className="btn-primary px-4 py-1.5" disabled={!valid(s)} onClick={() => applyDraft(s)}>Apply</button></div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      {suggestions.length > 0 && (
        <div>
          <p className={label}>Suggested</p>
          <ul className="grid gap-3">
            {suggestions.map((g) => (
              <li key={g.key} className="rounded-xl border border-dashed border-brand/50 bg-brand/5 p-3">
                <div className="flex items-center justify-between gap-2"><b>{g.label}</b><span className="font-mono text-xs text-muted">{fmtTime(g.from * L)} – {fmtTime(g.to * L)}</span></div>
                <p className="mt-1 text-muted">“{g.text}”</p>
                <button type="button" className="btn-ghost mt-2 w-full py-1.5" onClick={() => addSuggested(g)}><Plus size={14} />Add clip</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-2">
        <button type="button" className="btn-ghost w-full justify-center whitespace-nowrap py-2.5" onClick={t.regenerate}><Sparkles size={14} />Generate new version</button>
        <button type="button" className="btn-primary w-full justify-center whitespace-nowrap py-2.5" onClick={() => { t.seekTo(0); t.preview(); }}><Play size={14} />Preview final</button>
      </div>
    </div>
  );
}

/* ───────────────────────── Where to post ───────────────────────── */

type PlatCfg = { id: PlatformId; name: string; kind: string; checks: (sec: number) => string[]; tips: { id: string; label: string }[]; goals: Record<string, string> };
const SHORT_PLATFORMS: PlatCfg[] = [
  { id: "ig_reel", name: "Instagram", kind: "Reel", checks: (s) => ["9:16", "Strong hook", `${Math.round(s)} sec`],
    tips: [{ id: "hook", label: "Add stronger hook" }, { id: "shorten", label: "Shorten intro" }, { id: "overlay", label: "Add text overlay" }, { id: "cta", label: "Add CTA" }, { id: "engage", label: "Make it more engaging" }],
    goals: { views: "You won’t believe what happened next…", engagement: "Tell me you wouldn’t have done the same.", followers: "Here’s how I figured this out…", clicks: "Here’s the full breakdown…" } },
  { id: "yt_short", name: "YouTube", kind: "Short", checks: (s) => ["9:16", "Clear payoff", `${Math.round(s)} sec`],
    tips: [{ id: "hook", label: "Make hook clearer" }, { id: "context", label: "Add context" }, { id: "keep", label: "Keep explanation" }, { id: "result", label: "Emphasise result" }, { id: "cta", label: "Add “Subscribe” CTA" }],
    goals: { views: "The answer might surprise you.", engagement: "Which would you pick? Comment below.", followers: "Subscribe — this is just part one.", clicks: "Full video linked below." } },
  { id: "facebook", name: "Facebook", kind: "Story", checks: (s) => ["9:16", "Short format", `${Math.max(1, Math.ceil(s / 5))} story cards`],
    tips: [{ id: "shorten", label: "Make it shorter" }, { id: "simplify", label: "Simplify text" }, { id: "highlight", label: "Highlight key moment" }, { id: "cta", label: "Add CTA" }, { id: "sequence", label: "Create story sequence" }],
    goals: { views: "Watch this one till the end.", engagement: "Reply with your guess!", followers: "Follow for the next part.", clicks: "Tap to see more." } },
];
const GOALS: [string, string][] = [["views", "More views"], ["engagement", "More engagement"], ["followers", "More followers"], ["clicks", "More clicks"]];

const LONG_PLATFORMS: PlatCfg[] = [
  { id: "yt_video", name: "YouTube", kind: "Video", checks: (s) => ["16:9", "Clear title", `${Math.max(1, Math.round(s / 60))} min`],
    tips: [{ id: "hook", label: "Strengthen the opening" }, { id: "context", label: "Add context" }, { id: "keep", label: "Keep the explanation" }, { id: "result", label: "Emphasise the takeaway" }, { id: "cta", label: "Add “Subscribe” CTA" }],
    goals: { views: "Everything you need to know, in one video.", engagement: "What would you do differently? Tell me below.", followers: "Subscribe for part two.", clicks: "Full notes linked in the description." } },
  { id: "linkedin", name: "LinkedIn", kind: "Post", checks: (s) => ["Professional tone", "Key takeaway", `${Math.max(1, Math.round(s / 60))} min`],
    tips: [{ id: "hook", label: "Add a stronger first line" }, { id: "simplify", label: "Simplify the text" }, { id: "result", label: "Add key takeaway" }, { id: "overlay", label: "Add text overlay" }, { id: "cta", label: "Add CTA" }],
    goals: { views: "Here’s what I learned, in under ten minutes.", engagement: "Do you agree? I’d love your take.", followers: "Follow for more practical breakdowns.", clicks: "Read the full write-up in the comments." } },
  { id: "x", name: "X", kind: "Post", checks: (s) => ["Short and direct", "One clear point", `${Math.max(1, Math.round(s / 60))} min`],
    tips: [{ id: "shorten", label: "Make it shorter" }, { id: "hook", label: "Add a hook" }, { id: "simplify", label: "Simplify text" }, { id: "highlight", label: "Highlight key moment" }, { id: "cta", label: "Add CTA" }],
    goals: { views: "A thread worth reading, in one video.", engagement: "Hot take: reply with yours.", followers: "Follow for more like this.", clicks: "Full video below." } },
];

export interface PostTools {
  kind: "short" | "long";
  platforms: PlatformId[]; setPlatforms: (p: PlatformId[]) => void; total: number; tl: Segment[]; edit: (id: string, p: Partial<Segment>) => void;
  addOverlay: (text: string, pos: "top" | "middle" | "bottom", at: number, dur: number) => void; script: string; setScript: (s: string) => void; toast: (t: string, d?: string) => void;
}

export function PostTab({ t }: { t: PostTools }) {
  const PLATFORMS = t.kind === "long" ? LONG_PLATFORMS : SHORT_PLATFORMS;
  const [goal, setGoal] = useState<Record<string, string>>({});
  const [prepared, setPrepared] = useState(false);
  const on = (id: PlatformId) => t.platforms.includes(id);
  const toggle = (id: PlatformId) => { setPrepared(false); t.setPlatforms(on(id) ? t.platforms.filter((p) => p !== id) : [...t.platforms, id]); };
  const all = PLATFORMS.every((p) => on(p.id));
  const first = t.tl[0];
  const run = (tip: string, cfg: PlatCfg) => {
    const ln = lines(t.script); const end = Math.max(0, t.total - 2.5);
    switch (tip) {
      case "hook": if (first?.id) t.edit(first.id, { caption: "Wait for this…" }); break;
      case "shorten": if (first?.id) t.edit(first.id, { dur: +Math.max(0.5, first.dur * 0.8).toFixed(2) }); break;
      case "overlay": t.addOverlay("3 things nobody tells you about this", "top", 0, Math.min(3, t.total)); break;
      case "cta": t.addOverlay(cfg.id === "yt_short" ? "Subscribe for more" : "Follow for more", "bottom", end, Math.min(2.5, t.total)); break;
      case "engage": t.setScript(["Wait for it…", ...ln.filter((l) => l !== "Wait for it…")].join("\n")); break;
      case "context": t.setScript(["Quick context:", ...ln].join("\n")); break;
      case "result": t.setScript([...ln, "Here’s how it turned out."].join("\n")); break;
      case "simplify": t.setScript(ln.map((l) => l.split(/[,;:—]/)[0].replace(/[.!?…]+$/, "") + ".").join("\n")); break;
      case "highlight": { const mid = t.tl[Math.floor(t.tl.length / 2)]; if (mid?.id) t.edit(mid.id, { caption: (mid.caption ?? "Key moment").toUpperCase() }); break; }
      case "sequence": t.setScript(ln.slice(0, 3).map((l, i) => `Card ${i + 1}: ${l}`).join("\n")); break;
      default: break;
    }
    t.toast(cfg.tips.find((x) => x.id === tip)?.label ?? "Applied", `Optimised for ${cfg.name} ${cfg.kind}`);
  };

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-display text-xl tracking-tight">Where to post?</p>
        <button type="button" className="text-xs underline underline-offset-4 hover:opacity-60" onClick={() => { setPrepared(false); t.setPlatforms(all ? [PLATFORMS[0].id] : PLATFORMS.map((p) => p.id)); }}>{all ? "Clear" : "Select all"}</button>
      </div>
      <ul className="grid gap-3">
        {PLATFORMS.map((p) => (
          <li key={p.id} className={clsx("rounded-xl border p-3", on(p.id) ? "border-brand bg-brand/5" : "border-line")}>
            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" checked={on(p.id)} onChange={() => toggle(p.id)} className="mt-1 accent-[rgb(var(--brand))]" />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{p.name} <span className="text-muted">{p.kind}</span></span>
                <span className="mt-0.5 block text-[11px] font-semibold uppercase tracking-wider text-muted">Recommended</span>
                <span className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">{p.checks(t.total).map((c) => <span key={c} className="inline-flex items-center gap-1"><Check size={12} className="text-ok" />{c}</span>)}</span>
              </span>
            </label>
            {on(p.id) && (
              <div className="mt-3 grid gap-3 border-t border-line pt-3">
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Optimise for {p.name}</p>
                  <div role="radiogroup" aria-label={`Optimise for ${p.name}`} className="flex flex-wrap gap-1.5">{GOALS.map(([k, l]) => <button key={k} type="button" role="radio" aria-checked={goal[p.id] === k} className={chip(goal[p.id] === k)} onClick={() => setGoal({ ...goal, [p.id]: k })}>{l}</button>)}</div>
                  {goal[p.id] && (
                    <div className="mt-2 rounded-lg bg-sunken p-2.5 text-xs"><p>“{p.goals[goal[p.id]]}”</p>
                      <button type="button" className="mt-1.5 font-medium text-brand underline-offset-4 hover:underline" onClick={() => { if (first?.id) t.edit(first.id, { caption: p.goals[goal[p.id]] }); t.toast("Opening updated", p.goals[goal[p.id]]); }}>Use as opening text</button></div>
                  )}
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Suggestions</p>
                  <div className="flex flex-wrap gap-1.5">{p.tips.map((tip) => <button key={tip.id} type="button" className="chip px-3 py-1.5 text-xs hover:bg-sunken" onClick={() => run(tip.id, p)}>{tip.label}</button>)}</div>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      <button type="button" className="btn-primary w-full py-2.5" disabled={!t.platforms.length} onClick={() => { setPrepared(true); t.toast("Content prepared", t.platforms.map((id) => { const c = PLATFORMS.find((x) => x.id === id); return c ? `${c.name} ${c.kind}` : id; }).join(" · ")); }}>Prepare content</button>
      {prepared && <p className="flex items-center gap-1.5 text-xs text-ok"><Check size={13} />Ready for {t.platforms.length} platform{t.platforms.length === 1 ? "" : "s"}. Open Review to publish.</p>}
    </div>
  );
}
