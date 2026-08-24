import {
  columnFacetingFeature,
  columnFilteringFeature,
  columnOrderingFeature,
  columnPinningFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  createExpandedRowModel,
  createFacetedRowModel,
  createFacetedUniqueValues,
  createFilteredRowModel,
  createSortedRowModel,
  filterFns,
  globalFilteringFeature,
  rowExpandingFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFns,
  tableFeatures,
} from '@tanstack/react-table';

/**
 * The one feature set registered for every `DataTable`/`useDataTable` table
 * instance. TanStack v9 requires each table to declare its features
 * explicitly (no more "everything bundled" default) — this is the single
 * source of truth so every exported type (`ColumnDef`, `Table`, `Row`, ...) in
 * `types.ts` and the `useTable` call in `hooks.ts` agree on the same
 * `TFeatures`.
 *
 * Registers the full (deprecated-but-supported) `filterFns`/`sortFns`
 * registries rather than a handful of individually-imported functions, so
 * consumer column defs can keep referencing any v8 built-in filter/sort
 * function by its familiar string name (e.g. `filterFn: 'equalsString'`) —
 * see the `DataTableFilterVariant` doc comment in `types.ts`.
 */
export const dataTableFeatures = tableFeatures({
  rowSortingFeature,
  columnFilteringFeature,
  globalFilteringFeature,
  columnSizingFeature,
  columnResizingFeature,
  columnOrderingFeature,
  columnPinningFeature,
  rowSelectionFeature,
  columnVisibilityFeature,
  rowExpandingFeature,
  columnFacetingFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  expandedRowModel: createExpandedRowModel(),
  facetedRowModel: createFacetedRowModel(),
  facetedUniqueValues: createFacetedUniqueValues(),
  filterFns,
  sortFns,
});

export type DataTableFeatures = typeof dataTableFeatures;
