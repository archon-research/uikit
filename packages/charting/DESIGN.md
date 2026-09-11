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

Source of truth is `packages/design-system/src/tokens/chartColorTokens.ts`. That
module is the one place the `chart.*` and `identity.*` semantic token families
are defined (each with a `_dark` variant); both the published preset
(`src/panda-preset.ts`) and the internal config (`panda.shared.ts`) spread it, so
they cannot disagree about which tokens exist.

| Role | Token path | Token CSS variable |
| --- | --- | --- |
| Series, ordinal | `chart.series.primary`, `.secondary`, `.tertiary`, `.quaternary`, `.quinary` | `--colors-chart-series-primary`, … |
| Series, semantic | `chart.series.positive`, `.critical` | `--colors-chart-series-positive`, `-critical` |
| Area fill | `chart.area.primary` | `--colors-chart-area-primary` |
| Axis line / labels | `chart.axis` | `--colors-chart-axis` |
| Gridlines | `chart.grid` | `--colors-chart-grid` |
| Per-entity identity | `identity.1` … `identity.8` | `--colors-identity-1` … `-8` |
| Text / tooltip text | — | `--colors-text-*` (e.g. `--colors-text-muted`) |
| Surface / tooltip background | — | `--colors-surface-default` |

`positive`/`critical` are *semantic* members of the ramp, not ordinal slots 4–5;
`quaternary`/`quinary` are the ordinal continuation past `tertiary`.
`chartTokens.series` — the array visx indexes for its default per-`dataKey`
colors — deliberately stays at the five original roles, because appending to it
would re-color existing charts with six or more series. To use the extra hues,
name them per series or pass an explicit `colors` array to `buildChartTheme`.

The `identity.*` family is a *per-entity* palette (an entity keeps one color
across a bar, a line, and a legend whatever role it plays), distinct from the
`chart.series.*` role ramp. `useIdentityPalette` in the design system hashes an
id to one of those slots.

### Naming a color: `ChartColor`

Every color-accepting prop this package declares takes `ChartColor`:

```ts
type ChartColor = ChartColorToken | (string & {});
```

**The token form is the default.** Pass the token path as a string literal:

```tsx
<ChartLegend items={[{ label: 'Account', color: 'chart.series.primary' }]} />
<CandlestickSeries upColor="chart.series.positive" downColor="chart.series.critical" />
<ReferenceBand mode="threshold" value={92} stroke="chart.series.critical" />
```

`ChartColorToken` is the union of the token paths in the table above. Be precise
about what that buys, because the `(string & {})` arm is *also* part of the prop
type: **a misspelled token path still compiles.** `color="chart.series.primry"`
is a legal `ChartColor`, since it is a legal string; the compile error only lands
where `ChartColorToken` itself is the annotation (`chartColorToken(name)`, or a
`const x: ChartColorToken`). So the contract is two layers, neither of which is a
type error on a prop:

1. **Authoring:** the union drives editor autocompletion, so the token names are
   discoverable and the correct spelling is one keystroke away. In practice this
   is what prevents most typos, not a compile error.
2. **Dev-time runtime:** `resolveChartColor` warns (see below) for a `chart.*` /
   `identity.*` path that is not a token, and for a raw
   `var(--colors-chart-*)` / `var(--colors-identity-*)` string naming a custom
   property that does not exist.

Both failure modes are otherwise silent and in the safe-looking direction: a
typo'd path reaches the SVG attribute verbatim as an invalid color, and a typo'd
custom property makes the browser drop the declaration — either way the mark
renders with the SVG default. Nothing else catches them. Panda's token validation
and `uikit-cli doctor` inspect *generated CSS*, and these strings never pass
through Panda at all; they go straight into an SVG presentation attribute.

**Raw strings remain the escape hatch.** Any other string still works, for
one-off colors and for values computed at runtime:

```tsx
// A runtime-chosen color: `useIdentityPalette` returns raw var() strings.
const palette = useIdentityPalette(instrumentIds);
<ChartLegend items={ids.map((id) => ({ label: id, color: palette[id]! }))} />

// A hex, a color-mix, an SVG gradient reference.
<HistogramSeries values={values} color="#0f766e" />
<DistributionSeries data={data} color="url(#bar-gradient)" />
```

The `string & {}` intersection (rather than a bare `string`) is what keeps the
literal union's editor autocomplete alive — a bare `string` in the union would
absorb the literals and suggest nothing.

Both forms resolve through one function, `resolveChartColor`, called at the
boundary where a prop meets an SVG attribute. A token name becomes its
`var(...)` string; anything else passes through untouched. Because
`resolveChartColor('chart.series.primary')` and `seriesColor.primary` are the
*same string*, converting a chart from one form to the other is a pixel-identical
change — the `ReaderLayer` story is written in token names against an unchanged
snapshot to demonstrate exactly that.

Outside a prop, `chartColorToken(name)` returns the same string for use in a
`style` object, a design-system `css()` call, or an SVG gradient stop.

`buildChartTheme` is this package's wrapper over visx's, resolving `colors`,
`gridColor`, `gridColorDark`, `backgroundColor`, and the `fill`/`stroke` of the
label and axis-line style blocks. Raw-string configs behave exactly as they did
against visx's function directly — including partial style blocks. visx merges
each block by spreading it over its own defaults, so the wrapper writes a
`fill`/`stroke` key back only when the caller's block carried one:
`xAxisLineStyles: { strokeWidth: 3 }` keeps visx's default stroke, and
`svgLabelBig: { fontSize: 14 }` keeps the themed fill, rather than being blanked
by a key set to `undefined`.

The `AxisBottom`/`AxisTop`/`AxisLeft`/`AxisRight` wrappers are the documented
exception: their props are visx's own, forwarded wholesale as an escape hatch, so
their `stroke`/`tickStroke`/`labelProps.fill` keep taking raw strings. Themed
axes get their tokens from `chartTheme` and need no color prop at all.

#### Why the union is duplicated, and what keeps it honest

