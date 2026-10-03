"use client";
import { Image as ImageIcon, Sparkles, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { fmtTime } from "@/lib/projects";
import { useStore } from "@/lib/store";

interface Analysis {
  title: string; summary: string; hook: string; hashtags: string[]; thumbnailText: string; thumbnailMoment: number; thumbnailPrompt: string;
  highlights: { start: number; end: number; label: string; reason: string }[];
  captions: { start: number; end: number; text: string }[];
}
const MAX_MB = 18;

const errorOf = async (r: Response) => ((await r.json().catch(() => null)) as { error?: { message?: string } } | null)?.error?.message ?? `Request failed (${r.status})`;

/** Real upload: the file goes to the server, Gemini watches it, and the suggestions refer to your actual footage. */
export function AiClipLab({ format }: { format: "short" | "video" }) {
  const { toast } = useStore();
  const input = useRef<HTMLInputElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [stage, setStage] = useState<"idle" | "uploading" | "analysing" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [a, setA] = useState<Analysis | null>(null);
  const [thumb, setThumb] = useState<string | null>(null);
  const [thumbBusy, setThumbBusy] = useState(false);

  const seek = (t: number) => { if (video.current) { video.current.currentTime = t; void video.current.play(); } };

  const run = async (file: File) => {
    setError(null); setA(null); setThumb(null);
    if (!file.type.startsWith("video/")) return setError("Choose a video file.");
    if (file.size > MAX_MB * 1024 * 1024) return setError(`That file is ${(file.size / 1048576).toFixed(0)} MB. The limit is ${MAX_MB} MB for now.`);
    setName(file.name); setStage("uploading");
    try {
      const fd = new FormData(); fd.append("file", file);
      const up = await fetch("/api/upload", { method: "POST", body: fd });
      if (!up.ok) throw new Error(await errorOf(up));
      const { id, url: fileUrl } = (await up.json()) as { id: string; url: string };
      setUrl(fileUrl); setStage("analysing");
      const durationSec = await new Promise<number | undefined>((res) => {
        const v = document.createElement("video"); v.preload = "metadata";
        v.onloadedmetadata = () => res(Number.isFinite(v.duration) ? v.duration : undefined); v.onerror = () => res(undefined);
        v.src = URL.createObjectURL(file);
      });
      const an = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uploadId: id, format, durationSec }) });
      if (!an.ok) throw new Error(await errorOf(an));
      setA((await an.json()) as Analysis); setStage("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong"); setStage(url ? "done" : "idle");
    }
  };

  const makeThumb = async () => {
    if (!a) return;
    setThumbBusy(true); setError(null);
    try {
      const r = await fetch("/api/v1/thumbnails/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: a.thumbnailPrompt, text: a.thumbnailText, template: "bold", aspect: format === "short" ? "9:16" : "16:9" }) });
      if (!r.ok) throw new Error(await errorOf(r));
      setThumb(((await r.json()) as { image: string }).image);
    } catch (e) { setError(e instanceof Error ? e.message : "Thumbnail failed"); }
    setThumbBusy(false);
  };

  const copy = (text: string) => { void navigator.clipboard?.writeText(text); toast("Copied", text.slice(0, 40)); };
  const busy = stage === "uploading" || stage === "analysing";

  return (
    <section aria-label="Analyse your own clip" className="card mt-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="t-label text-muted">Your own footage · real AI analysis</p>
          <h2 className="t-h2 mt-1">Upload a clip and get real suggestions</h2>
        </div>
        <input ref={input} type="file" accept="video/*" className="sr-only" aria-label="Choose a video to analyse" onChange={(e) => { const f = e.target.files?.[0]; if (f) void run(f); e.target.value = ""; }} />
        <button className="btn-brand" disabled={busy} onClick={() => input.current?.click()}><UploadCloud size={16} />{busy ? (stage === "uploading" ? "Uploading…" : "Gemini is watching your clip…") : "Choose a video"}</button>
      </div>
      <p className="mt-2 text-sm text-muted">Up to {MAX_MB} MB. Highlights, captions, hook and hashtags come from what is actually in your video.</p>
      {error && <p role="alert" className="mt-4 rounded-xl border border-warn/40 bg-warn/10 p-3 text-sm">{error}</p>}

      {url && (
        <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,320px)_1fr]">
          <div>
            <video ref={video} src={url} controls playsInline className="w-full rounded-2xl border border-line bg-black" />
            <p className="mt-2 truncate text-xs text-muted">{name}</p>
          </div>
          {a ? (
            <div className="grid content-start gap-5 text-sm">
              <div><h3 className="t-h2">{a.title}</h3><p className="mt-1 text-muted">{a.summary}</p></div>
              <div><p className="t-label text-muted">Hook</p><button className="mt-1 text-left font-medium hover:underline" onClick={() => copy(a.hook)}>“{a.hook}”</button></div>
              <div>
                <p className="t-label text-muted">Suggested clips (tap to jump)</p>
                <ul className="mt-2 grid gap-2">
                  {a.highlights.map((h, i) => (
                    <li key={i}><button className="flex w-full items-start gap-3 rounded-xl border border-line p-2.5 text-left hover:border-brand hover:bg-sunken" onClick={() => seek(h.start)}>
                      <span className="font-mono text-xs text-muted">{fmtTime(h.start)}–{fmtTime(h.end)}</span><span><span className="block font-medium">{h.label}</span><span className="text-xs text-muted">{h.reason}</span></span></button></li>
                  ))}
                  {a.highlights.length === 0 && <li className="text-muted">No standout moments found.</li>}
                </ul>
              </div>
              {a.captions.length > 0 && (
                <div>
                  <p className="t-label text-muted">Captions</p>
                  <ul className="mt-2 grid max-h-48 gap-1 overflow-auto">{a.captions.map((c, i) => <li key={i}><button className="text-left hover:underline" onClick={() => seek(c.start)}><span className="mr-3 font-mono text-xs text-muted">{fmtTime(c.start)}</span>{c.text}</button></li>)}</ul>
                  <button className="btn-ghost mt-2" onClick={() => copy(a.captions.map((c) => c.text).join("\n"))}>Copy captions</button>
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">{a.hashtags.map((t) => <button key={t} className="chip px-3 py-1 hover:bg-sunken" onClick={() => copy("#" + t)}>#{t}</button>)}</div>
              <div>
                <p className="t-label text-muted">Thumbnail · “{a.thumbnailText}”</p>
                <div className="mt-2 flex flex-wrap items-start gap-3">
                  <button className="btn-ghost" onClick={() => seek(a.thumbnailMoment)}>Jump to best frame ({fmtTime(a.thumbnailMoment)})</button>
                  <button className="btn-brand" disabled={thumbBusy} onClick={makeThumb}>{thumbBusy ? <Sparkles size={16} /> : <ImageIcon size={16} />}{thumbBusy ? "Generating…" : "Generate AI thumbnail"}</button>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {thumb && <img src={thumb} alt={`AI thumbnail: ${a.thumbnailText}`} className="mt-3 max-h-80 rounded-2xl border border-line" />}
              </div>
            </div>
          ) : busy ? <p className="self-center text-sm text-muted">Analysing your footage… this can take up to a minute.</p> : null}
        </div>
      )}
    </section>
  );
}
