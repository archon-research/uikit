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

- `chartTokens`: the role-to-`var(...)`-string map above (single source), plus
  `breachFill`/`bandFill` alpha tints for reference bands (see below).
- `chartTheme`: `buildChartTheme(chartTokens)` from `@visx/xychart`, for `XYChart`
  consumers. `colors` is the ordered series array; `gridColor` and the axis/tick
  line styles and `svgLabel*` fills are wired from the same tokens.
- `seriesColor`: the same series tokens, keyed by role (`primary`, `secondary`,
  `tertiary`, `positive`, `critical`), for custom marks and legends that need a
  single color rather than the full `chartTheme`.

`XYChart` consumes `chartTheme`; primitive-based components (`ReferenceBand`,
`CandlestickSeries`, `TimeRangeBrush`, `ChartLegend`, and the planned
`Sparkline`) read `chartTokens`/`seriesColor` directly. All derive from the one
token contract, so they render consistently.

This package owns chart concerns only. Card chrome (a paneled container with a
heading, actions, and footer) is generic and not chart-specific; compose it from
the design-system panel and heading recipes (`panelSection`, `sectionHeading`,
`panelAction`), not from here.

## Package surface

Current (exported from the package root):

- `chartTokens`, `chartTheme`, `seriesColor`: the theme contract above.
- A curated set of visx re-exports: `XYChart`, `Axis`, `Grid`, `Tooltip`,
  `LineSeries`, `AreaSeries`, `BarSeries`, `BarGroup`, `BarStack`, `GlyphSeries`,
  `buildChartTheme`, plus the `Animated*` variants (`AnimatedAxis`,
  `AnimatedGrid`, `AnimatedLineSeries`, `AnimatedAreaSeries`,
  `AnimatedAreaStack`, `AnimatedBarSeries`, `AnimatedBarGroup`,
  `AnimatedBarStack`, `AnimatedGlyphSeries`), `DataContext`, and
  `EventEmitterProvider`, so consumers depend on this package, not `@visx/*`.
  `DataContext` is the escape hatch for building custom marks that need the
  chart's live `xScale`/`yScale` — see `CandlestickSeries` and `ReferenceBand`
  below for the pattern. `EventEmitterProvider` is the shared event bus that
  backs the cross-chart interaction layer below.
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
- **`ChartLegend`** (`legend.tsx`): a provided, token-themed legend. Replaces
  hand-rolled per-story legend markup.
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
- Move the curated re-exports to subpaths (for example
  `@archon-research/charting/shape`, `/scale`, `/axis`, `/xychart`) covering the
  supported set: `scale, shape, axis, grid, group, curve, tooltip, responsive,
  text, legend, glyph, gradient, xychart`. Subpaths (not one flat barrel) avoid
  name collisions across visx packages and keep the type-checker fast. Set
  `"sideEffects": false` and ship ESM so unused re-exports tree-shake.

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
  holding `timeRange`, `hoveredTimestamp`, a free-form `filters` bag, and
  `highlightedKey`, with narrow selector hooks:
  `useSelectedTimeRange`/`useHoveredTimestamp`/`useHighlightedKey`/
  `useDashboardFilter`, plus the per-key `useInteractionValue` below) plus one
  shared visx `EventEmitterProvider`. Because
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
  inverting a scale.
- **`useInteractionValue(key)`** — a per-key subscription so a widget bound
  to one field (e.g. `highlightedKey`) is not re-rendered by unrelated,
  hover-frequency updates (e.g. `hoveredTimestamp`). See the dedicated
  section below.
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
  underlying values are reachable by assistive tech.
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
- The subpath-exports restructuring already `Planned` above (this pass kept
  everything on the flat root barrel to match the existing package shape).

## Related

- Recovered implementation plan and design research live in the `[drop]` docs
  under `docs/implementation-roadmap-with-tools.md` and
  `docs/design-language-research.md` (kept out of the merge, retained for intent).
- Iconography: charts render data via this package; raw inline SVG is for data
  geometry only, not a substitute for the charting package, and not for icons
  (use `lucide-react`).
