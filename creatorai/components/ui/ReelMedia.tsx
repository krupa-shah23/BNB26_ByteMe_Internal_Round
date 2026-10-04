"use client";
import { Play, RotateCcw } from "lucide-react";
import { useRef, useState } from "react";
import clsx from "clsx";

/** A still that fills any frame: blurred copy behind, the whole picture on top (the source isn't 9:16). */
export function CoverFit({ src, alt = "", className }: { src: string; alt?: string; className?: string }) {
  return (
    <div className={clsx("relative overflow-hidden bg-sunken", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-125 object-cover opacity-80 blur-2xl" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="relative h-full w-full object-contain" />
    </div>
  );
}

/**
 * The finished reel: poster first, then a muted loop on hover or click. If the video can't load it falls back to
 * the poster with a Retry button, never a blank box. (The file has its own sound; it is always played muted here.)
 */
export function ReelPreview({ src, poster, label, className, muted = true }: { src: string; poster: string; label: string; className?: string; muted?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const reduced = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

  const play = () => { const v = ref.current; if (!v || failed) return; v.muted = muted; v.play().then(() => setPlaying(true)).catch(() => setPlaying(false)); };
  const stop = () => { const v = ref.current; if (!v) return; v.pause(); v.currentTime = 0; setPlaying(false); };

  return (
    <div className={clsx("relative overflow-hidden bg-sunken", className)}
      onMouseEnter={() => { if (!reduced()) play(); }} onMouseLeave={stop}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {poster && <img src={poster} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-125 object-cover opacity-80 blur-2xl" />}
      {failed ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={poster} alt={label} className="relative h-full w-full object-contain" />
          <div className="absolute inset-0 grid place-items-center bg-bg/60 p-3 text-center" role="alert">
            <div className="grid justify-items-center gap-2 text-sm"><span>Couldn’t load the video.</span>
              <button type="button" className="btn-ghost bg-surface px-3 py-1.5" onClick={() => { setFailed(false); setAttempt((n) => n + 1); }}><RotateCcw size={14} />Retry</button></div>
          </div>
        </>
      ) : (
        <>
          <video key={attempt} ref={ref} src={src} poster={poster || undefined} muted={muted} loop playsInline preload="metadata" aria-label={label}
            className="relative h-full w-full object-contain" onError={() => setFailed(true)} />
          <button type="button" aria-label={playing ? `Pause ${label}` : `Play ${label}`} onClick={() => (playing ? stop() : play())}
            className="absolute inset-0 grid place-items-center">
            <span className={clsx("grid h-12 w-12 place-items-center rounded-full bg-text/70 text-bg transition-opacity", playing && "opacity-0")}><Play size={20} fill="currentColor" /></span>
          </button>
        </>
      )}
    </div>
  );
}
