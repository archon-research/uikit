// Token-driven theme contract (see DESIGN.md). `axis*Style` are exported so a
// hand-composed chart can style an axis unit label / custom SVG text with the
// same tokens the themed axes use.
export {
  axisLabelStyle,
  axisTickLabelStyle,
  buildChartTheme,
  chartTheme,
  chartTokens,
  seriesColor,
} from './theme.js';
export type { ChartThemeConfig } from './theme.js';

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

// Curated visx surface, so consumers depend on this package, not @visx/* directly.
export {
  XYChart,
  Axis,
  Grid,
  // visx `Tooltip`'s `showVerticalCrosshair` renders the crosshair in a
  // body-level portal, so it can detach from the plot on scroll; prefer
  // `ChartCursorLayer` for an in-SVG crosshair that stays aligned with the plot.
  Tooltip,
  LineSeries,
  AreaSeries,
  BarSeries,
  BarGroup,
  BarStack,
  GlyphSeries,
  // NOTE: `buildChartTheme` is NOT re-exported from here — the token-resolving
  // wrapper in `theme.js` (exported above) takes its place. It is a superset:
  // raw-string configs behave identically, token names additionally work.
  // Animated variants (spring-driven transitions between data changes).
  AnimatedAxis,
  AnimatedGrid,
  AnimatedLineSeries,
  AnimatedAreaSeries,
  AnimatedAreaStack,
  AnimatedBarSeries,
  AnimatedBarGroup,
  AnimatedBarStack,
  AnimatedGlyphSeries,
  // Context and event bus: the escape hatch for building custom marks that
  // need the chart's live xScale/yScale (see `candlestick.tsx` /
  // `reference-band.tsx`), and for cross-chart coordination (see
  // `interaction.tsx`).
  DataContext,
  EventEmitterProvider,
} from '@visx/xychart';

// Curve factories (re-exported from @visx/curve so consumers don't import
// @visx/* directly), for the `curve` prop on Line/Area series.
export {
  curveLinear,
  curveMonotoneX,
  curveNatural,
  curveStep,
  curveStepAfter,
  curveStepBefore,
  curveBasis,
} from '@visx/curve';

// Low-level visx composition primitives, re-exported so a chart that steps off
// the single-plot `XYChart` happy path (faceted small-multiples, a custom
// stacked area, a sorted distribution) can be composed without adding `@visx/*`
// as a direct app dependency. Pair these with the token-themed axes below so a
// hand-composed chart still renders on-theme. (These are already `charting`
// dependencies; this just surfaces them.)
export { Group } from '@visx/group';
export { Area, AreaStack, Bar, Line, LinePath } from '@visx/shape';
export { scaleBand, scaleLinear, scaleTime } from '@visx/scale';

// Token-themed standalone axes (wrap `@visx/axis`, applying the same tokens as
// `chartTheme`), for composed charts that render their own axes outside XYChart.
export { AxisBottom, AxisLeft, AxisRight, AxisTop } from './axis.js';
export type {
  ThemedAxisBottomProps,
  ThemedAxisLeftProps,
  ThemedAxisRightProps,
  ThemedAxisTopProps,
} from './axis.js';

// Time-range brush + zoom/pan.
export { TimeRangeBrush } from './brush.js';
export type {
  TimeRangeBrushProps,
  TimeRangeBrushDatum,
  TimeRangeBrushDomain,
} from './brush.js';
export { ZoomPanOverlay } from './zoom.js';
export type { ZoomPanOverlayProps, ZoomDomain } from './zoom.js';

// Reference lines / threshold + confidence bands.
export { ReferenceBand } from './reference-band.js';
export type {
  ReferenceBandProps,
  ThresholdBandProps,
  ConfidenceBandProps,
} from './reference-band.js';

// Candlestick / OHLC mark.
export { CandlestickSeries } from './candlestick.js';
export type { CandlestickSeriesProps } from './candlestick.js';

// Provided legend (static, or interactive toggle/hover).
export { ChartLegend } from './legend.js';
export type { ChartLegendItem, ChartLegendProps } from './legend.js';

// Reader layer: accessible + interactive read affordances over a chart.
// Accessible table mirror of chart series (screen-reader / "show data").
export { ChartDataTable } from './chart-data-table.js';
export type { ChartDataTableProps } from './chart-data-table.js';
// End-of-line series labels with collision-avoidance stacking.
export { DirectLabels, resolveLabelPositions } from './direct-labels.js';
export type { DirectLabelsProps, DirectLabelItem } from './direct-labels.js';
// Snap-to-datum crosshair + per-series readout + positioned tooltip.
export { ChartCursorLayer, nearestStop } from './cursor-layer.js';
export type {
  ChartCursorLayerProps,
  CursorSeries,
  CursorPoint,
  CursorTooltipContext,
} from './cursor-layer.js';

// Cross-chart interaction layer (synced cursor + shared time range + cross-filter).
export {
  DashboardInteractionProvider,
  SyncedChartGroup,
  DragSelectionOverlay,
  useDashboardFilter,
  useDashboardInteraction,
  useHiddenKeys,
  useHighlightedKey,
  useHoveredTimestamp,
  useInteractionDispatch,
  useInteractionSetters,
  useInteractionValue,
  useSelectedTimeRange,
  useSetHiddenKeys,
  useSetHighlightedKey,
  useSetHoveredTimestamp,
  useSyncedCursor,
  useSyncedCursorHandlers,
  useToggleHiddenKey,
  useTimeRangeBrushGesture,
} from './interaction.js';
export type {
  DashboardInteractionApi,
  DashboardInteractionState,
  InteractionDispatch,
  InteractionKey,
  PixelRange,
  TimeRange,
} from './interaction.js';

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

// Histogram + distribution marks (frequency bars, ordinal distribution with a
// highlighted head) plus the pure binning/sorting helpers.
export {
  DEFAULT_BIN_COUNT,
  DistributionSeries,
  HistogramSeries,
  histogramBins,
  sortDistribution,
} from './histogram.js';
export type {
  DistributionSeriesProps,
  HistogramBin,
  HistogramBinsOptions,
  HistogramSeriesProps,
} from './histogram.js';

// Series downsampling / pixel conflation for large series.
export {
  DOWNSAMPLE_THRESHOLD,
  downsample,
  lttb,
  minMaxPerPixel,
} from './downsample.js';
export type { DownsampleOptions, DownsampleStrategy } from './downsample.js';
