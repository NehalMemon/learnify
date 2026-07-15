'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Supported view-mode values for catalog pages.
 * Stored in `localStorage` under the provided key.
 */
export type ViewMode = 'grid' | 'list';

const DEFAULT_VIEW_MODE: ViewMode = 'grid';

/**
 * SSR-safe hook that manages a `'grid' | 'list'` preference persisted
 * to `localStorage`.
 *
 * @param storageKey - The `localStorage` key to read/write. Distinct keys
 *   allow independent preferences per catalog (e.g. courses vs quizzes).
 *
 * @returns `[viewMode, setViewMode]` — a React state tuple.
 *
 * @example
 * ```tsx
 * const [viewMode, setViewMode] = useViewMode('learnify:courses:viewMode');
 * ```
 *
 * **SSR safety**: The hook initialises to `'grid'` on the server. After
 * hydration, a one-time `useEffect` reads the real value from
 * `localStorage`, avoiding hydration mismatches.
 */
export function useViewMode(
  storageKey: string,
): [ViewMode, (mode: ViewMode) => void] {
  const [viewMode, setViewModeState] = useState<ViewMode>(DEFAULT_VIEW_MODE);

  // Hydrate from localStorage after first client render
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored === 'grid' || stored === 'list') {
        setViewModeState(stored);
      }
    } catch {
      // localStorage may be blocked by browser privacy settings — fail silently
    }
  }, [storageKey]);

  /**
   * Stable setter that writes to both React state and localStorage.
   * Wrapped in `useCallback` so downstream memoisation works correctly.
   */
  const setViewMode = useCallback(
    (mode: ViewMode) => {
      setViewModeState(mode);

      if (typeof window === 'undefined') return;

      try {
        window.localStorage.setItem(storageKey, mode);
      } catch {
        // Quota exceeded or blocked — fail silently
      }
    },
    [storageKey],
  );

  return [viewMode, setViewMode];
}
