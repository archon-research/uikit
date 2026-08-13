import { describe, expect, it } from 'vitest';

import { stepChurnWarning, type ChurnStep } from './useIdentityChurnWarning.js';

// `stepChurnWarning` is the pure streak/warn-once decision core behind
// `useIdentityChurnWarning` — no `useRef`/React rendering involved, so it's
// testable directly the same way `getCellFlashState`/`resolveHotkeyAction`
// are tested elsewhere in this package. (`useIdentityChurnWarning` itself is
// a thin ref + `console.warn` wrapper around this function, plus the
// `IS_DEV_WARNING_ENABLED` gate — this package has no RTL/jsdom harness to
// exercise via `renderHook`, so those two concerns aren't covered here.)

const initial = (previous: unknown = {}): ChurnStep => ({
  previous,
  streak: 0,
  warned: false,
  shouldWarn: false,
});

describe('stepChurnWarning', () => {
  it('is silent while the same reference is passed repeatedly', () => {
    const value = { id: 1 };
    let state = initial(value);
    for (let i = 0; i < 10; i++) {
      state = stepChurnWarning(state, value);
      expect(state.shouldWarn).toBe(false);
      expect(state.streak).toBe(0);
    }
  });

  it('warns exactly once after 5 consecutive identity changes', () => {
    let state = initial();
    const warnings: boolean[] = [];
    for (let i = 0; i < 5; i++) {
      state = stepChurnWarning(state, {});
      warnings.push(state.shouldWarn);
    }
    expect(warnings).toEqual([false, false, false, false, true]);
    expect(state.streak).toBe(5);
    expect(state.warned).toBe(true);
  });

  it('never warns twice, even as the streak keeps growing', () => {
    let state = initial();
    let warnedCount = 0;
    for (let i = 0; i < 20; i++) {
      state = stepChurnWarning(state, {});
      if (state.shouldWarn) warnedCount++;
    }
    expect(warnedCount).toBe(1);
    expect(state.streak).toBe(20);
    expect(state.warned).toBe(true);
  });

  it('resets the streak when identity stabilizes mid-churn', () => {
    let state = initial();
    // Three churns (streak 1, 2, 3) — below threshold.
    for (let i = 0; i < 3; i++) {
      state = stepChurnWarning(state, {});
    }
    expect(state.streak).toBe(3);

    // Identity stabilizes: pass the same reference back.
    const stable = state.previous;
    state = stepChurnWarning(state, stable);
    expect(state.streak).toBe(0);
    expect(state.shouldWarn).toBe(false);

    // Churning again from here needs a fresh run of 5 to warn.
    for (let i = 0; i < 4; i++) {
      state = stepChurnWarning(state, {});
    }
    expect(state.warned).toBe(false);
    state = stepChurnWarning(state, {});
    expect(state.streak).toBe(5);
    expect(state.shouldWarn).toBe(true);
  });
});
