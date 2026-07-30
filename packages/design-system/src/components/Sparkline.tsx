import type { SVGProps } from 'react';

export type SparklineProps = Omit<
  SVGProps<SVGSVGElement>,
  'width' | 'height' | 'fill' | 'stroke'
> & {
  /** Series values, oldest to newest. Empty renders nothing. */
  data: number[];
  /** SVG width in px. */
  width?: number;
  /** SVG height in px. Keep small; this is an axis-less micro-chart. */
  height?: number;
  /** Line colour. Defaults to the primary chart series token. */
  stroke?: string;
  /** Area colour when `area` is set. Defaults to the primary chart area token. */
  fill?: string;
  /** Stroke width in px. */
  strokeWidth?: number;
  /** Render a filled area under the line. */
  area?: boolean;
};

const SERIES_PRIMARY = 'var(--colors-chart-series-primary, currentColor)';
const AREA_PRIMARY = 'var(--colors-chart-area-primary, currentColor)';

/**
 * A lightweight, axis-less inline-SVG trend line for compact metric rails and
 * summary cards. It is a design-system primitive, not a full chart: for
 * cartesian charts with axes, grids, and tooltips use
 * `@archon-research/charting`.
 *
 * Colours default to the semantic `chart.*` tokens
 * (`--colors-chart-series-primary` / `--colors-chart-area-primary`), so the
 * sparkline tracks the light/dark theme switch automatically. Empty data
 * renders nothing and coordinates are never NaN.
 */
export function Sparkline({
  data,
  width = 160,
  height = 48,
  stroke = SERIES_PRIMARY,
  fill = AREA_PRIMARY,
  strokeWidth = 1.5,
  area = false,
  role = 'img',
  'aria-label': ariaLabel,
  ...props
}: SparklineProps) {
  if (data.length === 0) {
    return null;
  }

  const n = data.length;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  // Inset by half the stroke so the line is never clipped at the edges.
  const pad = strokeWidth / 2;
  const innerW = Math.max(width - strokeWidth, 0);
  const innerH = Math.max(height - strokeWidth, 0);

  const x = (i: number) =>
    n === 1 ? pad + innerW / 2 : pad + (i / (n - 1)) * innerW;
  const y = (value: number) => pad + innerH - ((value - min) / range) * innerH;

  const points = data.map((value, i) => `${x(i)},${y(value)}`).join(' ');

  const baseline = height - pad;
  const areaPath = `M ${x(0)},${baseline} L ${data
    .map((value, i) => `${x(i)},${y(value)}`)
    .join(' L ')} L ${x(n - 1)},${baseline} Z`;

  return (
    <svg
      {...props}
      role={role}
      aria-label={ariaLabel}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      data-scope="sparkline"
      data-part="root"
    >
      {area ? (
        <path d={areaPath} fill={fill} stroke="none" data-part="area" />
      ) : null}
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        data-part="line"
      />
    </svg>
  );
}
