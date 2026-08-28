import { describe, expect, it } from 'vitest';

import { createSeededRng } from './seeded-rng.js';

const take = (count: number, seed: number): number[] => {
  const rng = createSeededRng(seed);

  return Array.from({ length: count }, () => rng.next());
};

describe('createSeededRng', () => {
  it('produces values in [0, 1)', () => {
    for (const value of take(200, 7)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('is deterministic for a seed', () => {
    expect(take(20, 42)).toEqual(take(20, 42));
  });

  it('differs between seeds', () => {
    expect(take(20, 42)).not.toEqual(take(20, 43));
  });

  it('does not immediately repeat itself', () => {
    const values = take(200, 1);

    expect(new Set(values).size).toBe(values.length);
  });

  it('rewinds to the seed on reset', () => {
    const rng = createSeededRng(99);
    const first = [rng.next(), rng.next(), rng.next()];

    rng.reset();

    expect([rng.next(), rng.next(), rng.next()]).toEqual(first);
  });

  it('draws inclusive integers', () => {
    const rng = createSeededRng(5);
    const drawn = new Set(Array.from({ length: 300 }, () => rng.int(1, 3)));

    expect([...drawn].sort()).toEqual([1, 2, 3]);
  });

  it('picks a member of the list', () => {
    const rng = createSeededRng(5);
    const items = ['a', 'b', 'c'] as const;

    for (let i = 0; i < 50; i++) {
      expect(items).toContain(rng.pick(items));
    }
  });

  it('refuses to pick from an empty list', () => {
    expect(() => createSeededRng(1).pick([])).toThrow(
      /cannot pick from an empty list/,
    );
  });

  it('shuffles a copy, deterministically, keeping every element', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    const shuffled = createSeededRng(3).shuffle(items);

    expect(items).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect([...shuffled].sort((a, b) => a - b)).toEqual(items);
    expect(shuffled).not.toEqual(items);
    expect(shuffled).toEqual(createSeededRng(3).shuffle(items));
  });

  it('picks an `undefined` element rather than reporting an empty list', () => {
    // `T` may include `undefined`. Guarding on the read instead of on the
    // length turned a legal pick into a spurious "empty list" throw.
    expect(createSeededRng(5).pick([undefined])).toBeUndefined();
  });

  it('shuffles by position, not by value', () => {
    // The swap must not be skipped for `undefined` elements: the draw is
    // consumed either way, so skipping would make the ordering depend on the
    // values and break the reproducibility this generator exists to provide.
    const withHoles = [1, undefined, 3, undefined, 5, 6, 7, 8];
    const positions = [1, 2, 3, 4, 5, 6, 7, 8];

    const shuffledHoles = createSeededRng(3).shuffle(withHoles);
    const shuffledPositions = createSeededRng(3).shuffle(positions);

    // Same seed, same length → the same permutation of indices, whatever the
    // elements are.
    expect(shuffledHoles).toEqual(
      shuffledPositions.map((p) => withHoles[p - 1]),
    );
  });

  it('gives the same sequence to a reset instance and a fresh one', () => {
    const reused = createSeededRng(11);
    void reused.next();
    reused.reset();

    expect(reused.shuffle([1, 2, 3, 4])).toEqual(
      createSeededRng(11).shuffle([1, 2, 3, 4]),
    );
  });
});
