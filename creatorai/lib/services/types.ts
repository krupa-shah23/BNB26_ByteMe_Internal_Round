import type { PrecheckContext, PrecheckResult } from "../precheck";
import type { FileFingerprint, Group, MatchResult, Project } from "../types";

export interface JobStep { key?: string; label: string; ms: number }
export interface JobProgress { stepIndex: number; progress: number; steps: JobStep[]; done: boolean }
export type JobListener = (p: JobProgress) => void;

export interface CaptionInput { tone: string; platform: string; topic: string; text?: string }
export interface CaptionOption { id: string; caption: string; cta: string; hashtags?: string[] }

export interface ClipService {
  /** Resolves when the (simulated or real) generation job has finished. */
  generate(group: Group, onProgress: JobListener): Promise<{ projectId?: string } | void>;
}
export interface CaptionService {
  suggest(input: CaptionInput): Promise<{ options: CaptionOption[]; source: "live" | "demo" }>;
}

export interface GroupService {
  /** BACKEND-SLOT(groups-match): the server scores the same fixtures. */
  match(files: FileFingerprint[], opts?: { forceGroup?: string }): Promise<MatchResult>;
}

export type Sourced<T> = T & { source: "live" | "demo" };
export interface HookService { suggest(input: { topic: string; tone?: string; count?: number }): Promise<Sourced<{ hooks: string[] }>> }
export interface ScriptService { write(input: { topic: string; groupId?: string; tone?: string }): Promise<Sourced<{ lines: string[] }>> }
export interface BioService { write(input: { niche: string; tone: string; handle?: string }): Promise<Sourced<{ bios: string[] }>> }
export interface IdeaSet { topic: string; meme: string[]; reel: string[]; hooks: string[]; formats: string[]; story: string[] }
export interface IdeaService { generate(topic: string): Promise<Sourced<{ ideas: IdeaSet }>> }

export interface PrecheckService {
  /** BACKEND-SLOT(prepublish): demo runs the same rule engine in the browser, live calls POST /projects/:id/prepublish. */
  run(project: Project, ctx?: PrecheckContext): Promise<PrecheckResult & { source: "live" | "demo" }>;
}
export interface PublishService {
  /** BACKEND-SLOT(publish): a double click must publish once, so every call carries one client-generated key. */
  publish(project: Project, opts: { acceptWarnings?: boolean } & PrecheckContext, key: string, onProgress: JobListener): Promise<void>;
}
