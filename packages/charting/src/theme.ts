import { buildChartTheme } from '@visx/xychart';

/**
 * Single source of truth for chart colors, as CSS-variable strings.
 *
 * These resolve in SVG presentation attributes (the way visx applies series and
 * axis colors) across Chromium, Firefox, and WebKit, and track the active
 * design-system theme via the `_dark` token switch with no runtime resolution.
 * See packages/charting/DESIGN.md.
 */
export const chartTokens = {
  series: [
    'var(--colors-chart-series-primary)',
    'var(--colors-chart-series-secondary)',
    'var(--colors-chart-series-tertiary)',
    'var(--colors-chart-series-positive)',
    'var(--colors-chart-series-critical)',
  ],
  areaPrimary: 'var(--colors-chart-area-primary)',
  axis: 'var(--colors-chart-axis)',
  grid: 'var(--colors-chart-grid)',
  surface: 'var(--colors-surface-default)',
  label: 'var(--colors-text-muted)',
} as const;

/** Token-driven theme for `<XYChart theme={chartTheme}>`. */
export const chartTheme = buildChartTheme({
  backgroundColor: 'transparent',
  colors: [...chartTokens.series],
  gridColor: chartTokens.grid,
  gridColorDark: chartTokens.grid,
  tickLength: 6,
  svgLabelSmall: { fill: chartTokens.label, fontSize: 11 },
  svgLabelBig: { fill: chartTokens.axis, fontSize: 12 },
  xAxisLineStyles: { stroke: chartTokens.axis },
  yAxisLineStyles: { stroke: chartTokens.axis },
  xTickLineStyles: { stroke: chartTokens.axis },
  yTickLineStyles: { stroke: chartTokens.axis },
});
