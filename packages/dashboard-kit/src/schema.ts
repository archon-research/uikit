/**
 * `@archon-research/dashboard-kit` — the generic, manifest-driven dashboard
 * engine.
 *
 * Three concerns stay SEPARABLE rather than conflated the way Grafana (flat,
 * absolute `gridPos` + string-interpolated query blobs) or Superset (three
 * disconnected config blobs) do:
 *
 *   1. `layout`  — a recursive composition tree (Vega-Lite `hconcat`/
 *      `vconcat` style), independent of what each leaf renders.
 *   2. `widgets` — a flat, id-keyed registry of widget nodes (`{component,
 *      props, dataBinding}`), each resolved through a string -> component
 *      registry key (see `registry.tsx`).
 *   3. `dataBinding` — a typed `{source, fields}` pointer at a data source,
 *      uniform across whatever transport a consuming app resolves `source`
 *      ids against (live tail, replay cursor, a REST poll, ...).
 *
 * The one addition none of Grafana/Superset/Perspective/Vega-Lite model as
 * part of the *widget* node itself is `interaction.reads`/`writes`: the
 * shared-selection keys a widget consumes or produces. Declaring it here
 * makes cross-filtering a declared, auditable property of the manifest
 * instead of implicit wiring buried in component code — see `interaction.ts`
 * for how those keys reach a real interaction store.
 */

export type LayoutDirection = 'row' | 'column';

/** A recursive split node — maps onto the design-system's `SplitLayout` orientation. */
export type SplitLayoutNode = {
  type: 'split';
  direction: LayoutDirection;
  /** Relative share of the parent split's main axis; children need not sum to 1. */
  size?: number;
  /**
   * Render this split as a DRAG-RESIZABLE panel group (design-system's
   * `SplitLayout`, itself an Ark `Splitter`) instead of a plain flex box,
   * with one panel per child and a resize handle between each pair. N-way by
   * construction: three children give two handles.
   *
   * Opt-in rather than the default, because a `SplitLayout` needs hard panel
   * sizes and therefore cannot flex-wrap: the non-resizable path keeps the
   * responsive wrapping some dashboards rely on at narrow widths. A
   * `direction: 'column'` split additionally needs {@link height}, since a
   * vertical splitter has no content-driven size to divide.
   */
  resizable?: boolean;
  /** Required for a resizable `column` split: the CSS height to divide. */
  height?: string;
  children: LayoutNode[];
};

/** A leaf that resolves to one entry in the flat `widgets` registry. */
export type WidgetLayoutNode = {
  type: 'widget';
  /** Key into `DashboardSpec['widgets']`. */
  ref: string;
  /** Relative share of the parent split's main axis. */
  size?: number;
};

export type LayoutNode = SplitLayoutNode | WidgetLayoutNode;

/**
 * What data source feeds a widget, and how its fields map onto the shape the
 * component needs — a typed channel-to-field mapping (Vega-Lite style)
 * rather than an opaque query string. `source` ids are resolved through
 * whatever {@link DashboardDataSources} table the host app supplies;
 * `dashboard-kit` itself is agnostic to what backs a source (a mock array, a
 * live tail, a replay cursor).
 */
export type DataBinding = {
  /** Data-source id, e.g. `"stream:metrics.throughput"`. */
  source: string;
  /** Field name mapping: which field of a source record feeds which slot. */
  fields: Record<string, string>;
};

/**
 * Shared-selection keys a widget consumes (`reads`) or produces (`writes`).
 * Symmetric by design — any widget may read or write any key, no
 * master/detail hardcoding.
 */
export type WidgetInteraction = {
  reads?: string[];
  writes?: string[];
  /**
   * Per-field AGENT EXPOSURE: which of this widget's interaction keys an
   * agent (a drive tool, a command bar) may write. **Default-deny**: a key a
   * human can write through the UI is NOT agent-writable unless it is listed
   * here.
   *
   * This is the manifest's half of the contract; a host app's agent-facing
   * tools consult {@link collectAgentWritableKeys} and refuse anything
   * outside it, so the agent surface is a declared, auditable property of
   * the dashboard rather than "whatever setters happen to be in scope".
   */
  agentWritable?: string[];
};

export type ThresholdSeverity = 'success' | 'warning' | 'critical';

export type ThresholdRule = {
  op: 'gte' | 'lte' | 'gt' | 'lt' | 'eq';
  value: number;
  severity: ThresholdSeverity;
};

/** One declarative column for a table-rendering widget. */
export type WidgetTableColumn = {
  accessorKey: string;
  header: string;
  /** How the registry's table adapter should render the cell. */
  render?: 'text' | 'number' | 'currency' | 'percent' | 'badge' | 'sparkline';
};

export type WidgetNode = {
  id: string;
  /** Component-registry key, e.g. `"panel.stat"` or `"chart.line"`. */
  component: string;
  title?: string;
  /**
   * Component-specific configuration, passed through to the resolved
   * component-registry entry. Kept to JSON-serializable shapes (no
   * functions) so a manifest stays a genuine, inspectable data value —
   * `columns` for table widgets is the one structured exception.
   */
  props?: Record<string, unknown> & { columns?: WidgetTableColumn[] };
  dataBinding?: DataBinding;
  interaction?: WidgetInteraction;
  thresholds?: ThresholdRule[];
};

export type DashboardSpec = {
  version: 1;
  title?: string;
  layout: LayoutNode;
  /** Flat registry of widget nodes, referenced by id from `layout`. */
  widgets: Record<string, WidgetNode>;
};

/**
 * Data-source table keyed by `DataBinding['source']` — every source resolves
 * to an array of plain records; scalar widgets (e.g. a stat tile reading a
 * gauge) read the last record. A host app owns populating this (from a mock
 * fixture, a live subscription snapshot, a query result, ...); the engine
 * only ever reads it.
 */
export type DashboardDataSources = Record<string, Record<string, unknown>[]>;
