"use client";
import { Check, Copy, Sparkles } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";
import type { LongContent, LongTab, QuickAction } from "@/lib/studioContent";
import type { PlatformId } from "@/lib/types";

const TABS: { id: LongTab; label: string }[] = [{ id: "yt_video", label: "YouTube Video" }, { id: "linkedin", label: "LinkedIn Post" }, { id: "x", label: "X Post" }];
const chip = (on: boolean) => clsx("chip px-3 py-1.5 text-xs", on && "border-brand bg-brand text-brand-ink");
const head = "mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-muted";

export function LongContentPanel({ c, platforms, setPlatforms, toast }: { c: LongContent; platforms: PlatformId[]; setPlatforms: (p: PlatformId[]) => void; toast: (t: string, d?: string) => void }) {
  const [tab, setTab] = useState<LongTab>("yt_video");
  const yt = c.youtube;
  const chapters = yt.chapters ?? [];
  const [title, setTitle] = useState(yt.titles[0]);
  const [desc, setDesc] = useState(yt.description);
  const [descVar, setDescVar] = useState(-1);
  const [goal, setGoal] = useState<Record<LongTab, string>>({ yt_video: yt.goals?.[0]?.id ?? "", linkedin: c.linkedin.tones[0].id, x: c.x.styles[0].id });
  const [thumb, setThumb] = useState(0);
  const [li, setLi] = useState(c.linkedin.tones[0].text);
  const [xp, setXp] = useState(c.x.styles[0].text);
  const [ver, setVer] = useState<Record<LongTab, number>>({ yt_video: 0, linkedin: 0, x: 0 });
  const [ctaIdx, setCtaIdx] = useState(0);
  const [takeIdx, setTakeIdx] = useState(0);
  const [pin, setPin] = useState(0);
  const [cat, setCat] = useState(yt.meta?.category ?? "");
  const [ctype, setCtype] = useState(yt.meta?.contentType ?? "");
  const [sumMode, setSumMode] = useState(0);
  const [hookI, setHookI] = useState(0);
  const [capI, setCapI] = useState(0);

  const text = tab === "yt_video" ? desc : tab === "linkedin" ? li : xp;
  const setText = tab === "yt_video" ? setDesc : tab === "linkedin" ? setLi : setXp;
  const on = (id: LongTab) => platforms.includes(id);
  const tabLabel = TABS.find((t) => t.id === tab)?.label;
  const append = (extra: string) => setText((t) => (t.includes(extra) ? t : `${t}\n\n${extra}`));

  const setTone = (id: string) => {
    if (tab === "linkedin") { const o = c.linkedin.tones.find((x) => x.id === id); if (o) { setLi(o.text); setGoal((g) => ({ ...g, linkedin: o.id })); } }
    if (tab === "x") { const o = c.x.styles.find((x) => x.id === id); if (o) { setXp(o.text); setGoal((g) => ({ ...g, x: o.id })); } }
  };

  const next = () => {
    const n = ver[tab] + 1;
    setVer({ ...ver, [tab]: n });
    if (tab === "yt_video") { const t = yt.titles[n % yt.titles.length]; setTitle(t); toast("New title", t); }
    else if (tab === "linkedin") { const o = c.linkedin.tones[n % c.linkedin.tones.length]; setLi(o.text); setGoal((g) => ({ ...g, linkedin: o.id })); toast(`New version · ${o.label}`); }
    else {
      const styles = c.x.styles, extra = c.x.extra ?? [];
      const k = n % (styles.length + extra.length);
      if (k < styles.length) { setXp(styles[k].text); setGoal((g) => ({ ...g, x: styles[k].id })); toast(`New version · ${styles[k].label}`); }
      else { setXp(extra[k - styles.length]); setGoal((g) => ({ ...g, x: "" })); toast("New version"); }
    }
  };

  const run = (a: QuickAction) => {
    const t = a.text ?? "";
    switch (a.op) {
      case "set": setText(t); break;
      case "append": append(t); break;
      case "prepend": setText((x) => (x.startsWith(t) ? x : `${t}\n\n${x}`)); break;
      case "chapters":
        if (tab === "x") return toast("Timestamps aren’t used on X");
        if (!chapters.length) return toast("No chapters for this video");
        append(`Chapters:\n${chapters.join("\n")}`); break;
      case "cta": { const cta = yt.ctas[ctaIdx % yt.ctas.length]; setCtaIdx(ctaIdx + 1); append(cta); break; }
      case "newTitle": next(); return;
      case "tone": setTone(t); break;
      case "takeaway": { const tk = c.linkedin.takeaways ?? []; if (!tk.length) return; append(`Key takeaway:\n${tk[takeIdx % tk.length]}`); setTakeIdx(takeIdx + 1); break; }
      case "thread": setXp((c.x.thread ?? []).map((p, i) => `${i + 1}/ ${p}`).join("\n\n")); setGoal((g) => ({ ...g, x: "" })); break;
      default: break;
    }
    toast(a.label);
  };
  const copy = (s: string) => { void navigator.clipboard?.writeText(s).then(() => toast("Copied"), () => toast("Couldn’t copy")); };

  return (
    <>
      <div role="tablist" className="grid grid-cols-3 gap-1 p-2 text-xs font-medium">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={clsx("flex items-center justify-center gap-1 rounded-xl px-1 py-2.5 leading-tight transition-colors", tab === t.id ? "bg-brand text-brand-ink" : "text-muted hover:bg-sunken")}>
            {t.label}{on(t.id) && <Check size={12} aria-label="included" />}
          </button>
        ))}
      </div>
      <div className="max-h-[640px] overflow-y-auto p-4 pt-2 text-sm">
        <div className="grid gap-5">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
            <input type="checkbox" checked={on(tab)} onChange={(e) => setPlatforms(e.target.checked ? [...platforms, tab] : platforms.filter((p) => p !== tab))} className="accent-[rgb(var(--brand))]" />
            Include {tabLabel} when I publish
          </label>

          {tab === "yt_video" && (
            <>
              <div>
                <label className={head} htmlFor="yt-title">Title</label>
                <textarea id="yt-title" rows={2} className="input leading-snug" value={title} onChange={(e) => setTitle(e.target.value)} />
                <div className="mt-2 flex flex-wrap gap-1.5">{yt.titles.map((t, i) => <button key={t} type="button" className={chip(t === title)} onClick={() => setTitle(t)}>{i === 0 ? "Default" : `Option ${i}`}</button>)}</div>
              </div>
              <div>
                <label className={head} htmlFor="yt-desc">Description</label>
                <textarea id="yt-desc" className="input min-h-48 leading-relaxed" value={desc} onChange={(e) => setDesc(e.target.value)} />
                {yt.descriptionVariants && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button type="button" className={chip(descVar === -1)} onClick={() => { setDescVar(-1); setDesc(yt.description); }}>Default</button>
                    {yt.descriptionVariants.map((v, i) => <button key={v.label} type="button" className={chip(descVar === i)} onClick={() => { setDescVar(i); setDesc(v.text); }}>{v.label}</button>)}
                  </div>
                )}
              </div>
              {chapters.length > 0 && <div>
                <p className={head}>Chapters</p>
                <ul className="grid gap-1 rounded-xl bg-sunken p-3 font-mono text-xs">{chapters.map((ch) => <li key={ch}>{ch}</li>)}</ul>
              </div>}
              {yt.moments && (
                <div>
                  <p className={head}>Key moments</p>
                  <ol className="grid gap-2">{yt.moments.map((m, k) => <li key={m.title} className="flex gap-3 rounded-xl border border-line p-3"><span className="font-display text-sm tabular-nums text-muted">{String(k + 1).padStart(2, "0")}</span><span><span className="block font-medium">{m.title}</span><span className="text-muted">{m.note}</span></span></li>)}</ol>
                </div>
              )}
              {yt.summary && (() => {
                const modes = [["Full", yt.summary.text], ["Short", yt.summary.short], ...(yt.summary.alt ? [["Creator-style", yt.summary.alt]] : [])];
                return (
                  <div>
                    <p className={head}>AI summary</p>
                    <p className="rounded-xl bg-sunken p-3 leading-relaxed">{modes[sumMode % modes.length][1]}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">{modes.map(([l], k) => <button key={l} type="button" className={chip(k === sumMode % modes.length)} onClick={() => setSumMode(k)}>{l}</button>)}</div>
                  </div>
                );
              })()}
              {yt.analysis && (
                <div>
                  <p className={head}>AI content analysis</p>
                  <dl className="grid gap-x-4 gap-y-2 rounded-xl border border-line p-3 sm:grid-cols-2">{yt.analysis.map(([k, v]) => <div key={k}><dt className="text-xs text-muted">{k}</dt><dd className="font-medium">{v}</dd></div>)}</dl>
                  {yt.topics && <div className="mt-2 flex flex-wrap gap-1.5">{yt.topics.map((t) => <span key={t} className="chip px-2.5 py-1 text-xs">{t}</span>)}</div>}
                </div>
              )}
              {yt.brand && (
                <div>
                  <p className={head}>Brand information</p>
                  <dl className="grid gap-x-4 gap-y-2 rounded-xl border border-line p-3 sm:grid-cols-2">{yt.brand.map(([k, v]) => <div key={k}><dt className="text-xs text-muted">{k}</dt><dd className="font-medium">{v}</dd></div>)}</dl>
                </div>
              )}
              {yt.copy && (
                <div className="grid gap-4 rounded-xl border border-line p-3">
                  <div><p className={head}>Hook</p><p className="rounded-lg bg-sunken p-2.5">{yt.copy.hooks[hookI]}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">{yt.copy.hooks.map((h, k) => <button key={h} type="button" className={chip(k === hookI)} onClick={() => setHookI(k)}>{k === 0 ? "Primary" : `Option ${k}`}</button>)}</div></div>
                  <div><p className={head}>Caption</p><p className="rounded-lg bg-sunken p-2.5">{yt.copy.captions[capI]}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">{yt.copy.captions.map((h, k) => <button key={h} type="button" className={chip(k === capI)} onClick={() => setCapI(k)}>{k === 0 ? "Default" : `Option ${k}`}</button>)}</div></div>
                  {yt.copy.takeaway && <div><p className={head}>One-line takeaway</p><p className="rounded-lg bg-sunken p-2.5">{yt.copy.takeaway}</p></div>}
                  <button type="button" className="w-fit text-xs underline underline-offset-4 hover:opacity-60" onClick={() => copy(`${yt.copy!.hooks[hookI]}\n\n${yt.copy!.captions[capI]}`)}>Copy hook and caption</button>
                </div>
              )}
              {yt.ctas.length > 1 && (
                <div>
                  <p className={head}>Call to action</p>
                  <div className="grid gap-2">{yt.ctas.map((cta) => <button key={cta} type="button" className="rounded-xl border border-line px-3.5 py-2.5 text-left text-sm hover:bg-sunken" onClick={() => { append(cta); toast("CTA added"); }}>{cta}</button>)}</div>
                </div>
              )}
              <div>
                <p className={head}>Thumbnail text</p>
                <div role="radiogroup" aria-label="Thumbnail text" className="grid gap-2">
                  {yt.thumbs.map((t, i) => (
                    <button key={t.join("|")} type="button" role="radio" aria-checked={i === thumb} onClick={() => { setThumb(i); toast("Thumbnail text", t.join(" · ")); }}
                      className={clsx("flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left text-sm transition-colors", i === thumb ? "border-brand bg-brand/10" : "border-line hover:bg-sunken")}>
                      <span className="min-w-0">{t.map((l) => <span key={l} className="block truncate font-medium capitalize tracking-tight">{l.toLowerCase()}</span>)}</span>
                      {i === thumb && <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand text-brand-ink"><Check size={12} /></span>}
                    </button>
                  ))}
                </div>
                <div className="mt-3" aria-label="Thumbnail preview">
                  <div className="relative grid aspect-video place-items-center overflow-hidden rounded-xl border border-text/10 bg-brand px-5 text-center text-brand-ink">
                    <span className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-accent/30" aria-hidden="true" />
                    <span className="relative font-display text-[clamp(1.1rem,2.4vw,1.6rem)] font-medium leading-[1.05] tracking-tight">
                      {yt.thumbs[thumb].map((l, k) => <span key={l} className={clsx("block", k > 0 && "text-accent")}>{l}</span>)}
                      {yt.thumbNote && <span className="mt-2 block text-xs font-normal italic opacity-80">{yt.thumbNote}</span>}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-muted">Thumbnail preview · 16:9</p>
                </div>
              </div>
              {yt.goals && <div>
                <p className={head}>Optimise for</p>
                <div role="radiogroup" aria-label="Optimise for" className="flex flex-wrap gap-1.5">{yt.goals.map((g) => <button key={g.id} type="button" role="radio" aria-checked={goal.yt_video === g.id} className={chip(goal.yt_video === g.id)} onClick={() => { setGoal({ ...goal, yt_video: g.id }); setTitle(yt.titles[g.title]); toast(`Optimised for ${g.label.toLowerCase()}`, yt.titles[g.title]); }}>{g.label}</button>)}</div>
              </div>}
              {yt.meta && (
                <div className="grid gap-4 rounded-xl border border-line p-3">
                  <div><p className={head}>Category</p>
                    {yt.meta.categories ? <div className="flex flex-wrap gap-1.5">{yt.meta.categories.map((x) => <button key={x} type="button" className={chip(x === cat)} onClick={() => setCat(x)}>{x}</button>)}</div> : <p>{cat}</p>}</div>
                  {yt.meta.contentTypes && <div><p className={head}>Content type</p><div className="flex flex-wrap gap-1.5">{yt.meta.contentTypes.map((x) => <button key={x} type="button" className={chip(x === ctype)} onClick={() => setCtype(x)}>{x}</button>)}</div></div>}
                  <div><p className={head}>Suggested tags</p><div className="flex flex-wrap gap-1.5">{yt.meta.tags.map((t) => <span key={t} className="chip px-2.5 py-1 text-xs">{t}</span>)}</div>
                    <button type="button" className="mt-2 text-xs underline underline-offset-4 hover:opacity-60" onClick={() => copy(yt.meta!.tags.join(", "))}>Copy tags</button></div>
                  {yt.meta.pinned && <div><p className={head}>Pinned comment</p>
                    <p className="rounded-lg bg-sunken p-2.5">{yt.meta.pinned[pin]}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">{yt.meta.pinned.map((p, i) => <button key={p} type="button" className={chip(i === pin)} onClick={() => setPin(i)}>{i === 0 ? "Default" : `Option ${i}`}</button>)}</div></div>}
                </div>
              )}
            </>
          )}

          {tab === "linkedin" && (
            <>
              <div>
                <label className={head} htmlFor="li-post">Post</label>
                <textarea id="li-post" className="input min-h-72 leading-relaxed" value={li} onChange={(e) => setLi(e.target.value)} />
              </div>
              <div>
                <p className={head}>Optimise for</p>
                <div role="radiogroup" aria-label="Optimise for" className="flex flex-wrap gap-1.5">{c.linkedin.tones.map((o) => <button key={o.id} type="button" role="radio" aria-checked={goal.linkedin === o.id} className={chip(goal.linkedin === o.id)} onClick={() => { setTone(o.id); toast(`${o.label} version`); }}>{o.label}</button>)}</div>
              </div>
              {c.linkedin.takeaways && (
                <div>
                  <p className={head}>Key takeaways</p>
                  <div className="grid gap-2">{c.linkedin.takeaways.map((tk) => <button key={tk} type="button" className="rounded-xl border border-line px-3.5 py-2.5 text-left text-sm hover:bg-sunken" onClick={() => { append(`Key takeaway:\n${tk}`); toast("Key takeaway added"); }}>{tk}</button>)}</div>
                </div>
              )}
            </>
          )}

          {tab === "x" && (
            <>
              <div>
                <label className={head} htmlFor="x-post">Post</label>
                <textarea id="x-post" className="input min-h-44 leading-relaxed" value={xp} onChange={(e) => setXp(e.target.value)} />
                <p className={clsx("mt-1 text-right text-xs", xp.length > 280 && !/^1\//.test(xp) ? "text-bad" : "text-muted")}>{/^1\//.test(xp) ? `Thread · ${xp.split(/\n\n(?=\d+\/ )/).length} posts` : `${xp.length} / 280${xp.length > 280 ? " · post it as a thread" : ""}`}</p>
              </div>
              <div>
                <p className={head}>Optimise for</p>
                <div role="radiogroup" aria-label="Optimise for" className="flex flex-wrap gap-1.5">{c.x.styles.map((o) => <button key={o.id} type="button" role="radio" aria-checked={goal.x === o.id} className={chip(goal.x === o.id)} onClick={() => { setTone(o.id); toast(`${o.label} style`); }}>{o.label}</button>)}</div>
              </div>
            </>
          )}

          <div>
            <p className={head}>Quick actions</p>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={next}><Sparkles size={13} />Generate new version</button>
              {c.quick[tab].map((a) => <button key={a.label} type="button" className="chip px-3 py-1.5 text-xs hover:bg-sunken" onClick={() => run(a)}>{a.label}</button>)}
            </div>
          </div>

          <button type="button" className="btn-primary w-full py-2.5" onClick={() => copy(tab === "yt_video" ? `${title}\n\n${desc}` : text)}><Copy size={14} />Copy {tab === "yt_video" ? "title and description" : "post"}</button>
        </div>
      </div>
    </>
  );
}
