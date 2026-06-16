import type { ChartDatum, ChartMargins } from './types';

export function getDomainValues(
  data: readonly ChartDatum[],
  includeZero = false,
) {
  // Seed with zero only when an explicit zero baseline is requested; otherwise
  // derive the domain purely from the data so the full value range is visible.
  let min = includeZero ? 0 : Infinity;
  let max = includeZero ? 0 : -Infinity;

  // Reduce in a single pass (rather than spreading into Math.min/max, which
  // overflows the call stack on large series) and reject non-finite values
  // up front so a stray NaN/Infinity cannot silently poison every coordinate.
  for (const { value } of data) {
    if (!Number.isFinite(value)) {
      throw new Error(
        `Chart received a non-finite value (${value}); ChartDatum values must be finite numbers.`,
      );
    }
    if (value < min) {
      min = value;
    }
    if (value > max) {
      max = value;
    }
  }

  return { min, max };
}

export function getDrawableArea(
  width: number,
  height: number,
  margins: ChartMargins,
) {
  return {
    x: margins.left,
    y: margins.top,
    width: Math.max(width - margins.left - margins.right, 1),
    height: Math.max(height - margins.top - margins.bottom, 1),
  };
}

export function normalizeValue(
  value: number,
  min: number,
  max: number,
  drawableHeight: number,
) {
  if (max === min) {
    return drawableHeight / 2;
  }

  const ratio = (value - min) / (max - min);
  return drawableHeight - ratio * drawableHeight;
}
