"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useEffect, useState } from "react";
import type { CalendarItem, CreatorDNA, CreatorFeedback, Lead, Notice, Project } from "./types";
import { applyFeedback, defaultDNA } from "./creatorDna";
import { seedProjects } from "./seed";
import { uid } from "./projects";

export interface Permissions { earnings: boolean; reach: boolean; audience: boolean; comments: boolean; decided: boolean }
export interface Toast { id: string; title: string; body?: string; ms: number }

const day = 86_400_000;
function seedCalendar(): CalendarItem[] {
  const now = Date.now();
  const at = (d: number, h = 18) => { const x = new Date(now + d * day); x.setHours(h, 0, 0, 0); return x.toISOString(); };
  return [
    { id: "cal1", type: "collab", title: "Collab shoot with @mock.meera", startsAt: at(6, 16), withHandle: "@mock.meera", platform: "Instagram", stage: "Scheduled", remindMin: 60, sound: true },
    { id: "cal2", type: "event", title: "Navratri — garba reel", startsAt: at(8, 10), stage: "Idea" },
    { id: "cal3", type: "deadline", title: "Ep. 13 script locked", startsAt: at(3, 21), stage: "Scripted", remindMin: 1440 },
    { id: "cal4", type: "reminder", title: "Reply to brand email", startsAt: at(0, 23), stage: "Idea", remindMin: 15, sound: true },
    { id: "cal5", type: "post", title: "Post: DSA lecture 3 short", startsAt: at(2, 19), platform: "YouTube", stage: "Editing" },
  ];
}

interface State {
  loggedIn: boolean;
  projects: Project[];
  calendar: CalendarItem[];
  notices: Notice[];
  permissions: Permissions;
  creatorDNA: CreatorDNA;     // current distilled style profile
  creatorFeedback: CreatorFeedback[]; // persistent history of corrections
  requested: string[];       // creators we sent a collaboration message to (Tracker)
  pref: number[];            // collab preference vector
  swiped: Record<string, "right" | "left" | "up">;
  leads: (Lead & { at: string })[];
  newsletter: string[];
  timeOffsetMs: number;      // Demo Panel "fast-forward time"
  slowNetwork: boolean;
  services: Record<string, "live" | "demo">;
  forceGroup?: string;
  dirty: boolean;            // unsaved studio edits
  toasts: Toast[];
  login(): void; logout(): void;
  upsertProject(p: Project): void; patchProject(id: string, patch: Partial<Project>): void; removeProject(id: string): void;
  addCal(i: Omit<CalendarItem, "id">): void; patchCal(id: string, patch: Partial<CalendarItem>): void; removeCal(id: string): void;
  notify(title: string, body: string): void; markNoticesRead(): void;
  setPermissions(p: Partial<Permissions>): void;
  swipe(id: string, dir: "right" | "left" | "up", vec: number[]): void;
  addLead(l: Lead): void; addNewsletter(e: string): void;
  setDirty(v: boolean): void; toast(title: string, body?: string, ms?: number): void; request(id: string): void; dismissToast(id: string): void;
  setDNA(d: CreatorDNA): void; addFeedback(f: Pick<CreatorFeedback, "type" | "originalValue" | "newValue" | "context">): void;
  set(p: Partial<State>): void;
  reset(): void;
}

