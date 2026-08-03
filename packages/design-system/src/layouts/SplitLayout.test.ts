import { describe, expect, it } from 'vitest';

import { deriveDefaultSizes } from './SplitLayout.js';

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
});
