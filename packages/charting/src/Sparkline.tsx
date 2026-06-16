import type { BaseChartProps } from './types';
import { getDomainValues, getDrawableArea, normalizeValue } from './utils';

type SparklineProps = BaseChartProps & {
  stroke?: string;
};

export function Sparkline({
  data,
  width = 160,
  height = 44,
  stroke = 'var(--colors-text-default, #111827)',
  ariaLabel = 'Sparkline',
}: SparklineProps) {
  if (data.length === 0) {
    return null;
  }

  const margins = { top: 4, right: 2, bottom: 4, left: 2 };
  const domain = getDomainValues(data);
  const area = getDrawableArea(width, height, margins);
  const stepX = data.length > 1 ? area.width / (data.length - 1) : 0;

  const path = data
    .map((datum, index) => {
      const x = area.x + index * stepX;
      const y =
        area.y +
        normalizeValue(datum.value, domain.min, domain.max, area.height);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  return (
    <svg
      aria-label={ariaLabel}
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: '100%', display: 'block' }}
    >
      <path d={path} fill="none" stroke={stroke} strokeWidth="2" />
    </svg>
  );
}
