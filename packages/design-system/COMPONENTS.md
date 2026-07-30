# Components

> Generated from `src/component-manifest.ts` by `npm run docs:components`. Do not edit by hand.

The package exports **42** components. Some are owned here; others wrap Ark UI or TanStack Table so you depend on this package instead of those directly. `Styled by` = who owns the visuals (`design-system-preset` = a Panda recipe you can override; `consumer` = unstyled, you style it).

## Design-system components

Owned by this package — styled via Panda recipes/tokens.

| Component | Styled by | Recipe | Story |
| --- | --- | --- | --- |
| `Button` | design-system-preset | `button` | atoms |
| `TreeRow` | design-system | — | atoms |
| `LoadingIndicator` | design-system | — | atoms |
| `Badge` | design-system-preset | `badge` | atoms |
| `Indicator` | design-system-preset | `indicator` | atoms |
| `Select` | design-system-preset | `select` | molecules |
| `StyledSelect` | design-system-preset | `select` | molecules |
| `RangePicker` | design-system | — | molecules |
| `SurfaceMessage` | design-system-preset | `surfaceMessage` | molecules |
| `ThemeToggle` | design-system-preset | `themeToggle` | molecules |
| `SkeletonRows` | design-system | — | molecules |
| `SkeletonStack` | design-system | — | molecules |
| `AsyncStateRenderer` | consumer | — | organisms |
| `EmptyState` | design-system-preset | `emptyState` | organisms |
| `ErrorBoundary` | consumer | — | organisms |
| `ErrorState` | design-system | — | organisms |
| `Sparkline` | design-system | — | atoms |
| `Panel` | design-system-preset | `panel` | molecules |
| `StatTile` | design-system-preset | `statTile` | molecules |
| `StatRow` | design-system-preset | `statRow` | molecules |
| `Code` | design-system-preset | `code` | atoms |
| `CodeBlock` | design-system-preset | `code` | atoms |
| `PageShell` | design-system-preset | `pageShell` | templates |
| `SidebarGrid` | design-system-preset | `sidebarGrid` | templates |

## Ark UI wrappers & re-exports

Behaviour comes from [Ark UI](https://ark-ui.com). Some are skinned by this package (`styleOwner: design-system-preset`); the rest are re-exported unstyled (`styleOwner: consumer`) so you style them yourself.

| Component | Styled by | Recipe | Story |
| --- | --- | --- | --- |
| `Switch` | design-system-preset | `toggleSwitch` | atoms |
| `SearchInput` | design-system-preset | `searchInput` | molecules |
| `SidebarLayout` | design-system-preset | `sidebarLayout` | templates |
| `Tabs` | consumer | — | — |
| `Toggle` | consumer | — | — |
| `ToggleGroup` | consumer | — | — |
| `Tooltip` | consumer | — | — |
| `Dialog` | consumer | — | — |
| `Avatar` | consumer | — | — |
| `Menu` | consumer | — | — |
| `Slider` | consumer | — | — |
| `TreeView` | consumer | — | — |
| `TextInput` | design-system-preset | `input` | atoms |
| `Textarea` | design-system-preset | `input` | atoms |
| `Drawer` | design-system-preset | `drawer` | organisms |
| `Field` | consumer | — | — |
| `Progress` | consumer | — | — |

## TanStack Table

Behaviour comes from [@tanstack/react-table](https://tanstack.com/table); this package provides the styled `DataTable` shell.

| Component | Styled by | Recipe | Story |
| --- | --- | --- | --- |
| `DataTable` | design-system-preset | `dataTable` | organisms |

## Charts

Data visualisation lives in the separate [`@archon-research/charting`](../charting/README.md) package — a token-themed, curated [visx](https://airbnb.io/visx) surface (`XYChart`, `Axis`, `LineSeries`, …). See its README for the full export list.
