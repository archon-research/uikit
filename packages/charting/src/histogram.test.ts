import { describe, expect, it } from 'vitest';

import {
  DEFAULT_BIN_COUNT,
  histogramBins,
  sortDistribution,
} from './histogram.js';

const sumCounts = (bins: { count: number }[]) =>
  bins.reduce((total, bin) => total + bin.count, 0);

describe('histogramBins', () => {
  it('returns [] for empty input', () => {
    expect(histogramBins([])).toEqual([]);
  });

  it('returns [] when no value is finite', () => {
    expect(histogramBins([NaN, Infinity, -Infinity])).toEqual([]);
  });

  it('ignores non-finite values but bins the finite ones', () => {
    const bins = histogramBins([0, NaN, 5, Infinity, 10], { binCount: 2 });
    expect(sumCounts(bins)).toBe(3);
  });

  it('defaults to DEFAULT_BIN_COUNT equal-width bins', () => {
    const bins = histogramBins(
      Array.from({ length: 100 }, (_, i) => i),
      { domain: [0, 100] },
    );
    expect(bins).toHaveLength(DEFAULT_BIN_COUNT);
    expect(sumCounts(bins)).toBe(100);
  });

  it('honours an explicit binCount', () => {
    const bins = histogramBins([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], {
      binCount: 5,
      domain: [0, 10],
    });
    expect(bins).toHaveLength(5);
    // Two values per width-2 bin.
    expect(bins.map((bin) => bin.count)).toEqual([2, 2, 2, 2, 2]);
  });

  it('lets binWidth take precedence over binCount', () => {
    const bins = histogramBins([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], {
      binCount: 2,
      binWidth: 1,
      domain: [0, 10],
    });
    // binWidth 1 over span 10 -> 10 bins, not the requested 2.
    expect(bins).toHaveLength(10);
    expect(bins.every((bin) => bin.x1 - bin.x0 === 1)).toBe(true);
    expect(sumCounts(bins)).toBe(10);
  });

  it('clamps out-of-domain values into the edge bins', () => {
    const bins = histogramBins([-100, 5, 5, 999], {
      binCount: 2,
      domain: [0, 10],
    });
    // -100 clamps into the first bin, 999 into the last; nothing dropped.
    // Bins are [0,5) and [5,10]; both 5s land in the upper bin.
    expect(sumCounts(bins)).toBe(4);
    expect(bins[0]!.count).toBe(1); // -100 (clamped to 0)
    expect(bins[1]!.count).toBe(3); // two 5s + 999 (clamped to 10)
  });

  it('counts the maximum value in the final bin (inclusive upper edge)', () => {
    const bins = histogramBins([0, 10], { binCount: 2, domain: [0, 10] });
    expect(sumCounts(bins)).toBe(2);
    expect(bins[bins.length - 1]!.count).toBe(1);
  });

  it('collapses a degenerate (all-equal) span to a single bin', () => {
    const bins = histogramBins([7, 7, 7, 7]);
    expect(bins).toHaveLength(1);
    expect(bins[0]!.count).toBe(4);
  });
});

describe('sortDistribution', () => {
  it('returns the input untouched for "none"', () => {
    const data = [3, 1, 2];
    expect(sortDistribution(data, 'none')).toBe(data);
  });

  it('sorts ascending / descending on a copy', () => {
    const data = [3, 1, 2];
    expect(sortDistribution(data, 'asc')).toEqual([1, 2, 3]);
    expect(sortDistribution(data, 'desc')).toEqual([3, 2, 1]);
    expect(data).toEqual([3, 1, 2]);
  });
});
