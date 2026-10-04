"use client";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Check, ImagePlus, RotateCcw } from "lucide-react";
import { clipUrl, createPlayer, destroyPlayer, effectUrl, hasToken, loadEffects, setEffect, type BanubaEffect, type Ctx } from "@/lib/banuba";
import type { Project } from "@/lib/types";

/** Banuba WebAR filters inside Studio: live preview on the trimmed video (or on a photo), Apply keeps it for export. */
export function FilterPanel({ project, onApply }: { project: Project; onApply: (f: { file: string; label: string } | null) => void }) {
  const reel = project.reel!;
  const seg = project.timeline[0];
  const from = seg?.in ?? 0, to = from + (seg?.dur ?? reel.durationSec);
  const host = useRef<HTMLDivElement>(null);
  const ctx = useRef<Ctx | null>(null);
  const [effects, setEffects] = useState<BanubaEffect[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [sel, setSel] = useState<string | null>(project.filter?.file ?? null);
  const [mode, setMode] = useState<"video" | "photo">("video");
  const [photo, setPhoto] = useState<File | null>(null);
  const applied = project.filter?.file ?? null;
  const selRef = useRef(sel); selRef.current = sel;

  useEffect(() => {
    let dead = false;
    const el = host.current;
    if (!el) return;
    if (!hasToken()) { setErr("Add NEXT_PUBLIC_BANUBA_TOKEN to .env.local and restart the dev server."); setState("error"); return; }
    (async () => {
      try {
        const list = await loadEffects();
        if (dead) return;
        setEffects(list);
        const c = await createPlayer(el);
        if (dead) { await destroyPlayer(c, el); return; }
        ctx.current = c;
        c.player.use(new c.sdk.Video(clipUrl(reel.video, from, to), { loop: true }));
        if (selRef.current) await setEffect(c, selRef.current);
        c.player.play();
        setState("ready");
      } catch (e) { if (!dead) { setErr(e instanceof Error ? e.message : "Couldn’t start the filter engine"); setState("error"); } }
    })();
    return () => { dead = true; const c = ctx.current; ctx.current = null; void destroyPlayer(c, el); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pick = async (file: string | null) => {
    const c = ctx.current; if (!c) return;
    setSel(file); setBusy(file ?? "none");
    try { await setEffect(c, file); } catch { setErr("That effect couldn’t be loaded."); } finally { setBusy(null); }
  };

  const useVideo = () => { const c = ctx.current; if (!c) return; setMode("video"); c.player.use(new c.sdk.Video(clipUrl(reel.video, from, to), { loop: true })); c.player.play(); };
  const usePhoto = (f: File) => { const c = ctx.current; if (!c) return; setPhoto(f); setMode("photo"); c.player.use(new c.sdk.Image(f)); c.player.play(); };
  const savePhoto = async () => {
    const c = ctx.current; if (!c) return;
    const blob = await new c.sdk.ImageCapture(c.player).takePhoto();
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "filtered-photo.jpg"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  const groups = Array.from(new Set(effects.map((e) => e.group)));
  const ratio = mode === "video" ? `${reel.width} / ${reel.height}` : "3 / 4";
  return (
    <div className="mt-4 grid gap-4">
      <div>
        <p className="font-display text-2xl tracking-tight">Filters</p>
        <p className="mt-1 text-xs text-muted">Powered by Banuba. Pick one to preview it on your trimmed video, then Apply to keep it for export.</p>
      </div>

      <div className="mx-auto w-full overflow-hidden rounded-2xl border border-line bg-sunken" style={{ aspectRatio: ratio, maxHeight: 280 }}>
        <div ref={host} className="h-full w-full [&_canvas]:h-full [&_canvas]:w-full [&_canvas]:object-contain" aria-label="Filter preview" />
      </div>
      {state === "loading" && <p className="text-xs text-muted" role="status">Starting the filter engine…</p>}
      {state === "error" && <p role="alert" className="rounded-xl border border-bad/40 bg-bad/10 p-3 text-xs">{err}</p>}
      {state === "ready" && err && <p role="alert" className="text-xs text-bad">{err}</p>}

      <div className="flex flex-wrap gap-2">
        <button type="button" className={clsx("chip px-3 py-1", mode === "video" && "border-brand bg-brand text-brand-ink")} aria-pressed={mode === "video"} onClick={useVideo} disabled={state !== "ready"}>Video</button>
        <label className={clsx("chip cursor-pointer px-3 py-1", mode === "photo" && "border-brand bg-brand text-brand-ink", state !== "ready" && "pointer-events-none opacity-50")}>
          <ImagePlus size={12} />Photo
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) usePhoto(f); e.target.value = ""; }} />
        </label>
        {mode === "photo" && photo && <button type="button" className="btn-ghost py-1" onClick={savePhoto}>Save photo</button>}
      </div>

      <div role="radiogroup" aria-label="Filters" className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <button type="button" role="radio" aria-checked={sel === null} onClick={() => pick(null)} disabled={state !== "ready"} className={clsx("w-24 shrink-0 rounded-xl border-2 p-2 text-left text-xs", sel === null ? "border-brand" : "border-line")}>
          <span className="grid h-14 place-items-center rounded-lg bg-sunken text-muted">Aa</span><span className="mt-1.5 block font-medium">Original</span><span className="text-muted">None</span>
        </button>
        {effects.map((e) => (
          <button key={e.file} type="button" role="radio" aria-checked={sel === e.file} onClick={() => pick(e.file)} disabled={state !== "ready"} className={clsx("w-24 shrink-0 rounded-xl border-2 p-2 text-left text-xs", sel === e.file ? "border-brand" : "border-line")} data-effect={effectUrl(e.file)}>
            <span className="grid h-14 place-items-center rounded-lg bg-brand/15 text-lg">{busy === e.file ? <span className="h-3 w-3 animate-pulse rounded-full bg-brand" /> : e.label.slice(0, 2).toUpperCase()}</span>
            <span className="mt-1.5 block truncate font-medium">{e.label}</span><span className="text-muted">{e.group}</span>
          </button>
        ))}
      </div>
      {groups.length === 0 && state === "ready" && <p className="text-xs text-muted">No effects found in public/banuba/effects.</p>}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn-brand" disabled={state !== "ready" || sel === applied} onClick={() => { const e = effects.find((x) => x.file === sel); onApply(e ? { file: e.file, label: e.label } : null); }}>
          <Check size={16} />{sel === null && applied ? "Remove filter" : "Apply"}
        </button>
        <button type="button" className="btn-ghost" disabled={state !== "ready" || (sel === null && !applied)} onClick={() => { void pick(null); onApply(null); }}><RotateCcw size={16} />Reset</button>
        {applied && <span className="text-xs text-ok">Applied: {project.filter?.label}. Included when you export.</span>}
      </div>
    </div>
  );
}
