import type { Project } from "../types";
import { ApiError } from "./http";
import { projects } from "./projectRepo";

export function findProject(id: string): Project {
  const p = projects.get(id);
  if (!p) throw new ApiError("NOT_FOUND", 404, `Project ${id} not found`);
  return p;
}

/** 409 carrying the current project so the client can refetch and retry. */
export const conflict = (current: Project) => new ApiError("CONFLICT", 409, "Project changed since you loaded it", [], { current });