`ChartColorToken` derives from the keys of `chartColorTokens` in
`src/chart-color.ts` — a charting-local table, not an import from the design
system. Two things forced that:

1. **`definePreset` erases the token names.** It is typed
   `(preset: Preset) => Preset`, so the preset object's literal keys are gone
   from its type; no union can be derived from the preset as authored. The
   design system now defines the families in a plain object literal
   (`src/tokens/chartColorTokens.ts`) precisely so a `ChartColorTokenPath` union
   *can* be walked out of the tree, and exports both that type and the paths as
   runtime data.
2. **The design system is an *optional* peer here.** A type-only import would
   put an unresolvable module reference in this package's published `.d.ts`.
   Under the `skipLibCheck` that nearly every consumer runs, that does not fail
   — it silently widens the union to `any`, reintroducing the exact class of
   quiet failure this type exists to remove. Charting also needs its own copy
   regardless, because it must emit `var(...)` strings *with hex fallbacks* when
   the design system is absent, and the upstream data carries no fallbacks.

`src/chart-color.sync.test.ts` closes the loop: it imports
`chartColorTokenPaths` from the design system's source by relative path (a
test-only import, excluded from `tsconfig.build.json`, so nothing reaches the
published output) and asserts the two lists are identical, in the same order, and
that each entry reads its own custom property. A token added, removed, or renamed
upstream fails that test instead of leaving `ChartColorToken` describing a
contract that no longer exists.

#### Dev-time guard for misspelled colors

The `(string & {})` arm means neither form of typo is a compile error on a prop,
so the resolver is the backstop. Outside production builds, `resolveChartColor`
warns — **once per offending value** — in two cases.

A token PATH in an owned namespace that is not a token (the likeliest typo, since
it is what autocompletion was reaching for):

```
[charting] "chart.series.primry" is not a known chart color token. It reached an
SVG attribute verbatim, which is not a valid color, so the mark will render
unstyled. Check the path against ChartColorToken — the `(string & {})` arm of
`ChartColor` means a misspelled token path still compiles.
```

A raw `var(--colors-chart-*)` / `var(--colors-identity-*)` string whose property
name is not a known token:

```
[charting] "--colors-chart-series-primry" is not a known chart color token, so
this declaration will be dropped and the mark will render unstyled. Pass a token
name instead of a raw var() string (e.g. color="chart.series.primary") to have
this checked at compile time.
```

Two deliberate limits:

- **Scoped to the `chart` and `identity` namespaces.** Charting cannot know the
  design system's full color namespace, so a `var(--colors-surface-default)` or
  `var(--colors-text-muted)` is a legitimate value and is never second-guessed.
  Within those two namespaces this package *does* know every valid name, so
  anything else there is a typo — and since no CSS color syntax starts with
  `chart.` or `identity.`, the path check has no false positives to trade off.
- **Zero production cost.** The check is gated on
  `process.env.NODE_ENV !== 'production'`, computed once at module scope (the
  same pattern as `IS_DEV_WARNING_ENABLED` in the design system's
  `hooks/devWarning.ts`). Bundlers replace that expression statically, so a
  production build collapses the guard to `false` and dead-code-eliminates the
  warning path.

#### Enforcement across the package boundary

These variables are the only coupling between this package and the design
system: charting reads them at runtime and never imports design-system code, so
every read carries a hex fallback. That fallback means a mismatch fails
*silently and in the safe-looking direction* — as it did for the whole `0.7.0`
era, when `chart.*` did not exist upstream yet and every chart quietly ran on its
fallback. Two guards make the contract explicit rather than by-convention — and
the third entry below is the check it is easy to assume exists, and does not:

- **Optional peer dependency.** `@archon-research/design-system` is declared as an
  *optional* `peerDependency` (spec `*`, following the monorepo's unversioned
  internal-dependency convention): charting still renders on its fallbacks without
  it, but the dependency graph now records who owns these variables. The
  `chart.*` tokens were introduced in design-system `0.8.0`; that is the effective
  version floor for themed (non-fallback) charts.
- **Detection.** There is none, and that is worth stating plainly rather than
  implying otherwise. `uikit-cli doctor` checks a consumer's generated CSS for
  three things — missing `staticCss`, a semantic token that emitted as a bare
  dotted path, and a roleless `colorPalette` — and not one of them is "a
  `--colors-chart-*` read that resolves to nothing." Nor could one be, as
  written: charting's `var()` strings never enter Panda's pipeline, so they are
  absent from the generated CSS doctor reads. The dev-time guard above does not
  cover this either — it catches a *misspelled* token, not a correctly spelled
  one the consumer's design system never emitted. A doctor check that resolved
  chart custom properties against the consumer's emitted `:root` would close the
  gap; it does not exist today.
- **Name parity.** `src/chart-color.sync.test.ts` pins this package's token list
  against the design system's, so the two cannot drift silently (see above).

The package exposes:

- `chartColorTokens`: the token-path-to-`var(...)`-string table — the single
  place the token names and their hex fallbacks are defined. `ChartColorToken`
  derives from its keys.
- `ChartColor` / `chartColorToken` / `resolveChartColor`: the typed color
  contract described above.
- `chartTokens`: the role-keyed map of the values this package's own components
  reach for. Aliases `chartColorTokens` for the chart families, and additionally
  carries `surface`/`label` (outside the chart namespace) and the
  `breachFill`/`bandFill` alpha tints for reference bands (see below).
- `chartTheme`: the ready-built theme for `XYChart` consumers. `colors` is the
  ordered series array; `gridColor`, the axis/tick line styles, and the
  `svgLabel*` fills are wired from the same tokens.
- `buildChartTheme`: the token-resolving wrapper over visx's, for a chart that
  needs a custom palette or grid color.
- `seriesColor`: the series tokens keyed by short role name (`primary`,
  `secondary`, `tertiary`, `positive`, `critical`, `quaternary`, `quinary`), for
  custom marks and visx props that need a single raw color string rather than the
  full `chartTheme`.