const initial = () => ({
  loggedIn: false,
  projects: seedProjects(),
  calendar: seedCalendar(),
  notices: [{ id: "n0", title: "Welcome to CreatorAi", body: "Drop a group of clips in Short Videos to see the magic.", at: new Date().toISOString(), read: false }] as Notice[],
  permissions: { earnings: false, reach: false, audience: false, comments: false, decided: false },
  requested: [] as string[],
  creatorDNA: defaultDNA,
  creatorFeedback: [] as CreatorFeedback[],
  pref: [0, 0, 0, 0, 0, 0, 0, 0],
  swiped: {} as Record<string, "right" | "left" | "up">,
  leads: [] as (Lead & { at: string })[],
  newsletter: [] as string[],
  timeOffsetMs: 0,
  slowNetwork: false,
  services: { captions: "demo", clips: "demo", groups: "demo", precheck: "demo" } as Record<string, "live" | "demo">,
  forceGroup: undefined as string | undefined,
  dirty: false,
  toasts: [] as Toast[],
});

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...initial(),
      login: () => set({ loggedIn: true }),
      logout: () => set({ loggedIn: false, dirty: false, toasts: [] }),
      // BACKEND-SLOT(project-patch): projects move server-side in B3; this store becomes a cache
      upsertProject: (p) => set((s) => ({ projects: [p, ...s.projects.filter((x) => x.id !== p.id)] })),
      patchProject: (id, patch) => set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p)) })),
      removeProject: (id) => set((s) => ({ projects: s.projects.filter((p) => p.id !== id) })),
      addCal: (i) => set((s) => ({ calendar: [...s.calendar, { ...i, id: uid("cal") }] })),
      patchCal: (id, patch) => set((s) => ({ calendar: s.calendar.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      removeCal: (id) => set((s) => ({ calendar: s.calendar.filter((c) => c.id !== id) })),
      notify: (title, body) => set((s) => ({ notices: [{ id: uid("n"), title, body, at: new Date().toISOString(), read: false }, ...s.notices].slice(0, 40) })),
      markNoticesRead: () => set((s) => ({ notices: s.notices.map((n) => ({ ...n, read: true })) })),
      setPermissions: (p) => set((s) => ({ permissions: { ...s.permissions, ...p } })),
      swipe: (id, dir, vec) => {
        // online preference update: right += a·v, left -= b·v, up = stronger right
        const a = dir === "up" ? 0.5 : dir === "right" ? 0.3 : -0.15;
        set((s) => ({ swiped: { ...s.swiped, [id]: dir }, pref: s.pref.map((p, i) => p + a * (vec[i] ?? 0)) }));
      },
      addLead: (l) => set((s) => ({ leads: [...s.leads, { ...l, at: new Date().toISOString() }] })),
      addNewsletter: (e) => set((s) => ({ newsletter: [...s.newsletter, e] })),
      setDirty: (v) => set({ dirty: v }),
      request: (id) => set((s) => ({ requested: s.requested.includes(id) ? s.requested : [id, ...s.requested] })),
      toast: (title, body, ms) => {
        const id = uid("t");
        set((s) => ({ toasts: [...s.toasts, { id, title, body, ms: ms ?? 5200 }] }));
        setTimeout(() => get().dismissToast(id), ms ?? 5200);
      },
      setDNA: (d) => set({ creatorDNA: { ...d, version: d.version + 1, updatedAt: new Date().toISOString() } }),
      addFeedback: (f) => set((s) => {
        if (f.originalValue === f.newValue) return s;
        const rec: CreatorFeedback = { ...f, id: uid("fb"), creatorId: s.creatorDNA.creatorId, createdAt: new Date().toISOString() };
        return { creatorFeedback: [rec, ...s.creatorFeedback].slice(0, 200), creatorDNA: applyFeedback(s.creatorDNA, rec) };
      }),
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
      set: (p) => set(p),
      reset: () => set({ ...initial(), loggedIn: true }),
    }),
    {
      name: "creatorai-v1",
      storage: createJSONStorage(() => {
        try { localStorage.setItem("__t", "1"); localStorage.removeItem("__t"); return localStorage; }
        catch { const m = new Map<string, string>(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) }; }
      }),
      partialize: (s) => {
        const { toasts, dirty, ...rest } = s;
        void toasts; void dirty;
        return Object.fromEntries(Object.entries(rest).filter(([, v]) => typeof v !== "function"));
      },
      skipHydration: true,
    },
  ),
);

/** Rehydrates the persisted store on the client and reports when it is ready (avoids SSR mismatch). */
export function useHydrated() {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    Promise.resolve(useStore.persist.rehydrate()).finally(() => setOk(true));
  }, []);
  return ok;
}

export const nowMs = () => Date.now() + useStore.getState().timeOffsetMs;

