import type { CSSProperties } from 'react';

import type { BaseChartProps, ChartMargins } from './types';
import { getDomainValues, getDrawableArea, normalizeValue } from './utils';

type BarChartProps = BaseChartProps & {
  barColor?: string;
  barGap?: number;
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

export function BarChart({
  data,
  width = 640,
  height = 220,
  barColor = 'var(--colors-text-interactive, #155eef)',
  barGap = 8,
  margins = defaultMargins,
  ariaLabel = 'Bar chart',
}: BarChartProps) {
  if (data.length === 0) {
    return null;
  }

  const domain = getDomainValues(data);
  const area = getDrawableArea(width, height, margins);
  const band = area.width / data.length;
  const barWidth = Math.max(band - barGap, 4);

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
        stroke="var(--colors-border-subtle, #d0d5dd)"
        strokeWidth="1"
      />

      {data.map((datum, index) => {
        const x = area.x + index * band + (band - barWidth) / 2;
        const barTop =
          area.y +
          normalizeValue(datum.value, domain.min, domain.max, area.height);
        const y = Math.min(barTop, area.y + area.height);
        const barHeight = Math.max(area.y + area.height - y, 2);

        return (
          <rect
            key={datum.label}
            x={x}
            y={y}
            width={barWidth}
            height={barHeight}
            rx="4"
            fill={barColor}
          />
        );
      })}
    </svg>
  );
}