`XYChart` consumes `chartTheme`; primitive-based components (`ReferenceBand`,
`CandlestickSeries`, `TimeRangeBrush`, `ChartLegend`, the themed standalone
axes, `ChartCursorLayer`, `SyncedTooltip`, `HistogramSeries`/
`DistributionSeries`, and the planned `Sparkline`) read
`chartTokens`/`seriesColor` directly. All derive from the one
token contract, so they render consistently.

This package owns chart concerns only. Card chrome (a paneled container with a
heading, actions, and footer) is generic and not chart-specific; compose it from
the design-system panel and heading recipes (`panelSection`, `sectionHeading`,
`panelAction`), not from here.

## Package surface

Current (exported from the package root):

- `chartColorTokens`, `ChartColor`, `ChartColorToken`, `chartColorToken`,
  `resolveChartColor`: the typed color contract above.
- `chartTokens`, `chartTheme`, `buildChartTheme`, `seriesColor`: the theme
  contract above. `buildChartTheme` is this package's resolving wrapper, NOT the
  bare `@visx/xychart` export — it is a superset, so raw-string configs are
  unaffected. `axisLabelStyle`/`axisTickLabelStyle` expose the same axis tokens
  as plain style objects, so a hand-composed chart can style an axis unit label
  or a custom SVG text node without re-declaring `var(--colors-*)`.
- A curated set of visx re-exports: `XYChart`, `Axis`, `Grid`, `Tooltip`,
  `LineSeries`, `AreaSeries`, `BarSeries`, `BarGroup`, `BarStack`, `GlyphSeries`,
  plus the `Animated*` variants (`AnimatedAxis`,
  `AnimatedGrid`, `AnimatedLineSeries`, `AnimatedAreaSeries`,
  `AnimatedAreaStack`, `AnimatedBarSeries`, `AnimatedBarGroup`,
  `AnimatedBarStack`, `AnimatedGlyphSeries`), `DataContext`, and
  `EventEmitterProvider`, so consumers depend on this package, not `@visx/*`.
  `DataContext` is the escape hatch for building custom marks that need the
  chart's live `xScale`/`yScale` — see `CandlestickSeries` and `ReferenceBand`
  below for the pattern. `EventEmitterProvider` is the shared event bus that
  backs the cross-chart interaction layer below.
- The rest of the curated visx surface, on the same rule: the `curve*` factories
  (`curveLinear`, `curveMonotoneX`, `curveNatural`, `curveStep`,
  `curveStepAfter`, `curveStepBefore`, `curveBasis`) for a series' `curve` prop,
  and the low-level composition primitives a chart that steps off the
  single-plot `XYChart` happy path needs — `Group`, `Area`, `AreaStack`, `Bar`,
  `Line`, `LinePath`, `scaleBand`, `scaleLinear`, `scaleTime`. All are already
  dependencies of this package; surfacing them is what lets a faceted
  small-multiple or a hand-composed stack be built without adding `@visx/*` as a
  direct app dependency. Pair them with the themed axes below so a composed
  chart still renders on-theme.
- **`AxisBottom` / `AxisTop` / `AxisLeft` / `AxisRight`** (`axis.tsx`):
  token-themed wrappers over the *standalone* `@visx/axis` components. The
  in-chart `<Axis>` reads its styling from the theme context; the standalone
  axes a hand-composed chart needs do not, and default to unthemed black. These
  apply the same tokens `chartTheme` uses, and forward every visx prop, so
  `stroke`/`tickLabelProps` stay overridable per call.
- **`ResponsiveChart`** (`responsive.tsx`): `XYChart` needs a pixel width, and a
  chart in a fluid grid cell has none until it is measured. `ResponsiveChart`
  measures its container and hands `{ width, height }` to a render-prop child;
  `useChartDimensions` derives the height from an aspect ratio with a floor
  (four oscillating lines squeezed into 110px is the failure it prevents), and
  `useContainerWidth` is the width-only primitive for a chart that computes its
  own height. `deriveLeftMargin` sizes the value-axis gutter from the tick
  strings that will actually be drawn — a constant margin is a guess about how
  long the numbers get, and a fixed 56px that fits `$108.6k` clips `$500.0M`.
  `FALLBACK_CHART_WIDTH` is the pre-measurement / no-`ResizeObserver` width each
  consumer was otherwise redeclaring.
- **`TimeRangeBrush`** (`brush.tsx`): a compact mini-area-chart with a
  draggable selection (`@visx/brush`), reporting the selected numeric domain
  window. Pair it with a main chart over the same numeric x-domain (epoch ms
  or index).
- **`ZoomPanOverlay`** (`zoom.tsx`): a transparent scroll-to-zoom /
  drag-to-pan overlay (`@visx/zoom`). `XYChart`'s scales are declarative, so
  this does not transform the chart's SVG directly — it computes a new
  visible domain window from the zoom transform and hands it to
  `onDomainChange`; the consumer re-renders `<XYChart>` with that window.
- **`ReferenceBand`** (`reference-band.tsx`): one primitive, two
  configurations — `mode="threshold"` (a dashed line via `@visx/annotation`
  `LineSubject` plus a one-sided breach fill, for a limit or target line) and
  `mode="band"` (a shaded symmetric/asymmetric confidence band with an
  optional center line, for a confidence interval around an estimate). Must
  be rendered as a child of `<XYChart>`.
- **`CandlestickSeries`** (`candlestick.tsx`): an OHLC mark built on
  `@visx/shape` (`Bar` for the body, `Line` for the wick), since `XYChart` has
  no OHLC series type. Registers synthetic high/low entries into the chart's
  data registry so the y-scale auto-extends to the candle extremes.
- **`HistogramSeries` / `DistributionSeries`** (`histogram.tsx`): frequency and
  distribution marks, since `XYChart` has neither. `HistogramSeries` draws one
  rect per bin from either precomputed `bins` or raw `values` (a discriminated
  union, so supplying neither is a type error rather than a silently empty
  chart); `DistributionSeries` draws one thin ordinal bar per datum with the
  first `highlightCount` in a highlight color — the shape a plain `BarSeries`
  cannot express once the bar count runs into the hundreds and only the leading
  few matter. Both position rects within whatever scales the chart provides, so
  the consumer sets the matching domains. The binning and sorting are exported
  as pure functions (`histogramBins`, `sortDistribution`, `DEFAULT_BIN_COUNT`).
