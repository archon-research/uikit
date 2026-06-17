// Token-driven theme contract (see DESIGN.md).
export { chartTheme, chartTokens } from './theme';

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
} from '@visx/xychart';
