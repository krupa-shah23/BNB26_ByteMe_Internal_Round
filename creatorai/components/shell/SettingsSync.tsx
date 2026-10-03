"use client";
import { useEffect } from "react";
import { z } from "zod";
import { api, ApiError } from "@/lib/api/client";
import { mode } from "@/lib/services";
import { useHydrated, useStore } from "@/lib/store";
import type { CalendarItem } from "@/lib/types";

const item = z.custom<CalendarItem>((v) => !!v && typeof (v as CalendarItem).id === "string");
const perms = z.object({ permissions: z.object({ earnings: z.boolean(), reach: z.boolean(), audience: z.boolean(), comments: z.boolean(), decided: z.boolean() }) });
const items = z.object({ items: z.array(item) });
const one = z.object({ item });
const done = z.object({ ok: z.boolean() });

const FIELDS = ["type", "title", "startsAt", "stage", "withHandle", "projectId", "platform", "notes", "remindMin", "sound", "fired", "missed", "done"] as const;
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const pick = (c: CalendarItem, keys: readonly string[]) => Object.fromEntries(keys.filter((k) => (c as unknown as Record<string, unknown>)[k] !== undefined).map((k) => [k, (c as unknown as Record<string, unknown>)[k]]));

/**
 * BACKEND-SLOT(calendar, permissions): in live mode the server owns the calendar and data permissions.
 * Pulls once on mount, then mirrors local changes. The demo clock still fires reminders in the browser
 * (AppShell), so fast-forward works with or without the server.
 */
export function SettingsSync() {
  const hydrated = useHydrated();
  useEffect(() => {
    if (!hydrated || mode("settings") !== "live") return;
    const base = new Map<string, CalendarItem>();
    let applying = false, dead = false, running = false, queued = false;
    const apply = (p: Partial<ReturnType<typeof useStore.getState>>) => { applying = true; useStore.setState(p); applying = false; };

    const flush = async () => {
      if (running) { queued = true; return; }
      running = true;
      try {
        do {
          queued = false;
          const st = useStore.getState();
          for (const c of st.calendar) {
            if (dead) return;
            const known = base.get(c.id);
            try {
              if (!known) { const r = await api("/calendar/items", one, { method: "POST", json: pick(c, ["id", ...FIELDS.slice(0, 8)]) }).catch((e) => { if (e instanceof ApiError && e.status === 409) return { item: c }; throw e; }); base.set(c.id, r.item); }
              const cur = base.get(c.id) as CalendarItem;
              const diff = FIELDS.filter((k) => !same(c[k], cur[k]));
              if (diff.length) { const r = await api(`/calendar/items/${c.id}`, one, { method: "PATCH", json: pick(c, diff) }); base.set(c.id, r.item); }
            } catch { /* offline or rejected: stays unsynced, retried on the next change */ }
          }
          for (const id of [...base.keys()]) if (!st.calendar.some((c) => c.id === id)) await api(`/calendar/items/${id}`, done, { method: "DELETE" }).then(() => base.delete(id)).catch((e) => { if (e instanceof ApiError && e.status === 404) base.delete(id); });
        } while (queued && !dead);
      } finally { running = false; }
    };

    let tc: ReturnType<typeof setTimeout> | undefined, tp: ReturnType<typeof setTimeout> | undefined;
    const unsub = useStore.subscribe((s, prev) => {
      if (applying) return;
      if (s.calendar !== prev.calendar) { clearTimeout(tc); tc = setTimeout(() => void flush(), 400); }
      if (s.permissions !== prev.permissions) {
        clearTimeout(tp);
        tp = setTimeout(() => { const { decided, ...p } = useStore.getState().permissions; void decided; api("/me/permissions", perms, { method: "PUT", json: p }).catch(() => undefined); }, 300);
      }
    });

    Promise.all([api("/me/permissions", perms), api("/calendar/items", items)]).then(([p, c]) => {
      if (dead) return;
      base.clear(); c.items.forEach((i) => base.set(i.id, i));
      const local = useStore.getState().permissions;
      // the server has no decision yet but the user already made one locally: keep theirs and push it
      if (!p.permissions.decided && local.decided) { const { decided, ...rest } = local; void decided; api("/me/permissions", perms, { method: "PUT", json: rest }).catch(() => undefined); apply({ calendar: c.items }); }
      else apply({ permissions: p.permissions, calendar: c.items });
    }).catch(() => { /* server unreachable: keep the cached state */ });

    return () => { dead = true; clearTimeout(tc); clearTimeout(tp); unsub(); };
  }, [hydrated]);
  return null;
}
