# dashboard-kit — design contract

`@archon-research/dashboard-kit` is the generic declarative-dashboard engine,
graduated from an app prototype. This document is the authoritative contract for
what the engine owns and what it deliberately leaves to consumers.

## Scope: engine only

The package ships:

1. The **`DashboardSpec` schema** (`schema.ts`) — a layout tree of `split` /
   `widget` nodes, a flat `widgets` registry, `dataBinding`, `interaction`
   (`reads` / `writes` / `agentWritable`), and `thresholds`.
2. The **recursive renderer** (`renderer.tsx`) — walks the layout, resolves each
   leaf through the widget map and then the component registry.
3. The **string → component registry mechanism** (`registry.tsx`) — an
   extensible map plus a small default set of GENERIC adapters.
4. **zod structural + referential validation** (`validate.ts`).
5. The **interaction surface** (`interaction.ts`) and the **charting adapter**
   (`charting-interaction.tsx`).

It deliberately does **not** ship any domain manifest, domain widget bindings,
mock/log data sources, or a command bar. Those belong to the consuming app.

## Separation of concerns

Three concerns stay separable rather than conflated (the failure mode of
Grafana's flat `gridPos` + query blobs, or Superset's three disconnected
configs):

- **Layout** is pure composition (Vega-Lite `hconcat`/`vconcat` style),
  independent of leaf content.
- **Widgets** are a flat, id-keyed registry resolved through a `component` key.
- **Data binding** is a typed `{ source, fields }` channel→field mapping, not an
  opaque query string. The engine is agnostic to what backs a `source`; a host
  supplies a `DashboardDataSources` table (mock fixture, live tail, query
  result).

Cross-widget **interaction** is declared on the widget node (`reads` / `writes`)
rather than buried in component code, so cross-filtering is an auditable
property of the manifest.

## Layout & resizable splits — `SplitLayout`

A `split` node renders one of two ways:

- **Non-resizable (default):** a flex box. `row` splits wrap at narrow widths
  (each child floors at a readable min-width), so a responsive dashboard never
  forces horizontal overflow.
- **Resizable (`resizable: true`):** the design-system **`SplitLayout`**
  primitive (an Ark `Splitter`) — one drag-resizable panel per child, a handle
  between each pair. The engine renders `SplitLayout` rather than a bespoke Ark
  Splitter skin, so the resize handles, tokens, and a11y come from the shared
  primitive. Child `size` weights become the panels' initial `size`.

A resizable `column` split needs an explicit `height` (a vertical splitter has
no content-driven size to divide) — validation enforces this. A resizable `row`
split may omit it (it divides width); the engine applies a default height so the
splitter track is visible.

## Registry mechanism

`ComponentRegistry` is `Record<string, RegistryComponent>`. Each adapter
receives `{ widget, data, interaction }` and owns translating the widget's
`dataBinding.fields` mapping + `props` into a real component's props — keeping
the manifest declarative (field names, not JSX).

`DEFAULT_REGISTRY` provides generic adapters only: `note`, `stat`, `statRow`,
`table` (design-system `DataTable` with declarative columns), `lineChart`,
`areaChart` (charting `XYChart` + `LineSeries`/`AreaSeries`, themed with
`chartTheme`). Consumers add domain adapters with `mergeRegistries(...)` or
supply their own registry entirely. An unresolved `ref` or `component` renders
an inline `UnknownWidget` marker, never a thrown error.

Charts are built exclusively on `@archon-research/charting` (never hand-rolled
SVG or a direct `@visx/*` dependency), per the charting contract.

## Validation

Two layers:

1. **Structural** (`dashboardSpecSchema`) — shape, enums, required fields,
   recursive layout via `z.lazy`.
2. **Referential** (`validateDashboardSpec`) — every layout `ref` resolves to a
   widget; every widget is placed by the layout (no orphans); each widget's `id`
   matches its map key; a resizable `column` split carries a `height`; every
   `agentWritable` key is actually in `writes`; and — when `knownComponents` is
   supplied — every `component` is registered.

The schema intentionally does NOT validate `component` against a registry: the
schema is the data contract, a registry is one resolution of it. Callers who
want the check pass `knownComponents: Object.keys(registry)`. Validation never
throws; it returns `{ ok, issues }`.

## `agentWritable` — default-deny agent exposure

`WidgetInteraction.agentWritable` lists which of a widget's interaction keys an
agent (a drive tool, a command bar) may write. It is **default-deny**: a key a
human can drive through the UI is not agent-writable unless listed. This is the
manifest's half of the contract — a host's agent-facing tools call
`collectAgentWritableKeys(spec)` (the union across all widgets) and refuse
anything outside it. Validation flags an `agentWritable` key that isn't in the
widget's `writes` (a policy that would silently do nothing).

## Interaction

The engine's interaction surface is a small, transport-agnostic
`InteractionContextValue = { read, write, subscribe? }` addressed by the
free-form string keys a manifest names. Widgets read one key at a time through
`useInteractionField(interaction, key)` (built on `useSyncExternalStore`), so
only the widgets bound to a changed key re-render.

Two backings:

- **`useLocalInteraction`** — a self-contained React-state store; the renderer's
  default, enough for a standalone dashboard.
- **`useChartingInteraction`** — adapts a manifest's vocabulary onto charting's
  REAL per-key store (`DashboardInteractionProvider` / `useDashboardInteraction`
  / `useInteractionValue`), so a declarative dashboard cross-filters the same
  synced chart group a hand-built one would. It returns `{ interaction,
  InteractionSync }`; render `<InteractionSync />` once inside a
  `SyncedChartGroup` and hand `interaction` to the renderer.

### Manifest keys vs charting keys

A manifest names keys in an FDC3-shaped vocabulary (`highlightedAsset`,
`selectedTimeRange`) while charting's store is typed to `highlightedKey` /
`timeRange` / `hoveredTimestamp`. `DEFAULT_INTERACTION_KEY_MAP` is the single,
declared place that translation happens (`highlightedAsset → highlightedKey`,
`selectedTimeRange → timeRange`, native keys map to themselves); pass a custom
`InteractionKeyMap` to extend it. `InteractionSync` is the SOLE consumer of
charting's high-frequency context, republishing the mapped keys into a per-key
store — so a widget reading `highlightedAsset` re-renders on a highlight change
and never on a hover tick.

## Sources

Graduated from the prototype snapshot `4ef50f5:app/src/declarative/*`
(`schema.ts`, `renderer.tsx`, `registry.tsx`, `validate.ts`, `interaction.ts`,
`bridge.tsx`), generalized to drop app-specific manifests, widgets, data
sources, and the command bar; rewired onto the upstream design-system
`SplitLayout` and charting per-key interaction store that now ship in this repo.
