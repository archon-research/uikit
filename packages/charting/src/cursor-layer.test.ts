import { describe, expect, it } from 'vitest';

import { nearestStop } from './cursor-layer.js';

const stops = [0, 10, 20, 30, 40];

describe('nearestStop', () => {
  it('returns NaN for an empty stop list', () => {
    expect(nearestStop([], 5)).toBeNaN();
  });

  it('clamps to the first stop below the domain', () => {
    expect(nearestStop(stops, -100)).toBe(0);
  });

  it('clamps to the last stop above the domain', () => {
    expect(nearestStop(stops, 999)).toBe(40);
  });

  it('returns an exact stop unchanged', () => {
    expect(nearestStop(stops, 20)).toBe(20);
  });

  it('snaps to the nearer of two bracketing stops', () => {
    expect(nearestStop(stops, 12)).toBe(10);
    expect(nearestStop(stops, 17)).toBe(20);
  });

  it('resolves an exact midpoint tie to the lower stop', () => {
    expect(nearestStop(stops, 15)).toBe(10);
  });

  it('works with irregular (non-uniform) spacing', () => {
    const irregular = [0, 3, 100, 101];
    expect(nearestStop(irregular, 40)).toBe(3);
    expect(nearestStop(irregular, 60)).toBe(100);
  });
});
