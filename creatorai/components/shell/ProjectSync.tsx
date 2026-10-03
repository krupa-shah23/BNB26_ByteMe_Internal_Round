"use client";
import { useEffect } from "react";
import { META_FIELDS, isConflict, isMissing, projectApi } from "@/lib/api/projects";
import { mode } from "@/lib/services";
import { useHydrated, useStore } from "@/lib/store";
import type { Project } from "@/lib/types";

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * BACKEND-SLOT(project-patch): in live mode the server owns projects and the Zustand list is a cache.
 * Pulls once on mount, then mirrors every local change (create / patch / delete) to the API, so the
 * existing screens keep calling patchProject/upsertProject/removeProject unchanged.
 */
export function ProjectSync() {
  const hydrated = useHydrated();
  useEffect(() => {
    if (!hydrated || mode("projects") !== "live") return;
    const base = new Map<string, Project>(); // last state the server confirmed
    let applying = false, queued = false, running = false, dead = false;

    const setLocal = (fn: (list: Project[]) => Project[]) => { applying = true; useStore.setState((s) => ({ projects: fn(s.projects) })); applying = false; };
    /** Takes the server's copy but keeps any newer local edits (they diff again and are sent next round). */
    const confirm = (srv: Project, sent: Project) => {
      base.set(srv.id, srv);
      setLocal((l) => l.map((p) => (p.id === srv.id ? { ...p, version: srv.version, updatedAt: srv.updatedAt, ...(same(p, sent) ? srv : {}) } : p)));
    };
    const adopt = (srv: Project) => { base.set(srv.id, srv); setLocal((l) => (l.some((p) => p.id === srv.id) ? l.map((p) => (p.id === srv.id ? srv : p)) : [srv, ...l])); };

    const push = async (local: Project, from: Project) => {
      let cur = from;
      if (!same(local.timeline, cur.timeline)) cur = await projectApi.patchTimeline(cur.id, cur.version, local.timeline);
      const patch: Record<string, unknown> = {};
      for (const k of META_FIELDS) if (!same(local[k], cur[k])) patch[k] = local[k] ?? null;
      if (Object.keys(patch).length) cur = await projectApi.patchMeta(cur.id, cur.version, patch);
      return cur;
    };

    const flush = async () => {
      if (running) { queued = true; return; }
      running = true;
      try {
        do {
          queued = false;
          const local = useStore.getState().projects;
          for (const p of local) {
            if (dead) return;
            const known = base.get(p.id);
            try {
              if (!known) {
                let created: Project;
                try { created = await projectApi.create(p); } catch (e) { if (!isConflict(e)) throw e; created = await projectApi.get(p.id); }
                confirm(await push(p, created), p);
              } else if (!same(p.timeline, known.timeline) || META_FIELDS.some((k) => !same(p[k], known[k]))) {
                confirm(await push(p, { ...known, version: known.version }), p);
              }
            } catch (e) {
              if (isConflict(e) || isMissing(e)) { // server wins: refetch, or drop what the server no longer has
                try { adopt(await projectApi.get(p.id)); useStore.getState().toast("Refreshed", "This project changed elsewhere."); } catch { base.delete(p.id); setLocal((l) => l.filter((x) => x.id !== p.id)); }
              } // other failures (offline, timeout) leave the project unsynced; the next change retries
            }
          }
          for (const id of [...base.keys()]) {
            if (!useStore.getState().projects.some((p) => p.id === id)) { try { await projectApi.remove(id); base.delete(id); } catch (e) { if (isMissing(e)) base.delete(id); } }
          }
        } while (queued && !dead);
      } finally { running = false; }
    };

    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsub = useStore.subscribe((s, prev) => {
      if (applying || s.projects === prev.projects) return;
      clearTimeout(timer); timer = setTimeout(() => void flush(), 400);
    });

    projectApi.list().then((list) => {
      if (dead) return;
      base.clear(); list.forEach((p) => base.set(p.id, p));
      setLocal(() => list);
    }).catch(() => { /* server unreachable: keep the cached projects and retry on the next change */ });

    return () => { dead = true; clearTimeout(timer); unsub(); };
  }, [hydrated]);
  return null;
}
