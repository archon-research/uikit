/**
 * The visx-free half of the cursor layer: the pure snapping helper and the
 * stateless themed crosshair line.
 *
 * Split from `cursor-layer.tsx` so neither carries that module's
 * `@visx/xychart` `DataContext` import — see `theme.ts`'s header for why that
 * boundary is worth a file. Both ship in the
 * `@archon-research/charting/core` subpath.
 */
import type { ComponentPropsWithoutRef } from 'react';

import { chartTokens } from './theme.js';

/** Clamp `value` into the closed `[min, max]` interval. Internal to the package. */
export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/**
 * The `stop` in `stops` closest to `value` — nearest by absolute difference,
 * ties resolving to the lower stop — or `undefined` when `stops` is empty.
 *
 * `stops` must be sorted ascending. The search is a binary one, so an unsorted
 * array yields an arbitrary element rather than the nearest; this is the same
 * precondition `ChartCursorLayer` documents on its `stops` prop, and the two
 * are meant to be fed the same array.
 *
 * The empty case is `undefined` rather than `NaN` deliberately. `NaN` is
 * `number`-typed, so it type-checks its way into arithmetic and into scale and
 * SVG coordinates, where it is caught by luck if at all — `@visx/scale`
 * happens to map a non-finite input to `undefined`, which is the only reason
 * an empty `stops` does not currently paint `x1="NaN"`. `undefined` makes the
 * "no stops, no answer" case one the caller has to handle, and matches how the
 * rest of the package reports having nothing to say (`histogramBins` returns
 * `[]`, `CursorSeries.valueAt` returns `null`).
 */
export function nearestStop(
  stops: number[],
  value: number,
): number | undefined {
  const n = stops.length;
  if (n === 0) return undefined;
  if (value <= stops[0]!) return stops[0]!;
  if (value >= stops[n - 1]!) return stops[n - 1]!;

  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    const midValue = stops[mid]!;
    if (midValue === value) return midValue;
    if (midValue < value) lo = mid;
    else hi = mid;
  }
  return value - stops[lo]! <= stops[hi]! - value ? stops[lo]! : stops[hi]!;
}

export type CrosshairProps = {
  /** Pixel x of the crosshair (already resolved via `xScale`). */
  x: number;
  /** Pixel y of the plot top (`margin.top`). */
  top: number;
  /** Plot inner height (`innerHeight`) the line spans. */
  height: number;
} & Omit<ComponentPropsWithoutRef<'line'>, 'x1' | 'y1' | 'x2' | 'y2'>;

/**
 * A stateless, themed vertical crosshair line: the direct analog of the
 * themed standalone axes (`AxisBottom`/`AxisLeft`/...) for the crosshair mark
 * `ChartCursorLayer` draws internally. Unlike `ChartCursorLayer`, this has no
 * tooltip, no per-series readout dots, and no cursor state of its own — it
 * just draws one line at a pixel `x` the caller already resolved (from a
 * shared cursor position, e.g. `useSyncedCursor`), for a hand-composed chart
 * that only needs the crosshair line itself.
 */
export function Crosshair({
  x,
  top,
  height,
  stroke = chartTokens.axis,
  strokeWidth = 1,
  strokeDasharray = '3 3',
  pointerEvents = 'none',
  ...rest
}: CrosshairProps) {
  return (
    <line
      x1={x}
      y1={top}
      x2={x}
      y2={top + height}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeDasharray={strokeDasharray}
      pointerEvents={pointerEvents}
      {...rest}
    />
  );
}
