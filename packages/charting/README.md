# @archon-research/charting

Token-aware charts for UIKit consumer applications, built as a thin layer over
[visx](https://github.com/airbnb/visx). UIKit owns the visual language (design
tokens); visx owns the rendering mechanics. See [DESIGN.md](./DESIGN.md) for the
full contract.

## Exports

- `chartTheme` — a visx `XYChartTheme` (from `buildChartTheme`) wired to the
  design-system chart tokens. Pass it to `<XYChart theme={chartTheme}>`.
- `buildChartTheme` — this package's token-resolving wrapper, NOT the bare
  `@visx/xychart` export (which is deliberately not re-exported). A superset:
  raw-string configs behave identically, token names additionally resolve.
- `chartColorTokens`, `chartColorToken`, `resolveChartColor` and the
  `ChartColor` / `ChartColorToken` types — the typed color contract. Props
  declared by this package take `ChartColor`, so `'chart.series.primary'`
  autocompletes while a raw CSS string stays available as the escape hatch.
  The raw visx re-exports forward visx's own props and do NOT resolve token
  names — theme those via `buildChartTheme` or pass `resolveChartColor(token)`.
- `chartTokens` — the underlying CSS-variable token strings (series palette,
  area, axis, grid, surface, label, plus `breachFill`/`bandFill` alpha tints
  for reference bands).
- `seriesColor` — named series colors (`primary`, `secondary`, `tertiary`,
  `positive`, `critical`, plus `quaternary`/`quinary` continuing the ordinal
  ramp past `tertiary`) for legends and custom marks.
- A curated visx surface so consumers depend on this package, not `@visx/*`
  directly: `XYChart`, `Axis`, `Grid`, `Tooltip`, `LineSeries`, `AreaSeries`,
  `BarSeries`, `BarGroup`, `BarStack`, `GlyphSeries`, the `Animated*`
  series/axis/grid variants, `DataContext` (for custom marks),
  `EventEmitterProvider` (for the cross-chart interaction layer below), the
  `curve*` factories, and the low-level composition primitives a chart that
  steps off the `XYChart` happy path needs (`Group`, `Area`, `AreaStack`,
  `Bar`, `Line`, `LinePath`, `scaleBand`, `scaleLinear`, `scaleTime`).
- `AxisBottom` / `AxisLeft` / `AxisRight` / `AxisTop` — token-themed wrappers
  over the standalone `@visx/axis` components, so a hand-composed chart that
  renders its own axes outside `<XYChart>` still matches one. `axisLabelStyle`
  and `axisTickLabelStyle` expose the same tokens for custom SVG text.
- `ResponsiveChart` (plus `useChartDimensions`, `useContainerWidth`,
  `deriveLeftMargin`, `FALLBACK_CHART_WIDTH`) — measures a container and passes
  pixel `width`/`height` to a render-prop child, for a pixel-sized `XYChart` in
  a fluid layout.
- `TimeRangeBrush` — a mini area chart with a draggable selection
  (`@visx/brush`) reporting a selected domain window.
- `ZoomPanOverlay` — a scroll-to-zoom / drag-to-pan overlay (`@visx/zoom`)
  that reports a new visible domain window.
- `ReferenceBand` — one primitive, two configurations: `mode="threshold"`
  (dashed line + one-sided breach fill, e.g. a limit or target line) and
  `mode="band"` (shaded confidence band + optional center line, e.g. a
  confidence interval). Render as a child of `<XYChart>`.
- `CandlestickSeries` — an OHLC mark (`@visx/shape` `Bar` + `Line`). Render as
  a child of `<XYChart>`.
- `HistogramSeries` / `DistributionSeries` — frequency bars for a histogram,
  and one thin ordinal bar per datum with a highlighted head for a large sorted
  population, plus the pure `histogramBins` / `sortDistribution` helpers.
  Render as a child of `<XYChart>`; the consumer sets the matching domains.
- `ChartLegend` — a provided, token-themed legend, plus `Swatch`, the small
  themed swatch SVG it renders per item, standalone for a hand-composed legend.
- `ChartCursorLayer` — a snap-to-datum crosshair with per-series readout dots
  and a positioned tooltip, keyboard-steppable between stops, plus the
  standalone `Crosshair` line it draws and the `nearestStop` helper. Prefer it
  over visx `Tooltip`'s `showVerticalCrosshair`, which renders the crosshair in
  a body-level portal that can detach from the plot on scroll.
- `DirectLabels` — end-of-line series labels with collision-avoidance stacking
  (`resolveLabelPositions` is the pure placement helper behind it).
- `ChartDataTable` — an accessible `<table>` mirror of a chart's series,
  visually hidden by default: a screen-reader / "show data" affordance for a
  chart that carries no tabular structure of its own.
- `downsample` (with the `lttb` and `minMaxPerPixel` strategies and
  `DOWNSAMPLE_THRESHOLD`) — a pure pre-render transform for series with more
  points than a chart can usefully draw.
- Cross-chart interaction layer (cross-filter + synced cursor across a stack
  of charts): `SyncedChartGroup`, `useDashboardInteraction` and its narrow
  selector hooks (`useSelectedTimeRange`, `useHoveredTimestamp`,
  `useHighlightedKey`, `useDashboardFilter`), `useSyncedCursorHandlers`,
  `useTimeRangeBrushGesture`, `DragSelectionOverlay`. See
  [DESIGN.md](./DESIGN.md#cross-chart-interaction-layer-cross-filter--synced-cursor).

See `packages/uikit-preview/src/stories/organisms/charting-primitives.stories.tsx`
for a worked example combining the brush, zoom/pan, reference bands, a
candlestick + volume pair, and a synced-cursor group.

## Usage

```tsx
import {
  XYChart,
  LineSeries,
  Axis,
  Grid,
  Tooltip,
  chartTheme,
} from '@archon-research/charting';

const data = [
  { label: 'Mon', value: 12 },
  { label: 'Tue', value: 18 },
  { label: 'Wed', value: 15 },
];

export function Example() {
  return (
    <XYChart
      theme={chartTheme}
      height={240}
      xScale={{ type: 'band' }}
      yScale={{ type: 'linear', nice: true }}
    >
      <Grid columns={false} />
      <Axis orientation="bottom" />
      <Axis orientation="left" />
      <LineSeries
        dataKey="value"
        data={data}
        xAccessor={(d) => d.label}
        yAccessor={(d) => d.value}
      />
      <Tooltip renderTooltip={/* token-styled */} />
    </XYChart>
  );
}
```

## Notes

- Colors are design-system CSS-variable tokens (for example
  `--colors-chart-series-primary`), so charts track the active light/dark theme
  with no runtime resolution.
- `@archon-research/design-system` is an OPTIONAL peer dependency and is never
  imported here: every token string carries a hex fallback, so charts render
  without it. The link is a hand-mirrored token table in `src/chart-color.ts`,
  guarded by `src/chart-color.sync.test.ts` — a token added, removed or renamed
  in the design system fails that test rather than drifting silently.
- Card chrome (titles, actions, footers) is not part of this package; compose it
  from the design-system panel and heading recipes.
- For iconography elsewhere in the UI, use `lucide-react`.
