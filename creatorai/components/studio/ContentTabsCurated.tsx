"use client";
import { ArrowDown, ArrowUp, Check, Play, Plus, Sparkles } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";
import { fmtTime, uid } from "@/lib/projects";
import type { StudioContent } from "@/lib/studioContent";
import type { PlatformId, Segment } from "@/lib/types";
import type { ClipTools, PostTools } from "./ContentTabs";

const chip = (on: boolean) => clsx("chip px-3 py-1.5 text-xs", on && "border-brand bg-brand text-brand-ink");
const label = "mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-muted";
const note = "mb-2 flex items-center gap-1.5 text-xs text-brand";
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/* ───────────────────────── Story ───────────────────────── */

type Adapted = "reel" | "short" | "story" | null;

export function CuratedStory({ c, script, setScript, toast }: { c: StudioContent["story"]; script: string; setScript: (s: string) => void; toast: (t: string, d?: string) => void }) {
  const [ver, setVer] = useState(0);
  const [adapted, setAdapted] = useState<Adapted>(null);
  const [title, setTitle] = useState(0);
  const [seq, setSeq] = useState(0);
  const put = (text: string[], name: string) => { setScript(text.join("\n")); toast(name); };
  const sequence = c.adapt.story.sequences[seq];

  return (
    <div className="grid gap-4">
      <div>
        <label className={label} htmlFor="story">Your story</label>
        <p className={note}><Sparkles size={12} />{c.note}</p>
        <textarea id="story" className="input min-h-32 leading-relaxed" value={script} onChange={(e) => setScript(e.target.value)} />
      </div>
      <div>
        <p className={label}>Style</p>
        <div className="flex flex-wrap gap-1.5">{c.styles.map((s) => <button key={s.id} type="button" className={chip(script.trim() === s.text.join("\n"))} onClick={() => put(s.text, `${s.label} story`)}>{s.label}</button>)}</div>
      </div>
      <div>
        <p className={label}>Quick actions</p>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={() => { const n = ver % c.versions.length; put(c.versions[n], `New version ${n + 1} of ${c.versions.length}`); setVer(n + 1); }}><Sparkles size={13} />Generate new version</button>
          {c.actions.map((a) => <button key={a.id} type="button" className="chip px-3 py-1.5 text-xs hover:bg-sunken" onClick={() => put(a.text, a.label)}>{a.label}</button>)}
        </div>
      </div>
      <div>
        <label className={label} htmlFor="adapt">Adapt for…</label>
        <select id="adapt" className="input py-2 text-sm" value={adapted ?? ""} onChange={(e) => {
          const v = e.target.value as Adapted | "";
          setAdapted(v || null);
          if (v === "reel") put(c.adapt.reel.text, "Adapted for Instagram Reel");
          if (v === "short") toast("Adapted for YouTube Short", c.adapt.short.titles[title]);
          if (v === "story") toast("Adapted for Facebook Story", "3-part story sequence");
        }}>
          <option value="">Choose a platform or format</option>
          <option value="reel">Instagram Reel</option>
          <option value="short">YouTube Short</option>
          <option value="story">Facebook Story</option>
        </select>
      </div>

      {adapted === "reel" && (
        <div className="grid gap-2 rounded-xl border border-line bg-sunken p-3 text-sm">
          <p className={clsx(label, "!mb-0")}>Instagram Reel</p>
          <div><p className="text-xs text-muted">Caption</p><p>{c.adapt.reel.caption}</p></div>
          <div><p className="text-xs text-muted">CTA</p><p>{c.adapt.reel.cta}</p></div>
        </div>
      )}
      {adapted === "short" && (
        <div className="grid gap-3 rounded-xl border border-line bg-sunken p-3 text-sm">
          <p className={clsx(label, "!mb-0")}>YouTube Short</p>
          <div>
            <p className="text-xs text-muted">Title</p>
            <p className="font-medium">{c.adapt.short.titles[title]}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">{c.adapt.short.titles.map((t, i) => <button key={t} type="button" className={chip(i === title)} onClick={() => setTitle(i)}>{t}</button>)}</div>
          </div>
          <div><p className="text-xs text-muted">Description</p><p>{c.adapt.short.description}</p></div>
          <div><p className="text-xs text-muted">CTA</p><p>{c.adapt.short.cta}</p></div>
        </div>
      )}
      {adapted === "story" && (
        <div className="grid gap-2 rounded-xl border border-line bg-sunken p-3 text-sm">
          <div className="flex items-center justify-between"><p className={clsx(label, "!mb-0")}>Facebook Story · 3 cards</p><button type="button" className="text-xs underline underline-offset-4 hover:opacity-60" onClick={() => setSeq((seq + 1) % c.adapt.story.sequences.length)}>Try another sequence</button></div>
          {sequence.map((t, i) => <div key={t} className="rounded-lg border border-line bg-surface p-2.5"><p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Story {i + 1}</p><p className="whitespace-pre-line">{t}</p></div>)}
          <button type="button" className="btn-ghost mt-1 py-1.5 text-xs" onClick={() => put(sequence, "Story sequence copied to your story")}>Use as my story</button>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Clips ───────────────────────── */

const CLIP_STYLES = ["Hook", "Question", "Statement", "POV", "Story", "CTA"] as const;
const styleText = (t: string, st: string) => {
  const base = t.replace(/^(wait for it… |pov: |here’s the thing: )/i, "").replace(/[?.]+$/, "");
  return st === "Hook" ? `Wait for it… ${base}` : st === "Question" ? `${base}?` : st === "POV" ? `POV: ${lower(base)}` : st === "CTA" ? `${base}. Tag the people who were there.` : st === "Story" ? `Here’s the thing: ${lower(base)}` : `${base}.`;
};
const toneText = (t: string, tone: string) => {
  const base = t.replace(/[.!…]+$/, "").replace(/^okay so /i, "").replace(/ (😂|💛)$/, "");
  return tone === "Funny" ? `${base} 😂` : tone === "Emotional" ? `${base} 💛` : tone === "Bold" ? `${base.toUpperCase()}!` : tone === "Casual" ? `Okay so ${lower(base)}` : tone === "Minimal" ? base.split(/[,;:—]/)[0] : `${base}.`;
};

export function CuratedClips({ c, t }: { c: StudioContent["clips"]; t: ClipTools }) {
  const { tl, nameOf, edit, commit, toast } = t;
  const [open, setOpen] = useState<string | null>(null);
  const [d, setD] = useState({ text: "", start: "", end: "", style: "", tone: "" });
  const [rw, setRw] = useState(0);
  const L = Math.max(1, t.sourceLen);
  const tpl = tl.find((s) => s.src || s.url);
  const present = new Set(tl.map((s) => s.label));
  const suggestions = tpl ? c.suggested.filter((g) => !present.has(g.label)) : [];

  const openEdit = (s: Segment) => {
    if (open === s.id) return setOpen(null);
    setOpen(s.id ?? null); t.setSel(s.id); t.seekTo(s.at);
    const i = s.in ?? 0;
    setD({ text: s.caption ?? "", start: String(+i.toFixed(2)), end: String(+(i + s.dur * (s.speed ?? 1)).toFixed(2)), style: "", tone: "" });
  };
  const valid = () => { const a = +d.start, b = +d.end; return Number.isFinite(a) && Number.isFinite(b) && a >= 0 && b - a >= 0.5 && b <= L + 0.001; };
  const save = (s: Segment) => {
    const a = +d.start, b = +d.end, sp = s.speed ?? 1;
    edit(s.id!, { caption: d.text.trim() || undefined, in: a, out: +b.toFixed(2), dur: +((b - a) / sp).toFixed(2) });
    setOpen(null); toast("Changes saved");
  };
  const quick = (q: string, s: Segment) => {
    if (q === "Rewrite") { const n = (rw + 1) % c.rewrites.length; setRw(n); setD({ ...d, text: c.rewrites[n] }); }
    else if (q === "Shorten") setD({ ...d, end: String(+Math.max(+d.start + 0.5, +d.end - Math.max(0.5, (+d.end - +d.start) * 0.25)).toFixed(2)) });
    else if (q === "Make punchier") setD({ ...d, text: `${(d.text.split(/[.,;:—]/)[0] || "Memories").trim()}.` });
    else if (q === "Add context") setD({ ...d, text: d.text.startsWith("From the camera roll") ? d.text : `From the camera roll: ${lower(d.text || s.caption || "memories")}` });
    else if (q === "Remove text") setD({ ...d, text: "" });
  };
  const move = (s: Segment, dir: -1 | 1) => {
    const i = tl.indexOf(s), j = i + dir; if (j < 0 || j >= tl.length) return toast(dir < 0 ? "Already first" : "Already last");
    const next = tl.slice(); [next[i], next[j]] = [next[j], next[i]]; commit(next.map((x) => (x.id === s.id ? { ...x, touched: true } : x)));
  };
  const add = (g: (typeof c.suggested)[number]) => {
    if (!tpl) return;
    const i = Math.min(g.from, L - 0.5), o = Math.min(g.to, L);
    const seg: Segment = { ...tpl, id: uid("seg"), at: 0, in: i, out: +o.toFixed(2), dur: +(o - i).toFixed(2), kind: g.kind, label: g.label, caption: g.text, touched: true, ai: undefined, speed: undefined, photo: undefined };
    commit([...tl, seg]); toast(`${g.label} added`);
  };

  return (
    <div className="grid gap-5">
      <div>
        <p className={label}>Your clips</p>
        <p className={note}><Sparkles size={12} />{c.note}</p>
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
                  <div><p className="text-xs text-muted">Clip name</p><p className="font-medium">{nameOf(s)}</p></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="mb-1 block font-medium" htmlFor={`cs-${s.id}`}>Start (sec)</label><input id={`cs-${s.id}`} type="number" step="0.1" min="0" className="input" value={d.start} onChange={(e) => setD({ ...d, start: e.target.value })} /></div>
                    <div><label className="mb-1 block font-medium" htmlFor={`ce-${s.id}`}>End (sec)</label><input id={`ce-${s.id}`} type="number" step="0.1" min="0" className="input" value={d.end} onChange={(e) => setD({ ...d, end: e.target.value })} /></div>
                  </div>
                  <div><label className="mb-1 block font-medium" htmlFor={`ct-${s.id}`}>Text overlay</label><input id={`ct-${s.id}`} className="input" value={d.text} onChange={(e) => setD({ ...d, text: e.target.value })} /></div>
                  <div><p className="mb-1 font-medium">Text style</p><div className="flex flex-wrap gap-1.5">{CLIP_STYLES.map((x) => <button key={x} type="button" className={chip(d.style === x)} onClick={() => setD({ ...d, style: x, text: styleText(d.text || s.caption || "", x) })}>{x}</button>)}</div></div>
                  <div><p className="mb-1 font-medium">Tone</p><div className="flex flex-wrap gap-1.5">{c.tones.map((x) => <button key={x} type="button" className={chip(d.tone === x)} onClick={() => setD({ ...d, tone: x, text: toneText(d.text || s.caption || "", x) })}>{x}</button>)}</div></div>
                  <div>
                    <p className="mb-1 font-medium">Quick edit</p>
                    <div className="flex flex-wrap gap-1.5">
                      {c.quick.map((q) => <button key={q} type="button" className="chip px-3 py-1.5 text-xs hover:bg-sunken" onClick={() => quick(q, s)}>{q}</button>)}
                      <button type="button" className="chip px-3 py-1.5 text-xs hover:bg-sunken" onClick={() => move(s, -1)}><ArrowUp size={12} />Earlier</button>
                      <button type="button" className="chip px-3 py-1.5 text-xs hover:bg-sunken" onClick={() => move(s, 1)}><ArrowDown size={12} />Later</button>
                    </div>
                  </div>
                  {!valid() && <p className="text-xs text-bad">Needs at least 0.5 sec, and no more than {L.toFixed(1)}.</p>}
                  <div className="flex justify-end gap-2"><button type="button" className="btn-ghost px-3 py-1.5" onClick={() => setOpen(null)}>Cancel</button><button type="button" className="btn-primary px-4 py-1.5" disabled={!valid()} onClick={() => save(s)}>Save changes</button></div>
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
              <li key={g.label} className="rounded-xl border border-dashed border-brand/50 bg-brand/5 p-3">
                <div className="flex items-center justify-between gap-2"><b>{g.label}</b><span className="font-mono text-xs text-muted">{fmtTime(g.from)} – {fmtTime(g.to)}</span></div>
                <p className="mt-1 text-muted">“{g.text}”</p>
                <button type="button" className="btn-ghost mt-2 w-full py-1.5" onClick={() => add(g)}><Plus size={14} />Add clip</button>
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

export function CuratedPost({ c, t }: { c: StudioContent["post"]; t: PostTools }) {
  const [prepared, setPrepared] = useState<Record<string, boolean>>({});
  const sec = Math.round(t.total);
  const on = (id: PlatformId) => t.platforms.includes(id);
  const set = (id: PlatformId, v: boolean) => { setPrepared((p) => ({ ...p, [id]: false })); t.setPlatforms(v ? [...t.platforms, id] : t.platforms.filter((p) => p !== id)); };
  const prepare = (id: PlatformId, name: string) => { if (!on(id)) t.setPlatforms([...t.platforms, id]); setPrepared((p) => ({ ...p, [id]: true })); t.toast(`${name} ready`, "Open Review to publish"); };

  const Stat = ({ children }: { children: React.ReactNode }) => <span className="inline-flex items-center gap-1"><Check size={12} className="text-ok" />{children}</span>;
  const Card = ({ id, brand, kind, fit, stats, children, button, name }: { id: PlatformId; brand: string; kind: string; fit: string; stats: React.ReactNode; children: React.ReactNode; button: string; name: string }) => (
    <li className={clsx("rounded-xl border p-3", on(id) ? "border-brand bg-brand/5" : "border-line")}>
      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" checked={on(id)} onChange={(e) => set(id, e.target.checked)} className="mt-1 accent-[rgb(var(--brand))]" />
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{brand} <span className="text-muted">{kind}</span></span>
          <span className="mt-0.5 block text-[11px] font-semibold uppercase tracking-wider text-muted">Recommended</span>
          <span className="block text-xs text-muted">{fit}</span>
          <span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">{stats}</span>
        </span>
      </label>
      <div className="mt-3 grid gap-1.5 rounded-lg bg-sunken p-2.5 text-xs">{children}</div>
      <button type="button" className="btn-primary mt-3 w-full py-2" onClick={() => prepare(id, name)}>{prepared[id] ? <><Check size={14} />Prepared</> : button}</button>
    </li>
  );

  return (
    <div className="grid gap-4">
      <div>
        <p className="font-display text-xl tracking-tight">Where to post?</p>
        <p className={clsx(note, "mt-1")}><Sparkles size={12} />{c.note}</p>
      </div>
      <ul className="grid gap-3">
        <Card id="ig_reel" brand="Instagram" kind="Reel" fit={c.reel.fit} button={c.reel.button} name="Instagram Reel" stats={<><Stat>9:16</Stat><Stat>{sec} sec</Stat><Stat>{t.tl.length} clips</Stat></>}>
          <p><span className="text-muted">Hook: </span>{c.reel.hook}</p>
          <p><span className="text-muted">CTA: </span>{c.reel.cta}</p>
        </Card>
        <Card id="yt_short" brand="YouTube" kind="Short" fit={c.short.fit} button={c.short.button} name="YouTube Short" stats={<><Stat>9:16</Stat><Stat>{sec} sec</Stat><Stat>{t.tl.length} clips</Stat></>}>
          <p><span className="text-muted">Suggested title: </span>{c.short.title}</p>
        </Card>
        <Card id="facebook" brand="Facebook" kind="Story" fit={c.story.fit} button={c.story.button} name="Facebook Story" stats={<><Stat>9:16</Stat><Stat>{c.story.sequence.length} story cards</Stat></>}>
          <p className="text-muted">Suggested sequence:</p>
          {c.story.sequence.map((s) => <p key={s}>{s}</p>)}
        </Card>
      </ul>
    </div>
  );
}
