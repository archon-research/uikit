import type { BaseChartProps } from './types';
import { getDomainValues, getDrawableArea, normalizeValue } from './utils';

type SparklineProps = BaseChartProps & {
  stroke?: string;
};

export function Sparkline({
  data,
  width = 160,
  height = 44,
  stroke = 'var(--colors-chart-series-secondary, #0f766e)',
  ariaLabel = 'Sparkline',
  includeZero = false,
  getDatumTooltip,
}: SparklineProps) {
  if (data.length === 0) {
    return null;
  }

  const margins = { top: 4, right: 2, bottom: 4, left: 2 };
  const domain = getDomainValues(data, includeZero);
  const area = getDrawableArea(width, height, margins);
  const stepX = data.length > 1 ? area.width / (data.length - 1) : 0;

  const points = data.map((datum, index) => {
    const x = area.x + index * stepX;
    const y =
      area.y + normalizeValue(datum.value, domain.min, domain.max, area.height);
    return {
      datum,
      index,
      x,
      y,
    };
  });

  const path = points
    .map((point) => {
      return `${point.index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`;
    })
    .join(' ');

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: '100%', display: 'block' }}
    >
      <path d={path} fill="none" stroke={stroke} strokeWidth="2" />
      {getDatumTooltip
        ? points.map((point) => (
            <circle
              key={`${point.index}-${point.x}-${point.y}`}
              cx={point.x}
              cy={point.y}
              r="6"
              fill="transparent"
              pointerEvents="all"
            >
              <title>{getDatumTooltip(point.datum, point.index)}</title>
            </circle>
          ))
        : null}
    </svg>
  );
}
