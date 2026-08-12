import { DataContext } from '@visx/xychart';
import { useContext, useMemo } from 'react';

import { seriesColor } from './theme.js';

/** One histogram bucket: the half-open interval `[x0, x1)` and its frequency. */
export interface HistogramBin {
  x0: number;
  x1: number;
  count: number;
}

export interface HistogramBinsOptions {
  /** Number of equal-width bins across the domain (default {@link DEFAULT_BIN_COUNT}). */
  binCount?: number;
  /** Fixed bin width in data units. Takes precedence over `binCount` when > 0. */
  binWidth?: number;
  /** Explicit `[min, max]` domain; defaults to the finite data extent. */
  domain?: [number, number];
}

/** Default number of bins when neither `binCount` nor `binWidth` is given. */
export const DEFAULT_BIN_COUNT = 20;

/**
 * Pure binning helper: buckets `values` into equal-width frequency bins.
 *
 * - Non-finite values (`NaN`, `±Infinity`) are ignored; empty input (or input
 *   with no finite values) returns `[]`.
 * - `binWidth` takes precedence over `binCount` when both are supplied.
 * - `domain` fixes the `[min, max]` extent; values outside it are CLAMPED into
 *   the first/last bin rather than dropped. Without a `domain`, the finite data
 *   extent is used.
 * - A degenerate span (all values equal, or a zero-width domain) yields a
 *   single bin holding every finite value.
 *
 * Bins are half-open `[x0, x1)`; the final bin includes its upper edge so the
 * maximum value is counted.
 */
export function histogramBins(
  values: number[],
  options: HistogramBinsOptions = {},
): HistogramBin[] {
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length === 0) return [];

  const { binCount = DEFAULT_BIN_COUNT, binWidth, domain } = options;

  const min = domain ? Math.min(domain[0], domain[1]) : Math.min(...finite);
  const max = domain ? Math.max(domain[0], domain[1]) : Math.max(...finite);

  let count: number;
  let width: number;
  if (binWidth != null && binWidth > 0) {
    width = binWidth;
    count = Math.max(1, Math.ceil((max - min) / binWidth));
  } else {
    count = Math.max(1, Math.floor(binCount));
    width = (max - min) / count;
  }

  // Degenerate span: everything collapses to one bin.
  if (!(width > 0) || !Number.isFinite(width)) {
    return [{ x0: min, x1: min === max ? min + 1 : max, count: finite.length }];
  }

  const bins: HistogramBin[] = Array.from({ length: count }, (_, index) => ({
    x0: min + index * width,
    x1: min + (index + 1) * width,
    count: 0,
  }));

  for (const value of finite) {
    const clamped = value < min ? min : value > max ? max : value;
    let index = Math.floor((clamped - min) / width);
    if (index < 0) index = 0;
    if (index >= count) index = count - 1;
    bins[index]!.count += 1;
  }

  return bins;
}

type XYChartDataContext = {
  xScale?: { (value: unknown): number | undefined; bandwidth?: () => number };
  yScale?: (value: number) => number | undefined;
  innerWidth?: number;
  innerHeight?: number;
  margin?: { top: number; left: number; right: number; bottom: number };
};

export interface HistogramSeriesProps {
  /** Raw values to bin (ignored when `bins` is supplied). */
  values?: number[];
  /** Precomputed bins; when given, `values`/binning options are unused. */
  bins?: HistogramBin[];
  /** Passed to {@link histogramBins} when binning `values`. */
  binCount?: number;
  binWidth?: number;
  domain?: [number, number];
  /** Bar fill. Defaults to the primary series token. */
  color?: string;
}

/**
 * Frequency-bar mark for a histogram, rendered as a child of `<XYChart>`.
 *
 * Draws one rect per bin from either precomputed `bins` or raw `values` (binned
 * via {@link histogramBins}), reading `xScale`/`yScale`/`margin`/`innerHeight`
 * from `DataContext` so bars line up with sibling axes and never compute their
 * own domain math. Bars run from the plot baseline (count 0) up to `count`.
 *
 * The CONSUMER must set the `<XYChart>` x-domain to span the bins' `[x0, x1]`
 * extent and the y-domain to `[0, maxCount]` so the bars fill the plot — this
 * mark only positions rects within whatever scales the chart provides.
 */
