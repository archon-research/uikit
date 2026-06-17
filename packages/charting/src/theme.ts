import { buildChartTheme } from '@visx/xychart';

/**
 * Source of truth for the series palette, keyed by role, as CSS-variable
 * strings. Consumers reference roles (`seriesColor.primary`) rather than a
 * palette index, and `chartTokens.series` derives its order from these, so
 * there are no magic indices to drift if the palette is reordered or resized.
 *
 * Each token carries a fallback so a missing or renamed design-system variable
 * degrades to an intentional color rather than the SVG default (black/none).
 */
export const seriesColor = {
  primary: 'var(--colors-chart-series-primary, #155eef)',
  secondary: 'var(--colors-chart-series-secondary, #0f766e)',
  tertiary: 'var(--colors-chart-series-tertiary, #7c3aed)',
  positive: 'var(--colors-chart-series-positive, #16a34a)',
  critical: 'var(--colors-chart-series-critical, #dc2626)',
} as const;

/**
 * Single source of truth for chart colors, as CSS-variable strings.
 *
 * These resolve in SVG presentation attributes (the way visx applies series and
 * axis colors) across Chromium, Firefox, and WebKit, and track the active
 * design-system theme via the `_dark` token switch with no runtime resolution.
 * Each non-series token carries a fallback for the same reason as `seriesColor`.
 * See packages/charting/DESIGN.md.
 */
export const chartTokens = {
  // Ordered palette visx consumes; roles are owned by `seriesColor` above.
  series: [
    seriesColor.primary,
    seriesColor.secondary,
    seriesColor.tertiary,
    seriesColor.positive,
    seriesColor.critical,
  ],
  areaPrimary: 'var(--colors-chart-area-primary, #dbeafe)',
  axis: 'var(--colors-chart-axis, #6b7280)',
  grid: 'var(--colors-chart-grid, #e5e7eb)',
  surface: 'var(--colors-surface-default, #ffffff)',
  label: 'var(--colors-text-muted, #667085)',
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