- **`ChartLegend`** (`legend.tsx`): a provided, token-themed legend. Replaces
  hand-rolled per-story legend markup. `interactive` turns each item into a
  focusable toggle button with `onToggle`/`onHover`; the default stays a static
  `role="list"` with the markup it had before that option existed. Those are
  plain callbacks rather than a `bindToGroup` flag, so binding to the shared
  store (`useToggleHiddenKey`, `useSetHighlightedKey`) stays at the call site
  and one component is not responsible for both rendering and store wiring.
  `Swatch` — the small themed swatch SVG it renders per item — is exported
  standalone so a hand-composed legend reuses the same markup instead of
  re-deriving it.
- **`EmphasisLayer` / `EmphasisSeries`** (`emphasis.tsx`): cross-chart
  dim-and-hide, applied as CSS on already-mounted nodes rather than as a
  re-render. `EmphasisSeries id="…"` wraps a mark in one stable
  `<g data-series>`; the enclosing `EmphasisLayer` subscribes to the group's
  `highlightedKey`/`hiddenKeys` imperatively and writes `data-dim`/`data-hidden`
  plus the matching `opacity`/`display` onto those nodes. See the dedicated
  section below — the CSS-not-render part is the point of the primitive, not an
  optimization detail.
- **`SyncedChartLegend`** (`synced-legend.tsx`): `ChartLegend interactive` with
  the store loop already wired — hover sets `highlightedKey`, click toggles
  `hiddenKeys`, and both are reflected back onto each item. Renders through
  `ChartLegend`, so there is one legend implementation. A legend that is not
  about series stays a plain `ChartLegend`; a single non-series entry inside a
  series legend takes `sync: false`.
- **`ChartCursorLayer`** (`cursor-layer.tsx`): a snap-to-datum crosshair with
  per-series readout dots and a tooltip positioned from a render prop, plus a
  focusable slider whose arrows step between stops and whose Enter/Space commits
  (and optionally pins) the cursor. Prefer it over visx `Tooltip`'s
  `showVerticalCrosshair`, which renders the crosshair in a body-level portal
  and so can detach from the plot on scroll. `Crosshair` is the stateless themed
  line it draws internally — the crosshair analog of the themed standalone axes
  — exported for a chart that only needs the line at a pixel `x` it already
  resolved (from `useSyncedCursor`, say); `snapToStop` is the pure snapping
  helper (`nearestStop` is its deprecated predecessor, `NaN` for an empty
  `stops` where `snapToStop` is `undefined`, kept only because it shipped).
  Keeps its own cursor state, so it does not touch the interaction layer
  unless the consumer feeds it a `cursor` prop.
- **`SyncedTooltip`** (`synced-tooltip.tsx`): the tooltip readout for a synced
  group, driven by the shared cursor instead of visx's event bus — a card (and,
  by default, a crosshair and per-series readout dots) written onto
  already-mounted nodes rather than re-rendered. Opt-in and additive: the bus
  is still there, so a panel still using visx `Tooltip` is unaffected. See the
  dedicated section below.
- **`DirectLabels`** (`direct-labels.tsx`): end-of-line series labels at the
  plot's right edge, nudged apart so adjacent labels do not collide.
  `resolveLabelPositions` is the pure placement function behind it — ideal `y`s
  in, collision-free `y`s in the same order out — exported for unit testing.
  Inside a `SyncedChartGroup` it drops labels whose `id` is in `hiddenKeys`
  (a hidden series otherwise leaves an orphan label) and re-stacks the rest;
  outside one it behaves exactly as before, so it stays usable standalone. Each
  label carries `data-series`, so nesting it in an `EmphasisLayer` dims labels
  with their marks.
- **`ChartDataTable`** (`chart-data-table.tsx`): an accessible `<table>` mirror
  of a chart's series, visually hidden by default. A chart drawn as inline SVG
  carries no tabular structure for assistive tech; this is the fallback the
  Accessibility section below asks for, and `visuallyHidden={false}` turns the
  same table into a visible "show data" panel. Its styling is inlined rather
  than taken from the design system, for the same reason as `ChartLegend`.
- **Cross-chart interaction layer** (`interaction.tsx`): see the dedicated
  section below.
- **Series downsampling** (`downsample.ts`): `downsample`/`lttb`/
  `minMaxPerPixel`, a pure pre-render data transform for series with more
  points than a chart can usefully draw. See the dedicated section below.

Planned:

- `Sparkline`: an axis-less mini line built on low-level primitives
  (`@visx/shape` `LinePath` + `@visx/scale`), not `XYChart`, so a metrics rail
  does not pull the full `XYChart` bundle. (Note: a `Sparkline` already exists
  in `@archon-research/design-system` as a hand-rolled inline-SVG micro
  primitive; if one lands here too, reconcile which package owns it before
  both ship.)

### Subpath exports: three tiers, drawn where the cost is

`package.json` declares `"."`, `"./core"`, `"./primitives"` and `"./xychart"`.
The root barrel is the union of the other three and stays the supported default
import; the subpaths exist so a consumer can place a chunk boundary without
writing a wrapper module purely to have something to dynamic-import.

An earlier revision of this file planned one subpath per re-exported visx
package (`/shape`, `/scale`, `/axis`, ...). Measurement argued against it. What
actually governs the cost is a single fact: `@visx/xychart` ships one barrel
entry and publishes nothing below it, so importing ANY symbol from it costs
~83 kB minified / ~29 kB gzipped — `DataContext` and `buildChartTheme` as much
as `XYChart`. That is the only boundary in this package worth a subpath, and it
yields three tiers rather than a dozen:

| Subpath | Boundary | Bundled alone |
| --- | --- | --- |
| `./core` | imports no `@visx/*` at all | ~8 kB min / ~3.5 kB gzip |
| `./primitives` | visx, but never `@visx/xychart` | ~145 kB min / ~47 kB gzip |
| `./xychart` | `<XYChart>` and everything reading its `DataContext` | ~210 kB min / ~74 kB gzip |

