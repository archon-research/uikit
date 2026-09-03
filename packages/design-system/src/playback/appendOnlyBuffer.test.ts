import { describe, expect, it } from 'vitest';

import { appendInPlace, createAppendOnlyBuffer } from './appendOnlyBuffer.js';

// The buffer behind `usePlayback`'s live path. It has to satisfy two things at
// once, and they pull against each other: appending must stay O(batch) (so a
// long-running feed doesn't re-copy its whole history every flush), while what
// it hands React must change identity exactly when the contents change (so a
// memoized derivation — including one the React Compiler writes for a consumer
// — invalidates when it should and only when it should). The wiring of this
// into the hook is covered by `usePlayback.live.test.ts` and
// `usePlayback.memo.test.ts`, which need a jsdom/RTL harness; this suite is the
// pure core.

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

describe('createAppendOnlyBuffer', () => {
  it('accumulates batches in order', () => {
    const buffer = createAppendOnlyBuffer<number>();
    expect(buffer.snapshot()).toEqual([]);
    buffer.append([1, 2]);
    buffer.append([3]);
    expect(buffer.snapshot()).toEqual([1, 2, 3]);
  });

  it('changes snapshot identity on append, and only on append', () => {
    const buffer = createAppendOnlyBuffer<number>();
    const empty = buffer.snapshot();
    expect(buffer.snapshot()).toBe(empty);

    buffer.append([1]);
    const afterOne = buffer.snapshot();
    expect(afterOne).not.toBe(empty);
    expect(buffer.snapshot()).toBe(afterOne);

    // An empty batch surfaces nothing, so it must not invalidate either.
    buffer.append([]);
    expect(buffer.snapshot()).toBe(afterOne);

    buffer.append([2]);
    expect(buffer.snapshot()).not.toBe(afterOne);
  });

  it('freezes each snapshot at the length it was taken over', () => {
    const buffer = createAppendOnlyBuffer<number>();
    buffer.append([1, 2]);
    const first = buffer.snapshot();
    buffer.append([3, 4]);

    expect(first).toEqual([1, 2]);
    expect(first.length).toBe(2);
    expect(first[2]).toBeUndefined();
    expect(2 in first).toBe(false);
    expect(buffer.snapshot()).toEqual([1, 2, 3, 4]);
  });

  it('behaves like a plain array', () => {
    const buffer = createAppendOnlyBuffer<number>();
    buffer.append([1, 2, 3]);
    const snapshot = buffer.snapshot();

    expect(Array.isArray(snapshot)).toBe(true);
    expect([...snapshot]).toEqual([1, 2, 3]);
    expect(snapshot.map((n) => n * 2)).toEqual([2, 4, 6]);
    expect(snapshot.filter((n) => n > 1)).toEqual([2, 3]);
    expect(snapshot.slice(-2)).toEqual([2, 3]);
    expect(snapshot[snapshot.length - 1]).toBe(3);
    expect(Object.keys(snapshot)).toEqual(['0', '1', '2']);
    expect(JSON.stringify(snapshot)).toBe('[1,2,3]');
  });

  it('rejects writes instead of corrupting the shared buffer', () => {
    const buffer = createAppendOnlyBuffer<number>();
    buffer.append([1, 2]);
    const snapshot = buffer.snapshot();

    expect(() => snapshot.push(3)).toThrow(TypeError);
    expect(() => {
      snapshot[0] = 9;
    }).toThrow(TypeError);
    expect(() => snapshot.reverse()).toThrow(TypeError);
    expect(buffer.snapshot()).toEqual([1, 2]);
  });

  it('takes a snapshot in constant time regardless of how much is buffered', () => {
    // The whole point of the design: no per-flush copy. A copy-based snapshot
    // of 500k entries would allocate 500k slots here; this must not.
    const buffer = createAppendOnlyBuffer<number>();
    buffer.append(Array.from({ length: 500_000 }, (_, i) => i));
    const snapshot = buffer.snapshot();
    expect(snapshot.length).toBe(500_000);
    expect(snapshot[499_999]).toBe(499_999);
  });
});
