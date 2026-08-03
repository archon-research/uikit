import { describe, expect, it } from 'vitest';

import {
  DOWNSAMPLE_THRESHOLD,
  downsample,
  lttb,
  minMaxPerPixel,
} from './downsample.js';

type Point = { t: number; v: number };

function series(length: number, y: (i: number) => number): Point[] {
  return Array.from({ length }, (_, i) => ({ t: i, v: y(i) }));
}

const accessors = { x: (d: Point) => d.t, y: (d: Point) => d.v };

describe('lttb', () => {
  it('preserves shape: keeps the first and last point and returns exactly `threshold` points', () => {
    const data = series(5_000, (i) => Math.sin(i / 50) * 100);
    const threshold = 200;

    const result = lttb(data, threshold, accessors);

    expect(result).toHaveLength(threshold);
    expect(result[0]).toBe(data[0]);
    expect(result[result.length - 1]).toBe(data[data.length - 1]);
  });

  it('keeps points in ascending x order', () => {
    const data = series(2_000, (i) => Math.cos(i / 30) * 10 + i);
    const result = lttb(data, 100, accessors);

    for (let i = 1; i < result.length; i++) {
      expect(accessors.x(result[i] as Point)).toBeGreaterThan(
        accessors.x(result[i - 1] as Point),
      );
    }
  });

  it('passes through unchanged when threshold is at or above the data length', () => {
    const data = series(50, (i) => i);
    expect(lttb(data, 50, accessors)).toBe(data);
    expect(lttb(data, 1_000, accessors)).toBe(data);
  });

  it('passes through unchanged when threshold is below the minimum bucket count', () => {
    const data = series(50, (i) => i);
    expect(lttb(data, 2, accessors)).toBe(data);
  });
});

describe('minMaxPerPixel', () => {
  it('preserves the global min and max exactly', () => {
    const data = series(5_000, (i) => Math.sin(i / 17) * 50);
    // Plant an unambiguous global extreme in the middle of the series.
    data[2_500] = { t: 2_500, v: 10_000 };
    data[2_600] = { t: 2_600, v: -10_000 };

    const result = minMaxPerPixel(data, 100, accessors);

    const resultMax = Math.max(...result.map(accessors.y));
    const resultMin = Math.min(...result.map(accessors.y));
    expect(resultMax).toBe(10_000);
    expect(resultMin).toBe(-10_000);
  });

  it('keeps points in ascending x order', () => {
    const data = series(3_000, (i) => Math.sin(i / 11) * 5);
    const result = minMaxPerPixel(data, 80, accessors);

    for (let i = 1; i < result.length; i++) {
      expect(accessors.x(result[i] as Point)).toBeGreaterThan(
        accessors.x(result[i - 1] as Point),
      );
    }
  });

  it('passes through unchanged when the series is too small to bucket meaningfully', () => {
    const data = series(10, (i) => i);
    expect(minMaxPerPixel(data, 100, accessors)).toBe(data);
  });
});

describe('downsample', () => {
  it('passes series at or under the threshold through untouched, with no allocation', () => {
    const data = series(DOWNSAMPLE_THRESHOLD, (i) => i);
    expect(downsample(data, accessors)).toBe(data);

    const small = series(10, (i) => i);
    expect(downsample(small, { ...accessors, threshold: 1_000 })).toBe(small);
  });

  it('defaults to the lttb strategy above the threshold', () => {
    const data = series(DOWNSAMPLE_THRESHOLD + 1, (i) => Math.sin(i / 40) * 10);
    const result = downsample(data, accessors);

    expect(result.length).toBeLessThan(data.length);
    expect(result[0]).toBe(data[0]);
    expect(result[result.length - 1]).toBe(data[data.length - 1]);
  });

  it('dispatches to minMaxPerPixel and preserves extremes when strategy is "minmax"', () => {
    const data = series(5_000, (i) => Math.sin(i / 17) * 50);
    data[2_500] = { t: 2_500, v: 10_000 };

    const result = downsample(data, { ...accessors, strategy: 'minmax' });

    expect(Math.max(...result.map(accessors.y))).toBe(10_000);
  });

  it('passes through untouched when strategy is "none", regardless of length', () => {
    const data = series(5_000, (i) => i);
    expect(downsample(data, { ...accessors, strategy: 'none' })).toBe(data);
  });
});
