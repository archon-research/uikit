import { describe, expect, it } from 'vitest';

import { appendInPlace } from './usePlayback.js';

// `appendInPlace` is the mechanism behind `usePlayback`'s live master array:
// batches append into ONE array held for the lifetime of the source, instead
// of re-creating the array per flush. Its two load-bearing properties are (1)
// the target's identity never changes, and (2) it survives batches far larger
// than the engine's maximum argument count — the case `target.push(...items)`
// would throw RangeError on, which matters because a live source's initial
// catch-up fan-in arrives as one batch sized by the whole backlog. (The hook
// itself is a thin wiring of this into a ref + version-counter state; this
// package has no RTL/jsdom harness to exercise it via `renderHook`, matching
// how `stepChurnWarning` is tested for `useIdentityChurnWarning`.)

describe('appendInPlace', () => {
  it('appends in order without changing the target identity', () => {
    const target = [1, 2];
    const before = target;
    appendInPlace(target, [3, 4, 5]);
    expect(target).toBe(before);
    expect(target).toEqual([1, 2, 3, 4, 5]);
  });

  it('handles an empty batch as a no-op', () => {
    const target = [1];
    appendInPlace(target, []);
    expect(target).toEqual([1]);
  });

  it('survives a batch far past the engine max-argument count', () => {
    // V8 caps spread/apply argument counts around 65k; a catch-up fan-in of a
    // few hundred thousand events is a realistic single batch. 200k keeps the
    // test fast while sitting well past the cap.
    const batch = Array.from({ length: 200_000 }, (_, i) => i);
    const target: number[] = [];
    appendInPlace(target, batch);
    expect(target.length).toBe(200_000);
    expect(target[0]).toBe(0);
    expect(target[199_999]).toBe(199_999);
  });
});
