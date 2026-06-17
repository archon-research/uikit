# @archon-research/charting

Token-aware charts for UIKit consumer applications, built as a thin layer over
[visx](https://github.com/airbnb/visx). UIKit owns the visual language (design
tokens); visx owns the rendering mechanics. See [DESIGN.md](./DESIGN.md) for the
full contract.

## Exports

- `chartTheme` — a visx `XYChartTheme` (from `buildChartTheme`) wired to the
  design-system chart tokens. Pass it to `<XYChart theme={chartTheme}>`.
- `chartTokens` — the underlying CSS-variable token strings (series palette,
  area, axis, grid, surface, label).
- `seriesColor` — named series colors (`primary`, `secondary`, `tertiary`,
  `positive`, `critical`) for legends and custom marks.
- A curated visx surface so consumers depend on this package, not `@visx/*`
  directly: `XYChart`, `Axis`, `Grid`, `Tooltip`, `LineSeries`, `AreaSeries`,
  `BarSeries`, `BarGroup`, `BarStack`, `GlyphSeries`, and `buildChartTheme`.

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
