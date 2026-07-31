# Charting DESIGN

Design contract for `@archon-research/charting`. The visx-backed, token-driven
rework described here has landed: the package exports the theme and a curated
visx surface, and the earlier hand-rolled SVG primitives have been removed. A
few items below are still marked Planned.

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

For more than three ordinal series the design system also provides
`--colors-chart-series-quaternary` and `-quinary` (`positive`/`critical` stay
*semantic*, not ordinal slots 4–5). `chartTokens` can be extended onto them
without a new contract.

#### Enforcement across the package boundary

These variables are the only coupling between this package and the design
system: charting reads them at runtime and never imports design-system code, so
every read carries a hex fallback. That fallback means a mismatch fails
*silently and in the safe-looking direction* — as it did for the whole `0.7.0`
era, when `chart.*` did not exist upstream yet and every chart quietly ran on its
fallback. Two guards now make the contract explicit rather than by-convention:

- **Optional peer dependency.** `@archon-research/design-system` is declared as an
  *optional* `peerDependency` (spec `*`, following the monorepo's unversioned
  internal-dependency convention): charting still renders on its fallbacks without
  it, but the dependency graph now records who owns these variables. The
  `chart.*` tokens were introduced in design-system `0.8.0`; that is the effective
  version floor for themed (non-fallback) charts.
- **Detection.** `uikit-cli doctor` scans a consumer's generated CSS and flags any
  `--colors-chart-*` read that resolves to nothing, turning a silent fallback into
  a CI failure. Run it after `panda codegen`.

The package exposes:

- `chartTokens`: the role-to-`var(...)`-string map above (single source).
- `chartTheme`: `buildChartTheme(chartTokens)` from `@visx/xychart`, for `XYChart`
  consumers. `colors` is the ordered series array; `gridColor` and the axis/tick
  line styles and `svgLabel*` fills are wired from the same tokens.

`XYChart` consumes `chartTheme`; any future primitive-based components (for
example the planned `Sparkline`) read `chartTokens` directly. Both derive from
the one token contract, so they render consistently.

This package owns chart concerns only. Card chrome (a paneled container with a
heading, actions, and footer) is generic and not chart-specific; compose it from
the design-system panel and heading recipes (`panelSection`, `sectionHeading`,
`panelAction`), not from here.

## Package surface

Current (exported from the package root):

- `chartTokens`, `chartTheme`: the theme contract above.
- A curated set of visx re-exports: `XYChart`, `Axis`, `Grid`, `Tooltip`,
  `LineSeries`, `AreaSeries`, `BarSeries`, `BarGroup`, `BarStack`, `GlyphSeries`,
  and `buildChartTheme`, so consumers depend on this package, not `@visx/*`.

Planned:

- `Sparkline`: an axis-less mini line built on low-level primitives
  (`@visx/shape` `LinePath` + `@visx/scale`), not `XYChart`, so a metrics rail
  does not pull the full `XYChart` bundle.
- Move the curated re-exports to subpaths (for example
  `@archon-research/charting/shape`, `/scale`, `/axis`, `/xychart`) covering the
  supported set: `scale, shape, axis, grid, group, curve, tooltip, responsive,
  text, legend, glyph, gradient, xychart`. Niche packages (`geo, network,
  hierarchy, wordcloud, brush, zoom`) stay out; a consumer that needs one adds it
  directly. Subpaths (not one flat barrel) avoid name collisions across visx
  packages and keep the type-checker fast. Set `"sideEffects": false` and ship
  ESM so unused re-exports tree-shake.

## Usage patterns

Standard cartesian charts (line, bar, area, scatter) use `XYChart` with the theme:

```tsx
import { XYChart, LineSeries, Axis, Grid, Tooltip, chartTheme } from '@archon-research/charting';

<XYChart theme={chartTheme} xScale={{ type: 'band' }} yScale={{ type: 'linear' }}>
  <Grid columns={false} />
  <Axis orientation="bottom" />
  <Axis orientation="left" />
  <LineSeries dataKey="value" data={data} xAccessor={d => d.label} yAccessor={d => d.value} />
  <Tooltip renderTooltip={/* token-styled */} />
</XYChart>
```

Wrap charts in card chrome from the design-system panel/heading recipes when
needed. Bespoke charts use the curated re-exports plus `chartTokens` directly.

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
  a real use case appears.

## Related

- Recovered implementation plan and design research live in the `[drop]` docs
  under `docs/implementation-roadmap-with-tools.md` and
  `docs/design-language-research.md` (kept out of the merge, retained for intent).
- Iconography: charts render data via this package; raw inline SVG is for data
  geometry only, not a substitute for the charting package, and not for icons
  (use `lucide-react`).
