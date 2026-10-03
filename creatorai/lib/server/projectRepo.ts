import fs from "node:fs";
import path from "node:path";
import type { Project, Segment } from "../types";
import { seedProjects } from "../seed";

export interface Snapshot { version: number; at: string; timeline: Segment[] }
interface Db { projects: Project[]; history: Record<string, Snapshot[]> }

// CREATORAI_DB_FILE=memory keeps projects in RAM (tests).
const FILE = process.env.CREATORAI_DB_FILE === "memory" ? null : path.join(process.cwd(), ".data", "db.json");
const HISTORY_MAX = 20;

function seed(): Db { return { projects: seedProjects(), history: {} }; }

const g = globalThis as unknown as { __creatorDb?: Db };

function load(): Db {
  if (!FILE) return seed();
  try { return JSON.parse(fs.readFileSync(FILE, "utf8")) as Db; } catch { return seed(); }
}
function db(): Db { return (g.__creatorDb ??= load()); }
/** Best effort: a read-only filesystem (Vercel) just keeps the data in memory. */
function persist() {
  if (!FILE) return;
  try { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(db())); } catch { /* in-memory only */ }
}

export const projects = {
  all: () => db().projects,
  get: (id: string) => db().projects.find((p) => p.id === id),
  insert(p: Project) { db().projects.unshift(p); persist(); return p; },
  /** Replaces the row, bumps version/updatedAt and snapshots the timeline. */
  save(p: Project, now: Date): Project {
    const d = db();
    const next = { ...p, version: p.version + 1, updatedAt: now.toISOString() };
    d.projects = d.projects.map((x) => (x.id === p.id ? next : x));
    const h = (d.history[p.id] ??= []);
    h.push({ version: next.version, at: next.updatedAt, timeline: next.timeline });
    if (h.length > HISTORY_MAX) h.splice(0, h.length - HISTORY_MAX);
    persist();
    return next;
  },
  remove(id: string) {
    const d = db(); const n = d.projects.length;
    d.projects = d.projects.filter((p) => p.id !== id); delete d.history[id]; persist();
    return d.projects.length < n;
  },
  history: (id: string) => db().history[id] ?? [],
};

export function reset() { g.__creatorDb = seed(); persist(); }