Two module splits were needed to make those tiers real, both of which moved code
across the `@visx/xychart` line without changing any export:

- `theme.ts` kept the tokens and gave up `buildChartTheme`/`chartTheme` to
  `xychart-theme.ts`. Every mark in the package styles itself from the tokens,
  so while they lived in the same module as a visx import, a themed legend cost
  88 kB. It now costs 4.4 kB; the themed standalone axes went 94.5 kB to 51.2 kB
  and `TimeRangeBrush` 125.7 kB to 66.7 kB, because none of them ever needed
  `<XYChart>` — they only needed its neighbours' colors.
- `crosshair.tsx` took `Crosshair` and the snapping helpers out of
  `cursor-layer.tsx`. `Crosshair` is documented above as the crosshair analog
  of the themed standalone axes — a mark for hand-composed charts — so
  co-locating it with `ChartCursorLayer`'s `DataContext` import put it on the
  wrong side of the line.

Finer splits were considered and rejected on the same evidence: one subpath per
visx package buys nothing that tree-shaking does not already do inside a tier
(the package is `"sideEffects": false` ESM), and splitting the `DataContext`
marks apart from each other buys nothing at all, since they share one floor.

`src/exports.test.ts` holds the invariants: the three subpaths are disjoint,
their union is exactly the root barrel, no name the root barrel has published
disappears from it, and `./core` reaches no `@visx/*` module while
`./primitives` reaches no `@visx/xychart`.

### Governance: brush and zoom are now first-class dependencies

Prior guidance in this file said niche visx packages (`brush`, `zoom`) should
"stay out; a consumer that needs one adds it directly." That is overridden for
`@visx/brush` and `@visx/zoom` specifically, for two reasons: (1) a
time-range brush and scroll/drag zoom are exactly the "coordinate movement
across stacked panels" problem this package exists to solve
token-consistently, and a per-consumer reimplementation would fragment that
visual language; (2) both need direct, non-trivial integration code
(`TimeRangeBrush`, `ZoomPanOverlay`) that belongs in one reviewed place, not
copy-pasted per dashboard. `@visx/annotation` and `@visx/shape` were already
implicitly acceptable (transitive via `@visx/xychart`) and are now direct
dependencies for the same reason: `ReferenceBand` and `CandlestickSeries` need
their concrete APIs, not just their types. Treat future additions of niche
visx packages the same way: default to "consumer adds it directly," override
only when the integration code itself (not just the import) needs to be
shared and reviewed once.

## Cross-chart interaction layer (cross-filter + synced cursor)

Each `<XYChart>` is otherwise an isolated island: it wraps itself in its own
`DataProvider`/`TooltipProvider`/`EventEmitterProvider` whenever one isn't
already present in context, so a stack of charts has no way to coordinate a
hover or a selection. `src/interaction.tsx` closes that gap with four pieces:

- **`SyncedChartGroup`** — a provider that wraps a stack of charts (and any
  other widget) in one shared `DashboardInteractionProvider` (a React context
  holding `timeRange`, `hoveredTimestamp`, a free-form `filters` bag,
  `highlightedKey`, and its first-class partner `hiddenKeys` — the
  click-to-hide set behind an interactive legend — with narrow selector hooks:
  `useSelectedTimeRange`/`useHoveredTimestamp`/`useHighlightedKey`/
  `useHiddenKeys`/`useDashboardFilter`, plus the per-key `useInteractionValue`
  below) plus one shared visx `EventEmitterProvider`. The write half is carried
  in a separate, identity-stable dispatch context (`useInteractionDispatch`,
  aliased `useInteractionSetters`, and the named `useSetHighlightedKey`/
  `useSetHiddenKeys`/`useToggleHiddenKey`/`useSetHoveredTimestamp`), so a
  component that only writes — a legend firing hover/click, a filter control —
  never subscribes and never re-renders on a cursor tick. Because
  `XYChart` only creates its own `EventEmitterProvider` when one is missing
  from context, every `<XYChart>` nested inside a `SyncedChartGroup`
  automatically shares the same mitt bus — the exact mechanism visx's own
  multi-chart examples use for a synced crosshair.
  - **Invariant:** the shared bus carries raw pixel coordinates
    (`svgPoint`), computed relative to whichever chart's own SVG emitted the
    event. Every `<XYChart>` in a group must therefore render at the same
    `width` and the same left/right `margin`, and share the same x-domain, or
    the synced cursor will land on the wrong pixel in the other panels.
- **`useSyncedCursorHandlers(xAccessor)`** — wires an `<XYChart>`'s top-level
  `onPointerMove`/`onPointerOut` to `hoveredTimestamp`, reading the timestamp
  straight off the nearest datum (via the caller's own accessor) rather than
  inverting a scale. `useSyncedCursor()` is the counterpart for a chart that is
  *not* built on `@visx/xychart` (raw SVG, canvas, WebGL): it reads, publishes,
  and imperatively subscribes to the same shared timestamp without importing
  `@visx/*` or hardcoding visx's internal event-source string.
- **`useInteractionValue(key)`** — a per-key subscription so a widget bound
  to one field (e.g. `highlightedKey`) is not re-rendered by unrelated,
  hover-frequency updates (e.g. `hoveredTimestamp`). See the dedicated
  section below. **`useInteractionStore()`** is the same store with the render
  removed: `get(key)` reads now, `subscribe(key, cb)` calls back on change, and
  neither re-renders the caller. That is the surface for an effect that mutates
  already-mounted DOM instead of describing it — `EmphasisLayer` below is the
  first user, and the shape any other pointer-frequency painter should copy.
- **`useTimeRangeBrushGesture()` + `<DragSelectionOverlay>`** — a minimal,
  dependency-free drag-to-select gesture: the gesture hook tracks a drag from
  an `<XYChart>`'s own pointer events (`svgPoint` is already local to that
  chart), and `<DragSelectionOverlay>`, rendered as a child of that
  `<XYChart>`, draws the live selection band and inverts the committed pixel
  range through that chart's own `xScale` to publish a domain `timeRange` to
  the group.

