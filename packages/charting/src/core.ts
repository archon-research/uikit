/**
 * `@archon-research/charting/core` — everything this package offers that does
 * NOT import `@visx/*`.
 *
 * This subpath exists because of one measured fact: `@visx/xychart` publishes a
 * single barrel entry, so ANY import from it — `XYChart`, but equally
 * `DataContext` or `buildChartTheme` — costs ~83 kB minified / ~29 kB gzipped
 * before tree-shaking has anything left to remove. Everything re-exported here
 * bundles to ~6 kB minified in total, so a consumer can put the chart tokens, a
 * legend, a data-table fallback or the downsamplers in an eagerly-loaded chunk
 * and still keep visx entirely behind a dynamic `import()` of
 * `@archon-research/charting/xychart` (or `/primitives`).
 *
 * Everything here is also re-exported from the root barrel; this subpath is
 * about which chunk the code lands in, not about which names exist.
 */

// Token-driven theme contract (see DESIGN.md). `axis*Style` are exported so a
// hand-composed chart can style an axis unit label / custom SVG text with the
// same tokens the themed axes use. The `<XYChart>` theme built from these
// tokens (`chartTheme`, `buildChartTheme`) lives in the `/xychart` subpath,
// because building it needs visx.
export {
  axisLabelStyle,
  axisTickLabelStyle,
  chartTokens,
  seriesColor,
} from './theme.js';

// Typed chart color tokens: the default way to name a color in this package.
// Props declared BY THIS PACKAGE take `ChartColor`, so `'chart.series.primary'`
// is compile-checked while a raw string stays available as the escape hatch.
// The raw visx re-exports (LineSeries, AreaSeries, Axis*, ...) forward visx's
// own props and do NOT resolve token names — theme them via `buildChartTheme`
// or pass `resolveChartColor(token)` explicitly.
export {
  chartColorToken,
  chartColorTokens,
  resolveChartColor,
} from './chart-color.js';
export type { ChartColor, ChartColorToken } from './chart-color.js';

// Provided legend (static, or interactive toggle/hover), plus the small
// themed swatch SVG it renders per item, standalone for a hand-composed
// legend or interactive-legend binding.
export { ChartLegend, Swatch } from './legend.js';
export type {
  ChartLegendItem,
  ChartLegendProps,
  SwatchProps,
} from './legend.js';

// Accessible table mirror of chart series (screen-reader / "show data").
export { ChartDataTable } from './chart-data-table.js';
export type { ChartDataTableProps } from './chart-data-table.js';

// The stateless themed crosshair line `ChartCursorLayer` draws internally
// (positioned via props, no chart context), plus its pure snapping helper —
// for a hand-composed chart that only needs the line itself.
export { Crosshair, nearestStop } from './crosshair.js';
export type { CrosshairProps } from './crosshair.js';

// Responsive sizing: measure a container, derive width/height + axis margins.
export {
  ResponsiveChart,
  useChartDimensions,
  useContainerWidth,
  deriveLeftMargin,
  FALLBACK_CHART_WIDTH,
} from './responsive.js';
export type {
  ResponsiveChartProps,
  ChartDimensions,
  UseChartDimensionsOptions,
  DeriveLeftMarginOptions,
} from './responsive.js';

// Series downsampling / pixel conflation for large series. Pure data
// transforms, so they run wherever the data is prepared — including off the
// render path entirely.
export {
  DOWNSAMPLE_THRESHOLD,
  downsample,
  lttb,
  minMaxPerPixel,
} from './downsample.js';
export type { DownsampleOptions, DownsampleStrategy } from './downsample.js';
