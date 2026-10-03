"use client";
import { AbsoluteFill, Sequence, Video, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Aspect, Segment } from "@/lib/types";
import { gradientFor } from "@/components/ui/bits";
import { PROFILES } from "@/lib/projects";
import type { PlatformId } from "@/lib/types";

export interface EdlProps {
  timeline: Segment[]; aspect: Aspect; hue: number; groupId: string; media: boolean;
  showSafe: boolean; platform: PlatformId; selectedId?: string; title: string;
  [key: string]: unknown;
}

const label: Record<string, string> = { hook: "HOOK", demo: "DEMO", cta: "CTA", photo: "PHOTO", explain: "EXPLAIN", story: "STORY", quote: "QUOTE", punch: "PUNCHLINE" };

function Slate({ seg, idx, p }: { seg: Segment; idx: number; p: EdlProps }) {
  const f = useCurrentFrame();
  const { fps, height, width } = useVideoConfig();
  const portrait = height > width;
  const prof = PROFILES[p.platform];
  const total = seg.dur * fps;
  const fade = interpolate(f, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  const rise = interpolate(f, [0, 10], [24, 0], { extrapolateRight: "clamp" });
  const kb = seg.photo ? interpolate(f, [0, total], [1, 1.14]) : 1 + (seg.zoom ?? 0) / 100;
  const unit = Math.min(width, height);
  return (
    <AbsoluteFill style={{ background: gradientFor(p.hue + idx), overflow: "hidden" }}>
      {p.media && seg.src && (
        <AbsoluteFill style={{ transform: `scale(${kb})` }}>
          <Video src={`/demo/${p.groupId}/${seg.src}.mp4`} startFrom={Math.round((seg.in ?? 0) * fps)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </AbsoluteFill>
      )}
      {!p.media && (
        <AbsoluteFill style={{ transform: `scale(${kb})`, display: "grid", placeItems: "center" }}>
          <div style={{ width: unit * 0.34, height: unit * 0.34, borderRadius: "50%", background: "rgb(var(--brand-ink) / 0.14)", border: `${unit * 0.004}px solid rgb(var(--brand-ink) / 0.4)`, display: "grid", placeItems: "center", color: "rgb(var(--brand-ink))", fontFamily: "var(--font-display)", fontSize: unit * 0.12 }}>
            {seg.photo ? "▣" : seg.src ?? "▶"}
          </div>
        </AbsoluteFill>
      )}
      <div style={{ position: "absolute", top: `${prof.safe.top + 1}%`, left: `${prof.safe.side}%`, display: "flex", gap: unit * 0.012, color: "rgb(var(--brand-ink))", fontFamily: "var(--font-text)", fontSize: unit * 0.026, fontWeight: 700, letterSpacing: "0.14em" }}>
        <span style={{ background: "rgb(var(--text) / 0.55)", color: "rgb(var(--bg))", padding: `${unit * 0.006}px ${unit * 0.014}px`, borderRadius: 999 }}>{label[seg.kind] ?? seg.kind.toUpperCase()}</span>
        {seg.src && <span style={{ background: "rgb(var(--text) / 0.55)", color: "rgb(var(--bg))", padding: `${unit * 0.006}px ${unit * 0.014}px`, borderRadius: 999 }}>{seg.src} {Math.floor(seg.in ?? 0)}–{Math.floor(seg.out ?? 0)}s</span>}
      </div>
      {seg.caption && (
        <div style={{ position: "absolute", left: `${prof.safe.side}%`, right: `${prof.safe.side}%`, bottom: `${portrait ? prof.safe.bottom + 4 : prof.safe.bottom + 3}%`, opacity: fade, transform: `translateY(${rise}px)`, textAlign: "center" }}>
          <span style={{ display: "inline-block", background: "rgb(var(--text) / 0.78)", color: "rgb(var(--bg))", padding: `${unit * 0.014}px ${unit * 0.028}px`, borderRadius: unit * 0.02, fontFamily: "var(--font-display)", fontWeight: 600, fontSize: unit * (portrait ? 0.056 : 0.05), lineHeight: 1.15, letterSpacing: "-0.02em" }}>{seg.caption}</span>
        </div>
      )}
      {p.selectedId === seg.id && <AbsoluteFill style={{ boxShadow: `inset 0 0 0 ${unit * 0.008}px rgb(var(--accent))`, pointerEvents: "none" }} />}
      {p.showSafe && (
        <AbsoluteFill style={{ pointerEvents: "none" }}>
          <div style={{ position: "absolute", inset: 0, top: `${prof.safe.top}%`, bottom: `${prof.safe.bottom}%`, left: `${prof.safe.side}%`, right: `${prof.safe.side}%`, border: `${unit * 0.004}px dashed rgb(var(--accent))` }} />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}

export function EdlComposition(p: EdlProps) {
  return (
    <AbsoluteFill style={{ background: "rgb(var(--sunken))" }}>
      <SequenceList {...p} />
    </AbsoluteFill>
  );
}

function SequenceList(p: EdlProps) {
  const { fps } = useVideoConfig();
  return (
    <>
      {p.timeline.map((s, i) => (
        <Sequence key={s.id ?? i} from={Math.round(s.at * fps)} durationInFrames={Math.max(1, Math.round(s.dur * fps))}>
          <Slate seg={s} idx={i} p={p} />
        </Sequence>
      ))}
    </>
  );
}
