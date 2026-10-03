"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { analyzeProject } from "@/lib/compliance/analyze";
import type { Compliance } from "@/lib/compliance/types";
import { useStore } from "@/lib/store";
import type { Project } from "@/lib/types";

/**
 * Holds the review-lane state for the open project. Local state keeps drags smooth; every change is written
 * back to the project (debounced) so Review and a reload see the same thing.
 */
export function useCompliance(project: Project | undefined) {
  const patch = useStore((s) => s.patchProject);
  const [c, setC] = useState<Compliance | null>(() => (project ? project.compliance ?? analyzeProject(project) : null));
  const saved = useRef<Compliance | undefined>(project?.compliance);

  useEffect(() => { if (!c && project) setC(project.compliance ?? analyzeProject(project)); }, [c, project]);

  useEffect(() => {
    if (!c || !project || saved.current === c) return;
    const t = setTimeout(() => { saved.current = c; patch(project.id, { compliance: c }); }, 350);
    return () => clearTimeout(t);
  }, [c, project, patch]);

  // flush on unmount so "Done" right after a change can't lose it
  const latest = useRef({ c, id: project?.id }); latest.current = { c, id: project?.id };
  useEffect(() => () => { const { c: cur, id } = latest.current; if (cur && id && saved.current !== cur) patch(id, { compliance: cur }); }, [patch]);

  const apply = useCallback((fn: (c: Compliance) => Compliance) => setC((cur) => (cur ? fn(cur) : cur)), []);
  return [c, apply] as const;
}
