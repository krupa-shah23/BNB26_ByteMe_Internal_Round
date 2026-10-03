"use client";
import { Check, Copy, Download, Upload } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Reveal } from "@/components/ui/bits";
import { useStore } from "@/lib/store";
import { bioService } from "@/lib/services";

const token = (n: string) => `rgb(${getComputedStyle(document.documentElement).getPropertyValue(`--${n}`).trim().split(" ").join(" ")})`;
const LIMITS = { Instagram: 150, YouTube: 1000, LinkedIn: 220, X: 160 } as const;
type Net = keyof typeof LIMITS;

function PfpEditor() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [bg, setBg] = useState<"brand" | "accent" | "sunken">("brand");
  const [zoom, setZoom] = useState(1.1);
  const [grade, setGrade] = useState({ b: 105, c: 105, s: 110 });
  const draw = useCallback(() => {
    const c = canvas.current; if (!c) return;
    const ctx = c.getContext("2d")!; const S = 400;
    ctx.clearRect(0, 0, S, S);
    ctx.fillStyle = token(bg); ctx.fillRect(0, 0, S, S);
    ctx.save(); ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2 - 6, 0, Math.PI * 2); ctx.clip();
    ctx.filter = `brightness(${grade.b}%) contrast(${grade.c}%) saturate(${grade.s}%)`;
    if (img) { const k = Math.max(S / img.width, S / img.height) * zoom; ctx.drawImage(img, (S - img.width * k) / 2, (S - img.height * k) / 2, img.width * k, img.height * k); }
    else {
      ctx.fillStyle = token("bg"); ctx.beginPath(); ctx.arc(S / 2, S * 0.38, S * 0.17 * zoom, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(S / 2, S * 0.92, S * 0.34 * zoom, S * 0.3 * zoom, 0, 0, 7); ctx.fill();
    }
    ctx.restore(); ctx.filter = "none";
    ctx.lineWidth = 6; ctx.strokeStyle = token("text"); ctx.beginPath(); ctx.arc(S / 2, S / 2, S / 2 - 3, 0, 7); ctx.stroke();
  }, [img, bg, zoom, grade]);
  useEffect(() => { draw(); }, [draw]);
  // redraw when the theme (and so the tokens) changes
  useEffect(() => { const o = new MutationObserver(draw); o.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] }); return () => o.disconnect(); }, [draw]);
  const load = (f?: File) => { if (!f) return; const i = new Image(); i.onload = () => setImg(i); i.src = URL.createObjectURL(f); };
  const slider = (l: string, v: number, min: number, max: number, set: (n: number) => void) => (
    <label className="grid gap-1 text-xs text-muted">{l} · {v}<input type="range" min={min} max={max} value={v} onChange={(e) => set(+e.target.value)} className="accent-[rgb(var(--brand))]" /></label>
  );
  return (
    <section className="card grid gap-6 p-6 md:grid-cols-[260px_1fr]" aria-labelledby="pfp-h">
      <canvas ref={canvas} width={400} height={400} className="w-full rounded-full border border-line" role="img" aria-label="Profile picture preview" />
      <div className="grid content-start gap-4">
        <h2 id="pfp-h" className="t-h2">Profile picture</h2>
        <label className="btn-ghost w-fit cursor-pointer"><Upload size={16} />Upload photo<input type="file" accept="image/*" className="sr-only" onChange={(e) => load(e.target.files?.[0])} /></label>
        <div className="flex gap-2" role="radiogroup" aria-label="Background colour">{(["brand", "accent", "sunken"] as const).map((b) => <button key={b} role="radio" aria-checked={bg === b} onClick={() => setBg(b)} className={clsx("chip px-4 py-1.5 capitalize", bg === b && "border-text bg-text text-bg")}>{b}</button>)}</div>
        {slider("Crop / zoom", Math.round(zoom * 100), 80, 200, (n) => setZoom(n / 100))}
        {slider("Brightness", grade.b, 70, 140, (n) => setGrade({ ...grade, b: n }))}
        {slider("Contrast", grade.c, 70, 140, (n) => setGrade({ ...grade, c: n }))}
        {slider("Saturation", grade.s, 50, 160, (n) => setGrade({ ...grade, s: n }))}
        <button className="btn-primary w-fit" onClick={() => { const a = document.createElement("a"); a.download = "creatorai-pfp.png"; a.href = canvas.current!.toDataURL("image/png"); a.click(); }}><Download size={16} />Download PNG</button>
      </div>
    </section>
  );
}

