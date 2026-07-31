# @archon-research/charting

Token-aware charts for UIKit consumer applications, built as a thin layer over
[visx](https://github.com/airbnb/visx). UIKit owns the visual language (design
tokens); visx owns the rendering mechanics. See [DESIGN.md](./DESIGN.md) for the
full contract.

## Exports

- `chartTheme` — a visx `XYChartTheme` (from `buildChartTheme`) wired to the
  design-system chart tokens. Pass it to `<XYChart theme={chartTheme}>`.
- `chartTokens` — the underlying CSS-variable token strings (series palette,
  area, axis, grid, surface, label, plus `breachFill`/`bandFill` alpha tints
  for reference bands).
- `seriesColor` — named series colors (`primary`, `secondary`, `tertiary`,
  `positive`, `critical`) for legends and custom marks.
- A curated visx surface so consumers depend on this package, not `@visx/*`
  directly: `XYChart`, `Axis`, `Grid`, `Tooltip`, `LineSeries`, `AreaSeries`,
  `BarSeries`, `BarGroup`, `BarStack`, `GlyphSeries`, `buildChartTheme`, the
  `Animated*` series/axis/grid variants, `DataContext` (for custom marks), and
  `EventEmitterProvider` (for the cross-chart interaction layer below).
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
- `ChartLegend` — a provided, token-themed legend.
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
- Card chrome (titles, actions, footers) is not part of this package; compose it
  from the design-system panel and heading recipes.
- For iconography elsewhere in the UI, use `lucide-react`.
