import { describe, expect, it } from 'vitest';

import { skeletonBarWidthPercent } from './SkeletonRows.js';

describe('skeletonBarWidthPercent', () => {
  it('is deterministic across calls', () => {
    for (let row = 0; row < 6; row += 1) {
      for (let column = 0; column < 6; column += 1) {
        expect(skeletonBarWidthPercent(100, row, column)).toBe(
          skeletonBarWidthPercent(100, row, column),
        );
      }
    }
  });

  it('steps a column down 0/8/16 points as rows advance', () => {
    // (rowIndex * 7) % 3 for column 0 -> 0, 1, 2, 0, 1, 2
    expect(
      [0, 1, 2, 3, 4, 5].map((row) => skeletonBarWidthPercent(100, row, 0)),
    ).toEqual([100, 92, 84, 100, 92, 84]);
  });

  it('offsets neighbouring columns so rows do not shrink in lockstep', () => {
    const row = 0;
    // (columnIndex * 5) % 3 -> 0, 2, 1, 0
    expect(
      [0, 1, 2, 3].map((column) => skeletonBarWidthPercent(100, row, column)),
    ).toEqual([100, 84, 92, 100]);
  });

  it('never exceeds 100 percent', () => {
    expect(skeletonBarWidthPercent(100, 0, 0)).toBe(100);
    expect(skeletonBarWidthPercent(140, 0, 0)).toBe(100);
  });

  it('clamps narrow bars to a still-visible floor', () => {
    expect(skeletonBarWidthPercent(12, 2, 0)).toBe(10);
    expect(skeletonBarWidthPercent(10, 1, 0)).toBe(10);
  });

  it('uses no ambient randomness or clock', () => {
    const before = skeletonBarWidthPercent(55, 3, 2);
    const originalRandom = Math.random;
    Math.random = () => {
      throw new Error('Math.random must not be used');
    };
    try {
      expect(skeletonBarWidthPercent(55, 3, 2)).toBe(before);
    } finally {
      Math.random = originalRandom;
    }
  });
});