`DragSelectionOverlay` is intentionally minimal — a fixed-height drag band
with no resize handles, no zoom, no pan — scoped to "commit one time range on
drag release." It is a lighter-weight alternative to the `@visx/brush`-backed
`TimeRangeBrush` above: reach for `TimeRangeBrush` for a standalone,
draggable-and-resizable mini-chart brush; reach for `useTimeRangeBrushGesture`
+ `<DragSelectionOverlay>` when the selection gesture should live directly on
the main chart's own pointer events inside a `SyncedChartGroup`.

### Governance decision: extend `charting`, not a new package

The interaction layer lives in `packages/charting` rather than a separate
dashboard-coordination package. Rationale:

- It adds **no new dependency** beyond what `brush`/`zoom` already justify
  above. `EventEmitterProvider` and `DataContext` are shipped by
  `@visx/xychart`, the package's original dependency; this only widens the
  curated re-export list, the same pattern already used for
  `XYChart`/`Axis`/`Grid`/etc.
- It stays theme-neutral: `DragSelectionOverlay`'s only visual opinion (the
  selection fill) is a `chartTokens`-derived `var(...)` string, consistent
  with "theme via tokens, never hardcode."
- Every new primitive here is a generic cartesian-chart capability (a synced
  cursor, a cross-filter bag, a drag-select gesture), not intrinsically tied
  to one product surface — the same vocabulary applies to any stacked-panel
  dashboard. A second package would duplicate the theme contract, the
  `DESIGN.md` conventions, and the build/lint/publish plumbing for marginal
  isolation benefit.

### Per-key subscription: `useInteractionValue`

`DashboardInteractionProvider`'s context value changes on every pointer move
(`hoveredTimestamp` updates at pointer-move frequency), so every consumer of
`useDashboardInteraction()` — and the narrow selector hooks above, which all
read from that same context value — re-renders on every hover tick, whether
or not it reads `hoveredTimestamp`. Fine for a handful of charts; not fine
once a dashboard has dozens of interaction-aware widgets (a filter bar, a
blotter, a dozen legend chips) all re-rendering on every hover over any
synced chart.

`useInteractionValue(key)` is the fix: it subscribes to exactly one field of
`DashboardInteractionState` via `useSyncExternalStore`, against a per-key
store the provider maintains outside React state (a ref of the current
values plus a `Map<key, Set<listener>>`, notified by each setter). A widget
bound to `highlightedKey` via `useInteractionValue('highlightedKey')` is not
notified, and does not re-render, when `hoveredTimestamp` changes.

The mechanism that makes this safe rather than merely "usually fine": the
store's `subscribe`/`getSnapshot` pair is carried in a *second*, internal
context whose value never changes identity across the provider's renders
(both close over refs, not state). React's context propagation only
re-renders consumers of a context when that context's own value changes
identity — so a component that calls only `useInteractionValue` and never
touches `useDashboardInteraction()` is invisible to `hoveredTimestamp`
updates at the context level, not just skipped via a `memo` comparison.

`useDashboardInteraction()` and the narrow selector hooks are unchanged and
remain the right choice for a widget that already needs several fields
together (e.g. a brush overlay reading both `timeRange` and `hoveredTimestamp`)
or that mutates state — `useInteractionValue` is read-only. Reach for it
specifically for a leaf widget bound to one field, where hover-frequency
re-renders would otherwise be wasted work.

```tsx
import { useInteractionValue } from '@archon-research/charting';

function LegendChip({ seriesKey }: { seriesKey: string }) {
  const highlightedKey = useInteractionValue('highlightedKey');
  return <Chip active={highlightedKey === seriesKey}>{seriesKey}</Chip>;
}
```

## Cross-chart emphasis: CSS on mounted nodes, not a re-render

`highlightedKey` and `hiddenKeys` are state; nothing in visx reads them.
`LineSeries`/`AreaSeries`/`BarSeries` have no emphasis notion, so "hover a
legend item, dim the others everywhere" was consumer work: a composed
`strokeOpacity`/`fillOpacity` threaded into every mark, a skip-render for
hidden, the same filter repeated into the end-of-line labels.

That works, and it is the wrong shape, for a reason that only shows up at
scale: **it makes emphasis a render.** A legend hover then re-renders every
chart wired to the group. Downstream that meant hundreds of nested SVG groups
reconciled per hover, and under live streaming data the highlight render queued
behind the per-tick renders — a measured **1-2s from hover to dim**.

So `EmphasisLayer` does not re-render anything:

- `EmphasisSeries id="…"` mounts one stable, inert `<g data-series="…">` around
  a mark. No transform, no clip, no pointer handling — `XYChart` renders its
  children as given, so the series inside registers with `DataContext` and emits
  tooltip events exactly as it does unwrapped.
- `EmphasisLayer` reads the store through `useInteractionStore()` —
  `subscribe`/`get` **without** `useSyncExternalStore`, so a change notifies a
  callback instead of scheduling a render — and writes `data-dim`/`data-hidden`
  plus `opacity`/`display` straight onto those existing nodes.

A hover therefore costs one attribute write per changed series plus compositor
work, and that cost does not grow with how much chart is mounted. `React` is not
on the path at all, so a data tick mid-hover has nothing to queue behind.

Both an attribute and an inline style are written, and each earns its place: the
attributes are the styling contract (a consumer stylesheet can key off
`[data-dim]` to desaturate rather than fade), and the inline style is the
default rendering of it, so the primitive works with no CSS file — this package
ships none.

`emphasis.test.tsx` holds this up with a `<Profiler>` commit count and per-mark
render counters across a hover, plus the DOM node identities before and after.
It also carries the **control** those assertions need: the same tree with
emphasis wired the hand-threaded way, where both counters do move. A counter
that cannot move proves nothing.

### The reusable part

