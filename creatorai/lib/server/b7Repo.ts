import fs from "node:fs";
import path from "node:path";
import { uid } from "../projects";
import type { CalendarItem } from "../types";

export interface Permissions { earnings: boolean; reach: boolean; audience: boolean; comments: boolean; decided: boolean }
interface Db { calendar: CalendarItem[]; permissions: Permissions; swipes: Record<string, "right" | "left" | "up"> }

// Own file, like jobs.json: separate owners, no write races. CREATORAI_B7_FILE=memory keeps it in RAM (tests).
const FILE = process.env.CREATORAI_B7_FILE === "memory" ? null : process.env.CREATORAI_B7_FILE ?? path.join(process.cwd(), ".data", "b7.json");
const g = globalThis as unknown as { __creatorB7?: Db };
const DAY = 86_400_000;

export function seedCalendar(base = Date.now()): CalendarItem[] {
  const at = (d: number, h = 18) => { const x = new Date(base + d * DAY); x.setUTCHours(h, 0, 0, 0); return x.toISOString(); };
  return [
    { id: "cal1", type: "collab", title: "Collab shoot with @mock.meera", startsAt: at(6, 16), withHandle: "@mock.meera", platform: "Instagram", stage: "Scheduled", remindMin: 60, sound: true },
    { id: "cal2", type: "event", title: "Navratri: garba reel", startsAt: at(8, 10), stage: "Idea" },
    { id: "cal3", type: "deadline", title: "Ep. 13 script locked", startsAt: at(3, 21), stage: "Scripted", remindMin: 1440 },
    { id: "cal4", type: "reminder", title: "Reply to brand email", startsAt: at(0, 23), stage: "Idea", remindMin: 15, sound: true },
    { id: "cal5", type: "post", title: "Post: DSA lecture 3 short", startsAt: at(2, 19), platform: "YouTube", stage: "Editing" },
  ];
}
const seed = (): Db => ({ calendar: seedCalendar(), permissions: { earnings: false, reach: false, audience: false, comments: false, decided: false }, swipes: {} });
const load = (): Db => { if (!FILE) return seed(); try { return { ...seed(), ...(JSON.parse(fs.readFileSync(FILE, "utf8")) as Partial<Db>) }; } catch { return seed(); } };
const db = () => (g.__creatorB7 ??= load());
function persist() { if (!FILE) return; try { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(db())); } catch { /* read-only fs: memory only */ } }

export const calendar = {
  all: () => db().calendar,
  get: (id: string) => db().calendar.find((c) => c.id === id),
  add(i: Omit<CalendarItem, "id"> & { id?: string }) { const item = { ...i, id: i.id ?? uid("cal") }; db().calendar.push(item); persist(); return item; },
  patch(id: string, p: Partial<CalendarItem>) { const d = db(); const cur = d.calendar.find((c) => c.id === id); if (!cur) return undefined; Object.assign(cur, p); persist(); return cur; },
  remove(id: string) { const d = db(); const n = d.calendar.length; d.calendar = d.calendar.filter((c) => c.id !== id); persist(); return d.calendar.length < n; },
};
export const permissions = {
  get: () => db().permissions,
  set(p: Partial<Permissions>) { Object.assign(db().permissions, p, { decided: true }); persist(); return db().permissions; },
};
export const swipes = {
  all: () => db().swipes,
  record(id: string, dir: "right" | "left" | "up") { db().swipes[id] = dir; persist(); },
};
export function resetB7() { g.__creatorB7 = seed(); persist(); }
