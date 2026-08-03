# @archon-research/dashboard-kit

A generic, declarative dashboard engine. You describe a dashboard as data — a
`DashboardSpec` manifest — and the engine renders it: a recursive layout tree of
resizable splits and widgets, a flat widget registry, typed data bindings, and
declared cross-widget interaction. It ships only the ENGINE and a small set of
GENERIC adapters over `@archon-research/design-system` and
`@archon-research/charting`; every domain-specific widget, data source, and
component binding is the consumer's to register.

## Install

```jsonc
// peerDependencies
"@archon-research/dashboard-kit": "*",
"@archon-research/design-system": "*",
"@archon-research/charting": "*",
"react": "^19",
"react-dom": "^19"
```

## Quick start

```tsx
import {
  DashboardRenderer,
  type DashboardSpec,
  type DashboardDataSources,
} from '@archon-research/dashboard-kit';

const spec: DashboardSpec = {
  version: 1,
  title: 'Overview',
  layout: {
    type: 'split',
    direction: 'column',
    children: [
      { type: 'widget', ref: 'kpis' },
      {
        type: 'split',
        direction: 'row',
        children: [
          { type: 'widget', ref: 'trend', size: 2 },
          { type: 'widget', ref: 'table', size: 1 },
        ],
      },
    ],
  },
  widgets: {
    kpis: {
      id: 'kpis',
      component: 'statRow',
      title: 'Key metrics',
      dataBinding: { source: 'metrics', fields: { label: 'name', value: 'value' } },
      interaction: { reads: ['highlightedKey'] },
    },
    trend: {
      id: 'trend',
      component: 'lineChart',
      title: 'Trend',
      dataBinding: { source: 'series', fields: {} },
      props: { xField: 'x', series: [{ key: 'A', field: 'a' }] },
    },
    table: {
      id: 'table',
      component: 'table',
      title: 'Rows',
      dataBinding: { source: 'metrics', fields: { rowKey: 'name' } },
      props: {
        columns: [
          { accessorKey: 'name', header: 'Name' },
          { accessorKey: 'value', header: 'Value', render: 'number' },
        ],
      },
      interaction: { writes: ['highlightedKey'] },
    },
  },
};

const dataSources: DashboardDataSources = {
  metrics: [
    { name: 'Alpha', value: 42 },
    { name: 'Beta', value: 17 },
  ],
  series: [
    { x: 'Mon', a: 3 },
    { x: 'Tue', a: 5 },
  ],
};

export function Example() {
  return <DashboardRenderer spec={spec} dataSources={dataSources} />;
}
```

Clicking a `table` row writes `highlightedKey`; the `statRow` reads it and
emphasizes the matching tile — cross-highlighting driven entirely by the
manifest's declared `interaction`.

## The manifest

- `layout` — a recursive tree of `split` (row/column, optionally `resizable`)
  and `widget` (a `ref` into `widgets`) nodes. Positioning only; independent of
  what each leaf renders.
- `widgets` — a flat, id-keyed map of widget nodes: `{ component, props,
  dataBinding, interaction, thresholds }`.
- `dataBinding` — `{ source, fields }`: a data-source id plus a channel→field
  mapping (Vega-Lite style, not a query string).
- `interaction` — `reads` / `writes` shared-selection keys, plus `agentWritable`
  (default-deny agent exposure; see below).

## Extending the registry

Register your own component keys → adapters and merge them over the defaults:

```tsx
import { DashboardRenderer, mergeRegistries, type RegistryComponent } from '@archon-research/dashboard-kit';

const Gauge: RegistryComponent = ({ widget, data }) => /* ... */;
const registry = mergeRegistries({ gauge: Gauge });

<DashboardRenderer spec={spec} dataSources={ds} registry={registry} />;
```

The default registry provides `note`, `stat`, `statRow`, `table`, `lineChart`,
and `areaChart`.

## Validation

`validateDashboardSpec(candidate, { knownComponents })` runs a zod structural
pass plus referential passes (unknown refs, orphaned widgets, resizable
column-split without a height, an `agentWritable` key that isn't writable,
optional unknown-component check). It never throws — an agent-submitted patch is
untrusted input, so it returns `{ ok, issues }` and the renderer shows an
annotated rejection rather than blanking. `DashboardRenderer` runs it by default;
pass `skipValidation` for a spec you author and trust.

## Interaction

By default the renderer uses a self-contained local interaction store, enough
for a standalone dashboard. To cross-filter a synced chart group, back
interaction with charting's real per-key store via `useChartingInteraction`
(see `DESIGN.md`).

See `DESIGN.md` for the full contract and design rationale.
