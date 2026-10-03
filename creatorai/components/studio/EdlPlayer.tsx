"use client";
import { Player, type PlayerRef } from "@remotion/player";
import { useMemo, type MutableRefObject } from "react";
import { EdlComposition, type EdlProps } from "./Composition";
import { aspectDims, totalDur } from "@/lib/projects";

export const FPS = 30;

/** Lazy-loaded (see EdlPlayerLazy) Remotion Player rendering the EDL live. */
export default function EdlPlayer({ props, controls = true, playerRef }: { props: EdlProps; controls?: boolean; playerRef?: MutableRefObject<PlayerRef | null> }) {
  const d = aspectDims[props.aspect];
  const frames = useMemo(() => Math.max(FPS, Math.ceil(totalDur(props.timeline) * FPS)), [props.timeline]);

  return (
    <Player ref={playerRef} component={EdlComposition} inputProps={props} durationInFrames={frames} compositionWidth={d.w} compositionHeight={d.h} fps={FPS}
      controls={controls} loop clickToPlay style={{ width: "100%", height: "100%" }} acknowledgeRemotionLicense />
  );
}
