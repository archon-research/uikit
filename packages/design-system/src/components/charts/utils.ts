import type { ChartDatum, ChartMargins } from './types';

export function getDomainValues(data: readonly ChartDatum[]) {
  const maxValue = Math.max(...data.map((item) => item.value), 0);
  const minValue = Math.min(...data.map((item) => item.value), 0);

  return {
    min: minValue,
    max: maxValue,
  };
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
