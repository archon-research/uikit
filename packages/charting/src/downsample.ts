/**
 * Series downsampling / pixel conflation.
 *
 * A pure data transform for series with more points than a chart can
 * usefully render — apply it to a series' data BEFORE handing it to
 * `LineSeries`/`AreaSeries`/etc. `@archon-research/charting` needs no other
 * change to benefit: every visx behavior (tooltips, synced cursor, reference
 * bands) keeps working against the downsampled array exactly as it would
 * against the original.
 *
 * Two strategies, because they answer different questions:
 *
 *   - {@link lttb} (Largest-Triangle-Three-Buckets) — the default. Preserves
 *     visual SHAPE: peaks, troughs, and inflections survive, so a
 *     downsampled line looks like the original line. Right for most time
 *     series (exposure, P&L, an equity curve).
 *   - {@link minMaxPerPixel} — preserves EXTREMES exactly by emitting the min
 *     and max of each x-bucket. Right when a spike must never be lost (a
 *     risk metric, VaR), at the cost of a slightly "hairier" line.
 */

/** Past this many points per series, conflate before rendering. */
export const DOWNSAMPLE_THRESHOLD = 1_000;

export type DownsampleStrategy = 'lttb' | 'minmax' | 'none';

type Accessors<T> = {
  x: (d: T) => number;
  y: (d: T) => number;
};

/**
 * Largest-Triangle-Three-Buckets. Splits the series into `threshold - 2`
 * buckets and keeps, from each, the point forming the largest triangle with
 * the previously-kept point and the next bucket's average — the standard
 * shape-preserving choice for time series. First and last points are always
 * kept so the domain never shrinks.
 */
export function lttb<T>(
  data: T[],
  threshold: number,
  accessors: Accessors<T>,
): T[] {
  if (threshold >= data.length || threshold < 3) return data;

  const { x: getX, y: getY } = accessors;
  const sampled: T[] = [];
  const bucketSize = (data.length - 2) / (threshold - 2);

  let a = 0;
  sampled.push(data[0] as T);

  for (let i = 0; i < threshold - 2; i++) {
    // Average of the NEXT bucket — the third triangle vertex.
    const nextStart = Math.floor((i + 1) * bucketSize) + 1;
    const nextEnd = Math.min(Math.floor((i + 2) * bucketSize) + 1, data.length);
    let avgX = 0;
    let avgY = 0;
    const nextCount = Math.max(1, nextEnd - nextStart);
    for (let j = nextStart; j < nextEnd; j++) {
      avgX += getX(data[j] as T);
      avgY += getY(data[j] as T);
    }
    avgX /= nextCount;
    avgY /= nextCount;

    const rangeStart = Math.floor(i * bucketSize) + 1;
    const rangeEnd = Math.floor((i + 1) * bucketSize) + 1;
    const pointAX = getX(data[a] as T);
    const pointAY = getY(data[a] as T);

    let maxArea = -1;
    let maxAreaIndex = rangeStart;
    for (let j = rangeStart; j < Math.min(rangeEnd, data.length); j++) {
      const area =
        Math.abs(
          (pointAX - avgX) * (getY(data[j] as T) - pointAY) -
            (pointAX - getX(data[j] as T)) * (avgY - pointAY),
        ) / 2;
      if (area > maxArea) {
        maxArea = area;
        maxAreaIndex = j;
      }
    }

    sampled.push(data[maxAreaIndex] as T);
    a = maxAreaIndex;
  }

  sampled.push(data[data.length - 1] as T);
  return sampled;
}

/**
 * Min/max per pixel column: for each of `columns` x-buckets, emit that
 * bucket's minimum and maximum y (in x order). Guarantees no extreme is ever
 * dropped, which {@link lttb} does not.
 */
export function minMaxPerPixel<T>(
  data: T[],
  columns: number,
  accessors: Accessors<T>,
): T[] {
  if (data.length <= columns * 2 || columns < 1) return data;

  const { x: getX, y: getY } = accessors;
  const xs = data.map(getX);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const span = maxX - minX || 1;

  const buckets = new Map<
    number,
    { min: T; max: T; minIdx: number; maxIdx: number }
  >();
  data.forEach((datum, index) => {
    const bucket = Math.min(
      columns - 1,
      Math.floor(((getX(datum) - minX) / span) * columns),
    );
    const existing = buckets.get(bucket);
    if (!existing) {
      buckets.set(bucket, {
        min: datum,
        max: datum,
        minIdx: index,
        maxIdx: index,
      });
      return;
    }
    if (getY(datum) < getY(existing.min)) {
      existing.min = datum;
      existing.minIdx = index;
    }
    if (getY(datum) > getY(existing.max)) {
      existing.max = datum;
      existing.maxIdx = index;
    }
  });

  const out: Array<{ datum: T; index: number }> = [];
  for (const bucket of buckets.values()) {
    out.push({ datum: bucket.min, index: bucket.minIdx });
    if (bucket.maxIdx !== bucket.minIdx) {
      out.push({ datum: bucket.max, index: bucket.maxIdx });
    }
  }
  // Emit in original x order, or the line zig-zags backwards.
  out.sort((left, right) => left.index - right.index);
  return out.map((entry) => entry.datum);
}

export type DownsampleOptions<T> = {
  strategy?: DownsampleStrategy;
  /** Target point count. Defaults to {@link DOWNSAMPLE_THRESHOLD}. */
  threshold?: number;
} & Accessors<T>;

/**
 * The one call a chart consumer needs. Returns the original array untouched
 * when it's already at or under the threshold, so short series pay nothing,
 * not even an allocation.
 */
export function downsample<T>(
  data: T[],
  {
    strategy = 'lttb',
    threshold = DOWNSAMPLE_THRESHOLD,
    x,
    y,
  }: DownsampleOptions<T>,
): T[] {
  if (strategy === 'none' || data.length <= threshold) return data;
  return strategy === 'minmax'
    ? minMaxPerPixel(data, Math.floor(threshold / 2), { x, y })
    : lttb(data, threshold, { x, y });
}
