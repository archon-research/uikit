// Token-driven theme contract (see DESIGN.md).
export { chartTheme, chartTokens, seriesColor } from './theme.js';

// Curated visx surface, so consumers depend on this package, not @visx/* directly.
export {
  XYChart,
  Axis,
  Grid,
  Tooltip,
  LineSeries,
  AreaSeries,
  BarSeries,
  BarGroup,
  BarStack,
  GlyphSeries,
  buildChartTheme,
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

// Provided legend.
export { ChartLegend } from './legend.js';
export type { ChartLegendItem, ChartLegendProps } from './legend.js';

// Cross-chart interaction layer (synced cursor + shared time range + cross-filter).
export {
  DashboardInteractionProvider,
  SyncedChartGroup,
  DragSelectionOverlay,
  useDashboardFilter,
  useDashboardInteraction,
  useHighlightedKey,
  useHoveredTimestamp,
  useInteractionValue,
  useSelectedTimeRange,
  useSyncedCursorHandlers,
  useTimeRangeBrushGesture,
} from './interaction.js';
export type {
  DashboardInteractionApi,
  DashboardInteractionState,
  InteractionKey,
  PixelRange,
  TimeRange,
} from './interaction.js';

// Series downsampling / pixel conflation for large series.
export {
  DOWNSAMPLE_THRESHOLD,
  downsample,
  lttb,
  minMaxPerPixel,
} from './downsample.js';
export type { DownsampleOptions, DownsampleStrategy } from './downsample.js';