function BioGen() {
  const [niche, setNiche] = useState("student founder content");
  const [tone, setTone] = useState("friendly");
  const [net, setNet] = useState<Net>("Instagram");
  const [opts, setOpts] = useState<string[] | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const gen = async () => {
    setBusy(true);
    const r = await bioService.write({ niche, tone });
    setOpts(r.bios.map((o) => o.slice(0, LIMITS[net])));
    setBusy(false);
  };
  return (
    <section className="card p-6" aria-labelledby="bio-h">
      <h2 id="bio-h" className="t-h2">Bio generator</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div><label htmlFor="bn" className="t-label mb-1 block text-muted">Niche</label><input id="bn" className="input" value={niche} onChange={(e) => setNiche(e.target.value)} /></div>
        <div><label htmlFor="bt" className="t-label mb-1 block text-muted">Tone</label><select id="bt" className="input" value={tone} onChange={(e) => setTone(e.target.value)}><option>friendly</option><option>pro</option><option>witty</option></select></div>
        <div><label htmlFor="bp" className="t-label mb-1 block text-muted">Platform</label><select id="bp" className="input" value={net} onChange={(e) => setNet(e.target.value as Net)}>{Object.keys(LIMITS).map((k) => <option key={k}>{k}</option>)}</select></div>
      </div>
      <button className="btn-brand mt-4" onClick={gen} disabled={busy}>{busy ? "Writing…" : "Generate 3 options"}</button>
      {opts && <ul className="mt-5 grid gap-3" aria-live="polite">{opts.map((o, i) => (
        <li key={i} className="flex items-start justify-between gap-3 rounded-xl border border-line p-4 text-sm"><div><p>{o}</p><p className={clsx("mt-1 text-xs", o.length >= LIMITS[net] ? "text-warn" : "text-muted")}>{o.length}/{LIMITS[net]}</p></div>
          <button className="btn-ghost shrink-0 py-1.5" aria-label="Copy bio" onClick={() => { navigator.clipboard?.writeText(o).catch(() => undefined); setCopied(i); setTimeout(() => setCopied(null), 1300); }}>{copied === i ? <Check size={14} /> : <Copy size={14} />}</button></li>))}</ul>}
    </section>
  );
}

function BrandKit() {
  const toast = useStore((s) => s.toast);
  const [kit, setKit] = useState({ font: "Display (Bricolage)", logo: "bottom-left", tagline: "Build in public" });
  return (
    <section className="card p-6" aria-labelledby="bk-h">
      <h2 id="bk-h" className="t-h2">Brand kit</h2>
      <p className="mt-1 text-sm text-muted">Feeds thumbnail templates and caption style. Colours come from the design tokens, so they follow light/dark automatically.</p>
      <div className="mt-4 flex gap-3" aria-label="Brand colours">{["brand", "accent", "text", "sunken"].map((c) => <div key={c} className="grid gap-1 text-center text-[11px] text-muted"><div className="h-14 w-14 rounded-2xl border border-line" style={{ background: `rgb(var(--${c}))` }} />{c}</div>)}</div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div><label htmlFor="bf" className="t-label mb-1 block text-muted">Font</label><select id="bf" className="input" value={kit.font} onChange={(e) => setKit({ ...kit, font: e.target.value })}><option>Display (Bricolage)</option><option>Text (Inter)</option></select></div>
        <div><label htmlFor="bl" className="t-label mb-1 block text-muted">Logo position</label><select id="bl" className="input" value={kit.logo} onChange={(e) => setKit({ ...kit, logo: e.target.value })}><option>bottom-left</option><option>top-right</option><option>bottom-right</option></select></div>
        <div><label htmlFor="btg" className="t-label mb-1 block text-muted">Tagline</label><input id="btg" className="input" value={kit.tagline} onChange={(e) => setKit({ ...kit, tagline: e.target.value })} /></div>
      </div>
      <button className="btn-primary mt-4" onClick={() => toast("Brand kit saved", "Applied to thumbnails and captions")}>Save brand kit</button>
    </section>
  );
}

export default function ProfileStudio() {
  return (
    <div className="mx-auto grid max-w-[1100px] gap-6">
      <Reveal><Link href="/dashboard" className="t-label text-muted hover:text-text">← Dashboard</Link><h1 className="t-h1 mt-2">Profile Studio</h1></Reveal>
      <PfpEditor /><BioGen /><BrandKit />
    </div>
  );
}
