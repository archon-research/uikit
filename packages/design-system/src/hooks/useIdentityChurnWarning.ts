import { useRef } from 'react';

import { IS_DEV_WARNING_ENABLED } from './devWarning.js';

const THRESHOLD = 5;

export interface ChurnState {
  previous: unknown;
  streak: number;
  warned: boolean;
}

export interface ChurnStep extends ChurnState {
  /** Whether THIS call should emit the one-time warning. */
  shouldWarn: boolean;
}

/**
 * Pure streak/warn-once decision core behind {@link useIdentityChurnWarning}:
 * given the prior state and the latest value, returns the next state plus
 * whether this call should emit the warning. Exported for testing; the hook
 * wraps this in a ref so it survives across renders.
 */
export function stepChurnWarning(state: ChurnState, value: unknown): ChurnStep {
  const streak = Object.is(state.previous, value) ? 0 : state.streak + 1;
  const shouldWarn = streak >= THRESHOLD && !state.warned;
  return {
    previous: value,
    streak,
    warned: state.warned || shouldWarn,
    shouldWarn,
  };
}

/**
 * Guard for hooks that re-sync on an argument's identity (e.g. `useDataTable`'s
 * `columns`, `usePlayback`'s `source`). If `value` changes identity on
 * {@link THRESHOLD} consecutive renders — the fingerprint of an un-memoized
 * object passed fresh every render, which re-syncs the hook every render and can
 * spiral into a render loop — it logs a single `console.warn` (once per hook
 * instance; no spam), and only outside a production build. Not exported
 * publicly; used internally by the hooks that carry this footgun.
 */
export function useIdentityChurnWarning(value: unknown, label: string): void {
  const state = useRef<ChurnState>({
    previous: value,
    streak: 0,
    warned: false,
  });
  const step = stepChurnWarning(state.current, value);
  state.current = step;

  if (IS_DEV_WARNING_ENABLED && step.shouldWarn) {
    console.warn(
      `[uikit] \`${label}\` changed identity on ${step.streak} consecutive ` +
        `renders. Passing a fresh object each render re-syncs the hook every ` +
        `render and can cause a render loop — memoize it (useMemo/useCallback) ` +
        `or define it at module scope.`,
    );
  }
}