export function HistogramSeries({
  values,
  bins,
  binCount,
  binWidth,
  domain,
  color = seriesColor.primary,
}: HistogramSeriesProps) {
  const {
    xScale,
    yScale,
    margin,
    innerHeight = 0,
  } = useContext(DataContext) as XYChartDataContext;

  const resolvedBins = useMemo(
    () =>
      bins ??
      (values ? histogramBins(values, { binCount, binWidth, domain }) : []),
    [bins, values, binCount, binWidth, domain],
  );

  if (!xScale || !yScale || !margin) return null;

  const baseline = margin.top + innerHeight;

  return (
    <g data-part="histogram-series">
      {resolvedBins.map((bin, index) => {
        const px0 = xScale(bin.x0);
        const px1 = xScale(bin.x1);
        const yTop = yScale(bin.count);
        if (px0 === undefined || px1 === undefined || yTop === undefined) {
          return null;
        }
        const left = Math.min(px0, px1);
        const width = Math.max(0, Math.abs(px1 - px0));
        const height = Math.max(0, baseline - yTop);
        return (
          <rect
            key={index}
            x={left}
            y={yTop}
            width={width}
            height={height}
            fill={color}
          />
        );
      })}
    </g>
  );
}

/**
 * Returns `data` sorted per `direction`. `'none'` returns the input untouched
 * (the consumer pre-sorted, or ordinal position is meaningful); `'asc'` /
 * `'desc'` sort a copy numerically. Exported for unit testing.
 */
export function sortDistribution(
  data: number[],
  direction: 'asc' | 'desc' | 'none' = 'none',
): number[] {
  if (direction === 'none') return data;
  const copy = [...data];
  copy.sort((a, b) => (direction === 'asc' ? a - b : b - a));
  return copy;
}

export interface DistributionSeriesProps {
  data: number[];
  /** How to order the bars. `'none'` (default) keeps input order. */
  sort?: 'asc' | 'desc' | 'none';
  /** The first N bars (after sorting) drawn in `highlightColor`. */
  highlightCount?: number;
  /** Fill for ordinary bars. Defaults to the primary series token. */
  color?: string;
  /** Fill for the first `highlightCount` bars. Defaults to the critical token. */
  highlightColor?: string;
}

/**
 * A distribution of hundreds of results as one thin ordinal bar per datum, with
 * a highlighted head — the shape a plain `BarSeries` can't express when the bar
 * count runs into the hundreds and only the leading few matter (e.g. the worst
 * or best N in a sorted population).
 *
 * Renders one rect per datum at its ordinal index (x = index), reading
 * `xScale`/`yScale`/`margin`/inner size from `DataContext`; the first
 * `highlightCount` bars use `highlightColor`. Render as a child of `<XYChart>`.
 *
 * The CONSUMER sets the x-domain to span `[0, data.length - 1]` (or a matching
 * band scale) and the y-domain to the value range.
 */
export function DistributionSeries({
  data,
  sort = 'none',
  highlightCount = 0,
  color = seriesColor.primary,
  highlightColor = seriesColor.critical,
}: DistributionSeriesProps) {
  const {
    xScale,
    yScale,
    margin,
    innerWidth = 0,
    innerHeight = 0,
  } = useContext(DataContext) as XYChartDataContext;

  const sorted = useMemo(() => sortDistribution(data, sort), [data, sort]);

  if (!xScale || !yScale || !margin) return null;

  const baseline = margin.top + innerHeight;
  const bandwidth =
    typeof xScale.bandwidth === 'function' ? xScale.bandwidth() : 0;
  const step =
    bandwidth > 0 ? bandwidth : innerWidth / Math.max(1, sorted.length);
  const width = Math.max(1, step * 0.8);

  return (
    <g data-part="distribution-series">
      {sorted.map((value, index) => {
        const cxRaw = xScale(index);
        const yTop = yScale(value);
        if (cxRaw === undefined || yTop === undefined) return null;
        const center = cxRaw + bandwidth / 2;
        const height = Math.max(0, baseline - yTop);
        return (
          <rect
            key={index}
            x={center - width / 2}
            y={yTop}
            width={width}
            height={height}
            fill={index < highlightCount ? highlightColor : color}
          />
        );
      })}
    </g>
  );
}
