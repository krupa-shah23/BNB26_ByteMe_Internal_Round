import type { Group } from "../types";

export interface JobStep { label: string; ms: number }
export interface JobProgress { stepIndex: number; progress: number; steps: JobStep[]; done: boolean }
export type JobListener = (p: JobProgress) => void;

export interface CaptionInput { tone: string; platform: string; topic: string; text?: string; style?: string }
export interface CaptionOption { id: string; caption: string; cta: string }

export interface ClipService {
  /** Resolves when the (simulated or real) generation job has finished. */
  generate(group: Group, onProgress: JobListener): Promise<void>;
}
export interface CaptionService {
  suggest(input: CaptionInput): Promise<{ options: CaptionOption[]; source: "live" | "demo" }>;
}
