import type { CSSProperties } from 'react';

import type { BaseChartProps, ChartMargins } from './types';
import { getDomainValues, getDrawableArea, normalizeValue } from './utils';

type LineChartProps = BaseChartProps & {
  stroke?: string;
  fill?: string;
  showPoints?: boolean;
  showArea?: boolean;
  margins?: ChartMargins;
};

const svgStyle: CSSProperties = {
  width: '100%',
  display: 'block',
};

const defaultMargins: ChartMargins = {
  top: 8,
  right: 8,
  bottom: 20,
  left: 8,
};

export function LineChart({
  data,
  width = 640,
  height = 220,
  stroke = 'var(--colors-chart-series-primary, #155eef)',
  fill = 'color-mix(in srgb, var(--colors-chart-area-primary, #dbeafe) 60%, transparent)',
  showPoints = true,
  showArea = true,
  margins = defaultMargins,
  ariaLabel = 'Line chart',
}: LineChartProps) {
  if (data.length === 0) {
    return null;
  }

  const domain = getDomainValues(data);
  const area = getDrawableArea(width, height, margins);
  const stepX = data.length > 1 ? area.width / (data.length - 1) : 0;

  const points = data.map((datum, index) => {
    const x = area.x + index * stepX;
    const y =
      area.y + normalizeValue(datum.value, domain.min, domain.max, area.height);

    return {
      ...datum,
      x,
      y,
    };
  });

  const path = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  const areaPath = `${path} L ${area.x + area.width} ${area.y + area.height} L ${area.x} ${area.y + area.height} Z`;

  return (
    <svg
      aria-label={ariaLabel}
      viewBox={`0 0 ${width} ${height}`}
      style={svgStyle}
    >
      <line
        x1={area.x}
        y1={area.y + area.height}
        x2={area.x + area.width}
        y2={area.y + area.height}
        stroke="var(--colors-chart-axis, #6b7280)"
        strokeWidth="1"
      />

      {showArea ? <path d={areaPath} fill={fill} /> : null}

      <path d={path} fill="none" stroke={stroke} strokeWidth="2" />

      {showPoints
        ? points.map((point) => (
            <circle
              key={point.label}
              cx={point.x}
              cy={point.y}
              r="3"
              fill={stroke}
              stroke="var(--colors-surface-default, #ffffff)"
              strokeWidth="1.5"
            />
          ))
        : null}
    </svg>
  );
}
