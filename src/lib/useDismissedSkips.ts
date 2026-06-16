"use client";

import { useCallback, useEffect, useState } from "react";

// Persists which "possible skipped log" rows the user has dismissed.
// localStorage is fine here (this runs in the deployed app, not a sandbox).
// Dismissing a row re-includes its interval in the leaderboards.
const KEY = "gascents:dismissed-skips:v1";

export function useDismissedSkips() {
  const [ids, setIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setIds(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* ignore */
    }
  }, []);

  const persist = useCallback((next: Set<string>) => {
    setIds(next);
    try {
      localStorage.setItem(KEY, JSON.stringify([...next]));
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(
    (id: string) => {
      const next = new Set(ids);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      persist(next);
    },
    [ids, persist],
  );

  return { dismissed: ids, toggle };
}
