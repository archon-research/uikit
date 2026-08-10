import { describe, expect, it } from 'vitest';

import { meterPercent } from './Meter.js';

// `meterPercent` is the pure value -> percentage mapping behind `Meter` — no
// rendering involved, so it's testable directly.
describe('meterPercent', () => {
  it('maps the ends of the range to 0 and 100', () => {
    expect(meterPercent(0, 0, 100)).toBe(0);
    expect(meterPercent(100, 0, 100)).toBe(100);
  });

  it('maps the midpoint to 50', () => {
    expect(meterPercent(50, 0, 100)).toBe(50);
    expect(meterPercent(5, 0, 10)).toBe(50);
  });

  it('honours a non-zero min', () => {
    expect(meterPercent(30, 20, 40)).toBe(50);
  });

  it('clamps values outside the range', () => {
    expect(meterPercent(-10, 0, 100)).toBe(0);
    expect(meterPercent(200, 0, 100)).toBe(100);
  });

  it('returns 0 for a zero-width or inverted range', () => {
    expect(meterPercent(5, 10, 10)).toBe(0);
    expect(meterPercent(5, 10, 0)).toBe(0);
  });

  it('returns 0 for non-finite inputs', () => {
    expect(meterPercent(Number.NaN, 0, 100)).toBe(0);
    expect(meterPercent(5, 0, Number.POSITIVE_INFINITY)).toBe(0);
  });
});
