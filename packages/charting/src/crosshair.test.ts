import { describe, expect, it } from 'vitest';

import { nearestStop, snapToStop } from './crosshair.js';

const stops = [0, 10, 20, 30, 40];

describe('snapToStop', () => {
  it('returns undefined for an empty stop list', () => {
    expect(snapToStop([], 5)).toBeUndefined();
  });

  it('clamps to the first stop below the domain', () => {
    expect(snapToStop(stops, -100)).toBe(0);
  });

  it('clamps to the last stop above the domain', () => {
    expect(snapToStop(stops, 999)).toBe(40);
  });

  it('returns an exact stop unchanged', () => {
    expect(snapToStop(stops, 20)).toBe(20);
  });

  it('snaps to the nearer of two bracketing stops', () => {
    expect(snapToStop(stops, 12)).toBe(10);
    expect(snapToStop(stops, 17)).toBe(20);
  });

  it('resolves an exact midpoint tie to the lower stop', () => {
    expect(snapToStop(stops, 15)).toBe(10);
  });

  it('works with irregular (non-uniform) spacing', () => {
    const irregular = [0, 3, 100, 101];
    expect(snapToStop(irregular, 40)).toBe(3);
    expect(snapToStop(irregular, 60)).toBe(100);
  });
});

/**
 * The predecessor of `snapToStop`, still exported and still `NaN`-for-empty
 * because that pair shipped in 0.10.1. Asserted here rather than left to the
 * deprecation note: the note is what tells a reader not to use it, these are
 * what stop it changing under the consumers who already do.
 */
describe('nearestStop (deprecated)', () => {
  it('returns NaN for an empty stop list', () => {
    expect(nearestStop([], 5)).toBeNaN();
  });

  it('agrees with snapToStop everywhere a stop exists', () => {
    for (const value of [-100, 0, 12, 15, 17, 20, 999]) {
      expect(nearestStop(stops, value)).toBe(snapToStop(stops, value));
    }
  });
});