The pattern generalises to anything driven at pointer frequency — a tooltip
readout, a canvas overlay: **subscribe to the store imperatively, mutate the
mounted node, never route it through render.** `useInteractionStore()` is that
seam, and is exported for it. `useInteractionValue(key)` remains right for a
widget whose OUTPUT is a function of the value (a chip, a label, the legend
itself); reach for the store when the value drives a change React does not need
to reconcile.

### Logical ids, not `dataKey`s

The id on `EmphasisSeries` is a **logical** series id, and deliberately not the
visx `dataKey` of the mark inside it. The same series is `tvl_usd` in one chart
and `tvl` in another; the wrapper is where the two are reconciled, so neither
the legend nor the store ever learns a chart's local naming, and no lookup table
has to be maintained beside them. Two wrappers may share an id (an upper and a
lower bound that emphasize as one series), and one wrapper may hold several
marks (a line plus its glyphs).

### Stacked marks: caller-side, on purpose

`BarStack`/`AreaStack` read their own children to build the stack, so a wrapper
between them and their series breaks it — and CSS could not have fixed it
anyway. Hiding one band of a stack has to re-run the stack layout so the
remaining bands re-fill to 100%; that is a data change, not a style change, and
no attribute toggle can express it.

**The decision: stacked baselines are caller-side.** Filter the stack's children
or its data by `hiddenKeys` at the call site (`useHiddenKeys()`) and accept the
re-render. That is the honest cost — the layout genuinely has to be recomputed —
and it is a click-frequency event, not a hover-frequency one, so it is not the
cost this primitive exists to remove. Wrapping the stack as a whole in an
`EmphasisLayer` to dim it against neighbouring panels still works.

### Opting out

