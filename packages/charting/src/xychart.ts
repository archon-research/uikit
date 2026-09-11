/**
 * `@archon-research/charting/xychart` — the `<XYChart>` surface: the curated
 * visx re-exports, the theme built for them, and every mark in this package
 * that reads visx's `DataContext`.
 *
 * This is the heavy subpath, and the one worth putting behind a dynamic
 * `import()`. `@visx/xychart` ships a single barrel entry with no smaller
 * public entry point, so importing any one symbol from it — `DataContext` as
 * much as `XYChart` — pulls ~83 kB minified / ~29 kB gzipped; the curated
 * surface below measures ~148 kB minified. Every module re-exported here
 * already pays that floor, which is exactly why they share one subpath: there
 * is no cheaper slice to carve out of them.
 *
 * Everything here is also re-exported from the root barrel.
 */

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
  // wrapper in `xychart-theme.js` (exported below) takes its place. It is a
  // superset: raw-string configs behave identically, token names additionally
  // work.
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

// The token-resolving `buildChartTheme` wrapper and the ready-made theme for
// `<XYChart theme={chartTheme}>`. Lives here, not in `/core`, because building
// a visx theme means importing visx; the tokens it is built FROM are in
// `/core`.
export { buildChartTheme, chartTheme } from './xychart-theme.js';
export type { ChartTheme, ChartThemeConfig } from './xychart-theme.js';

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

// End-of-line series labels with collision-avoidance stacking.
export { DirectLabels, resolveLabelPositions } from './direct-labels.js';
export type { DirectLabelsProps, DirectLabelItem } from './direct-labels.js';

// Snap-to-datum crosshair + per-series readout + positioned tooltip. The
// stateless `Crosshair` line it draws internally and the pure `nearestStop`
// helper are in `/core` instead: they need no chart context, so they cost
// nothing to import next to a hand-composed chart. Each name lives in exactly
// one subpath; the root barrel is their union.
export { ChartCursorLayer } from './cursor-layer.js';
export type {
  ChartCursorLayerProps,
  CursorSeries,
  CursorPoint,
  CursorTooltipContext,
} from './cursor-layer.js';

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

// Cross-chart emphasis: dim the series a legend is not hovering, drop the ones
// it has toggled off, applied as attribute/style writes on already-mounted mark
// nodes rather than as a re-render of every chart in the group. Lives in this
// subpath because it reads the interaction store, which reads visx.
export { EmphasisLayer, EmphasisSeries } from './emphasis.js';
export type { EmphasisLayerProps, EmphasisSeriesProps } from './emphasis.js';

// `ChartLegend` pre-bound to the group store (hover -> highlight, click ->
// hide, both reflected back). The plain `ChartLegend` in `/core` stays the
// unwired one, for a legend that is not about series.
export { SyncedChartLegend } from './synced-legend.js';
export type {
  SyncedChartLegendItem,
  SyncedChartLegendProps,
} from './synced-legend.js';

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
  useInteractionStore,
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
  InteractionStore,
  PixelRange,
  TimeRange,
} from './interaction.js';
