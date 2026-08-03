import { describe, expect, it } from 'vitest';

import { heatStep } from './HeatCell.js';

// `heatStep` is the pure value -> bucket mapping behind `HeatCell` — no
// rendering involved, so it's testable directly like `DataTable`'s
// `getCellFlashState`/`SplitLayout`'s `deriveDefaultSizes`.

describe('heatStep', () => {
  it('buckets zero as flat', () => {
    expect(heatStep(0, 10)).toBe('flat');
  });

  it('buckets a small positive value within the dead band as flat', () => {
    // domain=10, dead band is roughly +/- one sixth of the domain around 0.
    expect(heatStep(0.5, 10)).toBe('flat');
    expect(heatStep(-0.5, 10)).toBe('flat');
  });

  it('buckets the full positive and negative domain to the saturated steps', () => {
    expect(heatStep(10, 10)).toBe('pos3');
    expect(heatStep(-10, 10)).toBe('neg3');
  });

  it('clamps beyond the domain rather than inventing an eighth step', () => {
    expect(heatStep(1000, 10)).toBe('pos3');
    expect(heatStep(-1000, 10)).toBe('neg3');
  });

  it('walks through all seven steps across the domain', () => {
    expect(heatStep(-10, 10)).toBe('neg3');
    expect(heatStep(-6, 10)).toBe('neg2');
    expect(heatStep(-3, 10)).toBe('neg1');
    expect(heatStep(0, 10)).toBe('flat');
    expect(heatStep(3, 10)).toBe('pos1');
    expect(heatStep(6, 10)).toBe('pos2');
    expect(heatStep(10, 10)).toBe('pos3');
  });

  it('falls back to flat for a non-finite value', () => {
    expect(heatStep(Number.NaN, 10)).toBe('flat');
    expect(heatStep(Number.POSITIVE_INFINITY, 10)).toBe('flat');
  });

  it('falls back to flat for a non-positive domain', () => {
    expect(heatStep(5, 0)).toBe('flat');
    expect(heatStep(5, -10)).toBe('flat');
  });
});
