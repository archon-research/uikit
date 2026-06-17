import { buildChartTheme } from '@visx/xychart';

/**
 * Single source of truth for chart colors, as CSS-variable strings.
 *
 * These resolve in SVG presentation attributes (the way visx applies series and
 * axis colors) across Chromium, Firefox, and WebKit, and track the active
 * design-system theme via the `_dark` token switch with no runtime resolution.
 * Each token carries a fallback so a missing or renamed design-system variable
 * degrades to an intentional color rather than the SVG default (black/none).
 * See packages/charting/DESIGN.md.
 */
export const chartTokens = {
  series: [
    'var(--colors-chart-series-primary, #155eef)',
    'var(--colors-chart-series-secondary, #0f766e)',
    'var(--colors-chart-series-tertiary, #7c3aed)',
    'var(--colors-chart-series-positive, #16a34a)',
    'var(--colors-chart-series-critical, #dc2626)',
  ],
  areaPrimary: 'var(--colors-chart-area-primary, #dbeafe)',
  axis: 'var(--colors-chart-axis, #6b7280)',
  grid: 'var(--colors-chart-grid, #e5e7eb)',
  surface: 'var(--colors-surface-default, #ffffff)',
  label: 'var(--colors-text-muted, #667085)',
} as const;

/**
 * Named series colors, so consumers reference roles (`seriesColor.primary`)
 * instead of magic palette indices that silently shift if the array reorders.
 */
export const seriesColor = {
  primary: chartTokens.series[0],
  secondary: chartTokens.series[1],
  tertiary: chartTokens.series[2],
  positive: chartTokens.series[3],
  critical: chartTokens.series[4],
} as const;

/** Token-driven theme for `<XYChart theme={chartTheme}>`. */
export const chartTheme = buildChartTheme({
  backgroundColor: 'transparent',
  colors: [...chartTokens.series],
  gridColor: chartTokens.grid,
  // Light/dark is handled by the CSS variable itself, so the dark variant
  // intentionally points at the same token rather than a separate color.
  gridColorDark: chartTokens.grid,
  tickLength: 6,
  svgLabelSmall: { fill: chartTokens.label, fontSize: 11 },
  svgLabelBig: { fill: chartTokens.axis, fontSize: 12 },
  xAxisLineStyles: { stroke: chartTokens.axis },
  yAxisLineStyles: { stroke: chartTokens.axis },
  xTickLineStyles: { stroke: chartTokens.axis },
  yTickLineStyles: { stroke: chartTokens.axis },
});
