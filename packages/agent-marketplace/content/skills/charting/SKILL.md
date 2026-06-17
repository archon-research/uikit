---
name: charting
description: WHEN building or reviewing data visualization in this repository; use the visx-backed, token-themed @archon-research/charting package instead of hand-rolled SVG.
---

# Charting Guidance For UIKit

Use this skill when adding or reviewing charts, graphs, sparklines, or any data
visualization in this monorepo. The authoritative contract is
`packages/charting/DESIGN.md`; read it before implementing.

## Core rules

- Render charts through `@archon-research/charting`. Do not hand-roll SVG charts
  or reimplement scale, axis, or domain math. The package wraps
  [visx](https://github.com/airbnb/visx): UIKit owns the visual language, visx
  owns the rendering mechanics.
- Consumers depend on `@archon-research/charting`, never on `@visx/*` directly.
  The package re-exports the supported visx surface from its root today
  (`XYChart`, `Axis`, `Grid`, `Tooltip`, `LineSeries`, `AreaSeries`, `BarSeries`,
  `BarGroup`, `BarStack`, `GlyphSeries`, `buildChartTheme`); a subpath layout is
  planned (see DESIGN.md).
- Theme every chart with the package `chartTheme` (for `XYChart`); use
  `chartTokens` or `seriesColor` for custom marks and legends. All derive from the
  semantic chart tokens.

## Theming

- Chart colors come only from the chart tokens: `--colors-chart-series-primary`,
  `-secondary`, `-tertiary`, `-positive`, `-critical`, plus
  `--colors-chart-area-primary`, `--colors-chart-axis`, `--colors-chart-grid`.
  Never hardcode hex or pick non-token colors.
- These tokens are passed to visx as `var(...)` strings. That resolves in SVG
  attributes across Chromium, Firefox, and WebKit and tracks the light and dark
  `_dark` token switch automatically. Do not add a `getComputedStyle` resolver or
  rebuild the theme on theme change.

## Component choices

- Cartesian charts (line, bar, area, scatter): use `XYChart` with `theme={chartTheme}`
  plus `Axis`, `Grid`, the relevant `*Series`, and `Tooltip`.
- Compact trends (metric rails, summary cards): a lightweight `Sparkline` built on
  low-level visx primitives is planned (see DESIGN.md); until it ships, build a
  minimal `@visx/shape` line rather than pulling all of `XYChart` for a mini line.
- Chrome (title, subtitle, actions, footer): compose from the design-system panel and heading recipes (`panelSection`, `sectionHeading`, `panelAction`). The charting package does not own card chrome.

## States and accessibility

- Empty data renders nothing; never emit NaN coordinates. Compose loading and
  error states with the design-system `AsyncStateRenderer`, `LoadingIndicator`,
  `EmptyState`, and `ErrorState` around the chart.
- Give each chart root `role="img"` and a descriptive `aria-label`. For dense
  charts, add a visually-hidden data-table fallback.

## Review flags

- Bespoke SVG chart math, hardcoded chart colors, a direct `@visx/*` dependency in
  a consumer, or a theme rebuilt at runtime are all violations of this contract.