A legend not backed by series marks — a categorical color key, a status ramp —
must not drive the store, or hovering it highlights an id no mark carries and
every chart in the group dims at once. Such a legend stays a plain
`ChartLegend`, or passes `hover={false}` to `SyncedChartLegend`. A single stray
entry inside an otherwise series-shaped legend (a threshold line, a "shaded =
forecast" note) takes `sync: false` on that item.

`EmphasisLayer` requires a `DashboardInteractionProvider` and throws without
one, like the rest of the interaction layer: a chart whose legend silently does
nothing is worse than a chart that fails to mount. `DirectLabels` is the single
exception — it already shipped and already renders standalone, so it reads the
hidden set only when a provider happens to be there.

## Tooltip readout: off the shared cursor, not the event bus

`SyncedChartGroup` installs one `EventEmitterProvider` above every panel. That
is what makes a visx `<Tooltip>` in one chart respond to a hover in another, and
it is the right default for two or three panels. It stops being free at scale,
because of how the bus distributes: **one pointer move fans out to every
panel's `Tooltip`**, and each one independently runs a nearest-datum lookup over
its own series, updates its own tooltip context, and re-renders its own portal.
Fifteen panels is fifteen tooltip pipelines reacting to a single hover, at
pointer-move frequency.

Be honest about the size of this. In the downstream profile that prompted the
work, the dominant cost was app-side — an accidentally quadratic series
derivation — not the kit. The bus fan-out was a **secondary** contributor. It is
real and worth removing from a fifteen-panel dashboard; it is not the thing that
made one slow.

### The pattern

Route the hover the other way round. The pointer publishes **one number** to the
interaction store, and each panel resolves that number against its own data:

1. **Publish once.** `useSyncedCursorHandlers(xAccessor)` on the `<XYChart>` the
   pointer is over reads the timestamp off the nearest datum and writes it to
   `hoveredTimestamp`. It takes the setter from the stable dispatch, so the
   publishing chart does not re-render either.
2. **Resolve per chart.** Each panel snaps that value to its own sorted stops
   with one binary search (`snapToStop`) and reads its own series at that stop.
   A panel sampled differently from the publisher lands on a real datum of its
   own instead of interpolating, and no panel ever learns another's pixel space.
3. **Render that chart's values.** The crosshair half of this already shipped: a
   controlled `<ChartCursorLayer cursor={hoveredTimestamp} …>` (see the
   `SyncedCrosshair` story). The readout half is the same idea carried through
   to the card.

That much needs no new API — `useSyncedCursor` + a controlled `ChartCursorLayer`
and its tooltip render prop express it today, and a consumer already on those
rails is already off the bus for everything except the tooltip.

### `SyncedTooltip`

`SyncedTooltip` is that pattern packaged, with one thing added: it does not
re-render. A controlled `ChartCursorLayer` still costs each panel a render per
pointer move, because the panel has to read `hoveredTimestamp` through React to
pass it down. `SyncedTooltip` reads the store through `useInteractionStore()`
instead — `get`/`subscribe` **without** `useSyncExternalStore`, the seam
`EmphasisLayer` established for hover-frequency effects — and writes the result
straight onto the card, the dots and the crosshair line it mounted once.

```tsx
function Panel({ data }: { data: Point[] }) {
  const handlers = useSyncedCursorHandlers<Point>((d) => d.t);
  return (
    <XYChart … {...handlers}>
      <LineSeries dataKey="tvl" data={data} … />
      <SyncedTooltip
        stops={STOPS}
        formatX={formatTime}
        series={[
          {
            id: 'tvl',
            label: 'TVL',
            color: 'chart.series.primary',
            valueAt: (t) => byTime.get(t) ?? null,
            format: usd,
          },
        ]}
      />
    </XYChart>
  );
}
```

A panel written this way calls no reactive hook at all: a pointer move costs it
one binary search and a handful of `setAttribute`/`textContent` writes, and zero
commits. `SyncedTooltipSeries` is a superset of `ChartCursorLayer`'s
`CursorSeries`, so the same array feeds both when a chart wants that layer's
pointer/keyboard input as well; pass `marks={false}` to let the cursor layer
keep drawing the line and dots.

Rows for series in `hiddenKeys` are dropped, the way `DirectLabels` drops their
labels — the same imperative read, so hiding a series from the legend does not
re-render the readout either.

`synced-tooltip.test.tsx` holds the claim up the way `emphasis.test.tsx` does:
a `<Profiler>` commit count and per-mark render counters across a pointer sweep,
the DOM node identities before and after, and the **control** those assertions
need — the same readout reading the cursor through React, where both counters
move.

### Additive, on purpose

The bus stays. `SyncedChartGroup` still renders `EventEmitterProvider`, a panel
using visx `<Tooltip>` keeps working unchanged, and the two coexist in one chart
body (`synced-tooltip.render.test.tsx` asserts exactly that). Adopting this is a
swap inside one chart body, made one panel at a time — not a re-architecture,
and not a version consumers have to move to. Making off-the-bus the *default*
would be breaking, and is a major-version choice this does not need.

### Input stays separate

`SyncedTooltip` is output only: it captures no pointer or keyboard events. The
cursor is published by whichever chart the pointer is over
(`useSyncedCursorHandlers`), and keyboard control of the cursor remains
`ChartCursorLayer`'s focusable slider — keep one in the group as the input
surface and let `onCursorChange` publish. As everywhere else in this package,
the accessible mirror of the values is `ChartDataTable`, not the tooltip.

## Series downsampling / pixel conflation

Past a few thousand points, handing a series straight to `LineSeries`/
`AreaSeries` renders more path detail than a screen can show and than a
pointer can hover meaningfully — this is a pure-data-transform problem, not a
rendering one, so it lives here as a plain function rather than a new chart
component. Apply `downsample` to a series' data *before* passing it to a
`*Series` component; every visx behavior (tooltips, synced cursor, reference
bands) keeps working against the returned array exactly as it would against
the original, since it's still just an array of the same datum type.

`src/downsample.ts` exports:

- **`downsample(data, options)`** — the one call most consumers need.
  `options` takes `x`/`y` accessors (same shape as a series' own
  `xAccessor`/`yAccessor`), an optional `strategy` (`'lttb'` default,
  `'minmax'`, or `'none'`), and an optional `threshold` (defaults to
  `DOWNSAMPLE_THRESHOLD`, `1_000`). Returns `data` untouched — same array
  reference, no allocation — when `data.length` is at or under the
  threshold, so short series pay nothing for having gone through the call.
- **`lttb(data, threshold, accessors)`** — Largest-Triangle-Three-Buckets,
  the algorithm `downsample` dispatches to by default. Preserves visual
  *shape* (peaks, troughs, inflections all survive), always keeps the first
  and last point so the domain never shrinks, and returns exactly
  `threshold` points. Right for most time series: a price, a running total, a
  cumulative sum.
- **`minMaxPerPixel(data, columns, accessors)`** — buckets the x-domain into
  `columns` columns and emits each column's min and max y, in x order.
  Preserves *extremes* exactly, which `lttb` does not guarantee — right when
  a spike must never be lost (a rare but critical value), at the cost of a slightly
  "hairier" line than `lttb` would produce for the same point budget.
- **`DOWNSAMPLE_THRESHOLD`** (`1_000`) — the shared default; past this many
  points per series, conflate before rendering.

```tsx
import { AreaSeries, downsample } from '@archon-research/charting';

const plotted = downsample(rawSeries, {
  x: (d) => d.timestamp,
  y: (d) => d.value,
});

<AreaSeries dataKey="value" data={plotted} xAccessor={(d) => d.timestamp} yAccessor={(d) => d.value} />
```

Both algorithms are generic over the datum type `T` via the `x`/`y`
accessors — same shape as visx's own series accessors — so `downsample`
composes directly with whatever a chart's data already looks like; there is
no product-specific datum shape baked in.

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
  underlying values are reachable by assistive tech — `ChartDataTable` is that
  fallback, and is exported for exactly this.
- Decorative icons stay `aria-hidden`; chart SVGs are not decorative.

## Out of scope (for now)

- Gauges.
- Depth/order-book style step-and-fill charts — a distinct mark from
  candlestick/OHLC; not built speculatively.
- Session-shading (alternating background bands across a time axis) — thin
  research evidence for a precise convention; illustrate later rather than
  build now.
- A true independent-domain secondary y-axis. The recommended pattern is two
  stacked panels sharing one x-scale, with a cheap same-scale secondary axis
  (`<Axis orientation="right">` with a `tickFormat` transform) covering the
  common "same range, different units" case. Not implemented as a named
  export this pass — confirmed to work via the existing `Axis` re-export and
  worth reaching for directly before building anything new.

## Follow-ups / not done yet

- `ZoomPanOverlay`'s interaction rect currently sits on top of the wrapped
  `<XYChart>`, which blocks that chart's own `Tooltip` hover while the overlay
  is present. A future pass should either forward pointer events through to
  the chart when not dragging, or expose a "read-only chart, tooltip lives on
  the un-zoomed data" pattern.
- `TimeRangeBrush` and `ZoomPanOverlay` both operate on a bare numeric domain
  (epoch ms or index) rather than a typed `Date`/band domain, so pairing them
  with a `band`-scale `<XYChart>` means the *consumer* is responsible for
  converting the numeric window back into a slice of the original data array.
  A future pass could offer a small `windowToSlice(data, domain, xAccessor)`
  helper in this package to standardize that instead of leaving it to every
  consumer.
- `interaction.tsx`, `cursor-layer.tsx`, `histogram.tsx`, `direct-labels.tsx`
  and `candlestick.tsx` each pay the full `@visx/xychart` floor for a single
  `DataContext` import, which also strands their pure helpers (`histogramBins`,
  `sortDistribution`, `resolveLabelPositions`) behind it. There is no cheaper
  import available — `@visx/xychart`'s `exports` map publishes only `"."`, so
  deep-importing its context module is not an option — but if those helpers are
  ever wanted on a data-prep path, splitting them into visx-free modules the way
  `crosshair.tsx` was split is the move.

## Related

- Recovered implementation plan and design research live in the `[drop]` docs
  under `docs/implementation-roadmap-with-tools.md` and
  `docs/design-language-research.md` (kept out of the merge, retained for intent).
- Iconography: charts render data via this package; raw inline SVG is for data
  geometry only, not a substitute for the charting package, and not for icons
  (use `lucide-react`).
