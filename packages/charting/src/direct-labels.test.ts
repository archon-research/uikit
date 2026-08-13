import { describe, expect, it } from 'vitest';

import { resolveLabelPositions } from './direct-labels.js';

const gapOf = (positions: number[]) =>
  positions
    .slice()
    .sort((a, b) => a - b)
    .map((y, i, sorted) => (i === 0 ? Infinity : y - sorted[i - 1]!));

describe('resolveLabelPositions', () => {
  it('returns an empty array for no labels', () => {
    expect(resolveLabelPositions([], 10, 0, 100)).toEqual([]);
  });

  it('leaves already-separated labels untouched', () => {
    const result = resolveLabelPositions(
      [{ y: 10 }, { y: 40 }, { y: 80 }],
      14,
      0,
      100,
    );
    expect(result).toEqual([10, 40, 80]);
  });

  it('nudges overlapping labels apart by at least `gap`', () => {
    const result = resolveLabelPositions(
      [{ y: 50 }, { y: 52 }, { y: 54 }],
      14,
      0,
      200,
    );
    for (const separation of gapOf(result)) {
      expect(separation).toBeGreaterThanOrEqual(14 - 1e-9);
    }
  });

  it('keeps results in the input order', () => {
    // Given out-of-order ideal positions, the output index still matches input.
    const items = [{ y: 90 }, { y: 10 }, { y: 92 }];
    const result = resolveLabelPositions(items, 14, 0, 200);
    // The label that started lowest (index 1) stays the lowest value.
    expect(result[1]).toBeLessThan(result[0]!);
    expect(result[1]).toBeLessThan(result[2]!);
  });

  it('clamps every label within [min, max]', () => {
    const result = resolveLabelPositions(
      [{ y: -50 }, { y: 300 }, { y: 305 }],
      14,
      0,
      100,
    );
    for (const y of result) {
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(100);
    }
  });

  it('pulls the stack up off the bottom edge when it overflows `max`', () => {
    // Three labels crowded near the bottom must fit above max with `gap`.
    const result = resolveLabelPositions(
      [{ y: 98 }, { y: 99 }, { y: 100 }],
      14,
      0,
      100,
    );
    expect(Math.max(...result)).toBeLessThanOrEqual(100);
    for (const separation of gapOf(result)) {
      expect(separation).toBeGreaterThanOrEqual(14 - 1e-9);
    }
  });
});
