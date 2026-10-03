"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

/** Deep-linkable in-page sections: ?section=trends */
export function useSection<T extends string>(ids: readonly T[], fallback: T): [T, (s: T) => void] {
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const cur = params.get("section") as T | null;
  const value = cur && ids.includes(cur) ? cur : fallback;
  const set = useCallback((s: T) => router.replace(`${path}?section=${s}`, { scroll: false }), [router, path]);
  return [value, set];
}
