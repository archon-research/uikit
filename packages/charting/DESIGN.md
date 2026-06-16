# Charting DESIGN

Design contract for `@archon-research/charting`. This describes the target
architecture. Some of it is not yet implemented; the current `src/*` vanilla
SVG primitives are slated to be replaced per this contract.

## Intent

A thin, token-rich layer over [visx](https://github.com/airbnb/visx). UIKit owns
the visual language (colors, axes, grid, typography, states); visx owns the
rendering mechanics (scales, shapes, axes, tooltips, responsiveness). We do not
hand-roll SVG scaling/axis math. The package is also the dependency boundary:
consumers depend on `@archon-research/charting`, not on `@visx/*` directly.

## Theming: token-driven, no runtime resolution

Charts are themed by feeding the chart tokens straight into visx as CSS variable
strings. This was validated in Chromium, Firefox, and WebKit: `var(...)` resolves
in SVG presentation attributes (`fill`, `stroke`), which is how visx applies
series and axis colors, and it reacts to the active theme with no rebuild. So the
theme is a static object of `var(...)` strings and stays correct across the
design-system light and dark `_dark` token switch automatically.

There is no `getComputedStyle` resolution hook and no rebuild-on-theme-change.

### Token contract

Source of truth is `packages/design-system/panda.shared.ts` (semantic chart
tokens, each with a `_dark` variant):

| Role | Token CSS variable |
| --- | --- |
| Series 1..5 | `--colors-chart-series-primary`, `-secondary`, `-tertiary`, `-positive`, `-critical` |
| Area fill | `--colors-chart-area-primary` |
| Axis line / labels | `--colors-chart-axis` |
| Gridlines | `--colors-chart-grid` |
| Text / tooltip text | `--colors-text-*` (e.g. `--colors-text-muted`) |
| Surface / tooltip background | `--colors-surface-default` |

The package exposes:

- `chartTokens`: the role-to-`var(...)`-string map above (single source).
- `chartTheme`: `buildChartTheme(chartTokens)` from `@visx/xychart`, for `XYChart`
  consumers. `colors` is the ordered series array; `gridColor` and the axis/tick
  line styles and `svgLabel*` fills are wired from the same tokens.

Both `XYChart` (via `chartTheme`) and our own primitive-based components (via
`chartTokens`) derive from one contract, so they render identically.

## Package surface

- `chartTokens`, `chartTheme`: the theme contract above.
- `ChartContainer`: presentational chrome (title, subtitle, actions, footer). Not
  a visx component; owned by us.
- `Sparkline`: an axis-less mini line built on low-level primitives
  (`@visx/shape` `LinePath` + `@visx/scale`), not `XYChart`, so a metrics rail
  does not pull the full `XYChart` bundle.
- Curated visx re-exports under subpaths (for example
  `@archon-research/charting/shape`, `/scale`, `/axis`, `/xychart`), covering the
  supported set: `scale, shape, axis, grid, group, curve, tooltip, responsive,
  text, legend, glyph, gradient, xychart`. Niche packages (`geo, network,
  hierarchy, wordcloud, brush, zoom`) are not re-exported; a consumer that needs
  one adds it directly.

Re-exports use subpaths (not one flat barrel) to avoid name collisions across
visx packages and to keep the type-checker fast. The package sets
`"sideEffects": false` and ships ESM so unused re-exports tree-shake.

## Usage patterns

Standard cartesian charts (line, bar, area, scatter) use `XYChart` with the theme:

```tsx
import { XYChart, AnimatedLineSeries, Axis, Grid, Tooltip } from '@archon-research/charting/xychart';
import { chartTheme } from '@archon-research/charting';

<ChartContainer title="Weekly Trend">
  <XYChart theme={chartTheme} xScale={{ type: 'band' }} yScale={{ type: 'linear' }}>
    <Grid columns={false} />
    <Axis orientation="bottom" />
    <Axis orientation="left" />
    <AnimatedLineSeries dataKey="value" data={data} xAccessor={d => d.label} yAccessor={d => d.value} />
    <Tooltip renderTooltip={/* token-styled */} />
  </XYChart>
</ChartContainer>
```

Compact trends use `Sparkline`. Bespoke charts use the subpath re-exports plus
`chartTokens` directly.

## States

- Empty series: render nothing (or an empty affordance from the host); never emit
  NaN coordinates. Domain/scale logic comes from visx, not hand-rolled math.
- Loading and error: do not invent chart-local states. Compose with the
  design-system `AsyncStateRenderer`, `LoadingIndicator`, `EmptyState`, and
  `ErrorState` around the chart.

## Accessibility

- Each chart root carries `role="img"` and a descriptive `aria-label`.
- For data-dense charts, provide a visually-hidden data-table fallback so the
  underlying values are reachable by assistive tech.
- Decorative icons stay `aria-hidden`; chart SVGs are not decorative.

## Out of scope (for now)

- Threshold and range bands (`@visx/annotation`) and gauges. Document and add when
  a real STL use case appears.

## Related

- Recovered implementation plan and design research live in the `[drop]` docs
  under `docs/implementation-roadmap-with-tools.md` and
  `docs/design-language-research.md` (kept out of the merge, retained for intent).
- Iconography: charts render data via this package; raw inline SVG is for data
  geometry only, not a substitute for the charting package, and not for icons
  (use `lucide-react`).
