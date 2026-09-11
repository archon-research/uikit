import { describe, expect, it } from 'vitest';

import { deriveDefaultSizes, resolveControlledSize } from './splitSizes.js';

// `deriveDefaultSizes` is the pure weight -> percent math behind
// `SplitLayout`'s `SplitLayoutPanel.size` — no Ark Splitter/React rendering
// involved, so it's testable directly like `getCellFlashState` is for
// `DataTable`.

describe('deriveDefaultSizes', () => {
  it('splits evenly when every weight is equal', () => {
    const [a, b, c] = deriveDefaultSizes([1, 1, 1]);
    expect(a).toBeCloseTo(100 / 3);
    expect(b).toBeCloseTo(100 / 3);
    expect(c).toBeCloseTo(100 / 3);
  });

  it('renormalizes uneven weights proportionally', () => {
    const [a, b] = deriveDefaultSizes([1, 2]);
    expect(a).toBeCloseTo(100 / 3);
    expect(b).toBeCloseTo(200 / 3);
  });

  it('sums to 100 for an arbitrary N-way split', () => {
    const sizes = deriveDefaultSizes([1, 3, 2, 4]);
    expect(sizes.reduce((sum, size) => sum + size, 0)).toBeCloseTo(100);
  });

  it('handles a single panel as 100%', () => {
    expect(deriveDefaultSizes([1])).toEqual([100]);
  });

  it('returns an empty array for no panels', () => {
    expect(deriveDefaultSizes([])).toEqual([]);
  });

  it('falls back to an even split when every weight is zero', () => {
    expect(deriveDefaultSizes([0, 0, 0])).toEqual([100 / 3, 100 / 3, 100 / 3]);
  });

  // A restored layout is the realistic source of a weight that is not a usable
  // number: `Number(localStorage.getItem(key)) ?? 1` is `NaN`, not `1`, because
  // `NaN` is not nullish. Renormalizing it makes every percentage `NaN`, so the
  // guard has to run over the weights, not only over their total.
  it('falls back to an even split when any weight is NaN', () => {
    expect(deriveDefaultSizes([Number.NaN, 1])).toEqual([50, 50]);
  });

  it('falls back to an even split when any weight is infinite', () => {
    expect(deriveDefaultSizes([Number.POSITIVE_INFINITY, 1])).toEqual([50, 50]);
  });

  it('falls back to an even split when the total overflows to Infinity', () => {
    expect(deriveDefaultSizes([Number.MAX_VALUE, Number.MAX_VALUE])).toEqual([
      50, 50,
    ]);
  });

  // `[2, -1]` totals 1, so a total-only guard passes it straight through as
  // `[200, -100]`.
  it('falls back to an even split when weights have mixed signs', () => {
    expect(deriveDefaultSizes([2, -1])).toEqual([50, 50]);
  });

  it('never returns a percentage outside 0-100', () => {
    for (const weights of [
      [Number.NaN, 1],
      [2, -1],
      [-1, -1],
      [0, 0],
      [1, 3],
    ]) {
      for (const size of deriveDefaultSizes(weights)) {
        expect(size).toBeGreaterThanOrEqual(0);
        expect(size).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe('resolveControlledSize', () => {
  it('passes a real controlled size through unchanged', () => {
    const size = [30, 70];
    expect(resolveControlledSize(size)).toBe(size);
  });

  it('reports an omitted size as uncontrolled', () => {
    expect(resolveControlledSize(undefined)).toBeUndefined();
  });

  // `[]` is truthy, so `size ? undefined : defaultSize` used to read it as a
  // control and drop the derived sizes, while Ark had no size to apply either.
  it('reports an empty size as uncontrolled', () => {
    expect(resolveControlledSize([])).toBeUndefined();
  });
});
