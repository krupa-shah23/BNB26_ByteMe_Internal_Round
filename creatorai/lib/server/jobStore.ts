import fs from "node:fs";
import path from "node:path";
import type { PublishedPost } from "../schemas/publish";

/** Stored job. Progress is derived from timestamps (no timers), so it survives serverless cold starts and page refreshes. */
export interface JobRecord {
  id: string; kind: string; createdAt: number; slow: number;
  steps: { key: string; label: string; ms: number }[];
  cancelledAt?: number;
  /** the completion side effect (e.g. creating the project) has run */
  settled?: boolean;
  payload: Record<string, unknown>;
  result?: Record<string, unknown>;
}
export interface Generation { groupId: string; projectId: string; at: string }
export interface Stored { status: number; body: unknown }
interface Db { jobs: Record<string, JobRecord>; generations: Generation[]; idempotency: Record<string, Stored>; posts: PublishedPost[] }

// Separate file from projectRepo's db.json on purpose: two owners, no write races.
// CREATORAI_JOBS_FILE=memory keeps everything in RAM (tests).
const FILE = process.env.CREATORAI_JOBS_FILE === "memory" ? null : process.env.CREATORAI_JOBS_FILE ?? path.join(process.cwd(), ".data", "jobs.json");
const g = globalThis as unknown as { __creatorJobs?: Db };

const empty = (): Db => ({ jobs: {}, generations: [], idempotency: {}, posts: [] });
function load(): Db {
  if (!FILE) return empty();
  try { return { ...empty(), ...(JSON.parse(fs.readFileSync(FILE, "utf8")) as Partial<Db>) }; } catch { return empty(); }
}
const db = (): Db => (g.__creatorJobs ??= load());
function persist() {
  if (!FILE) return;
  try { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(db())); } catch { /* read-only filesystem: stay in memory */ }
}

export const jobStore = {
  job: (id: string) => db().jobs[id],
  jobs: () => Object.values(db().jobs),
  put(j: JobRecord) { db().jobs[j.id] = j; persist(); },
  patch(id: string, fn: (j: JobRecord) => void) { const j = db().jobs[id]; if (j) { fn(j); persist(); } },
  generations: () => db().generations,
  addGeneration(x: Generation) { db().generations.push(x); persist(); },
  posts: () => db().posts,
  addPost(x: PublishedPost) { db().posts.unshift(x); persist(); },
  reset() { g.__creatorJobs = empty(); persist(); },
};

/** Idempotency-Key: a repeated key returns the first stored response instead of running fn again. */
export async function once(scope: string, key: string | null, fn: () => Promise<Stored>): Promise<Stored> {
  if (!key) return fn();
  const id = `${scope}:${key}`;
  const hit = db().idempotency[id];
  if (hit) return hit;
  const res = await fn();
  db().idempotency[id] = res; persist();
  return res;
}
