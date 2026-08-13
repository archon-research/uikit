import { useRef } from 'react';

const THRESHOLD = 5;

/**
 * Guard for hooks that re-sync on an argument's identity (e.g. `useDataTable`'s
 * `columns`, `usePlayback`'s `source`). If `value` changes identity on
 * {@link THRESHOLD} consecutive renders — the fingerprint of an un-memoized
 * object passed fresh every render, which re-syncs the hook every render and can
 * spiral into a render loop — it logs a single `console.warn` (once per hook
 * instance; no spam). Not exported publicly; used internally by the hooks that
 * carry this footgun.
 */
export function useIdentityChurnWarning(value: unknown, label: string): void {
  const previous = useRef(value);
  const streak = useRef(0);
  const warned = useRef(false);

  if (Object.is(previous.current, value)) {
    streak.current = 0;
  } else {
    streak.current += 1;
  }
  previous.current = value;

  if (streak.current >= THRESHOLD && !warned.current) {
    warned.current = true;
    console.warn(
      `[uikit] \`${label}\` changed identity on ${streak.current} consecutive ` +
        `renders. Passing a fresh object each render re-syncs the hook every ` +
        `render and can cause a render loop — memoize it (useMemo/useCallback) ` +
        `or define it at module scope.`,
    );
  }
}
