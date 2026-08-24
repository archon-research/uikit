import {
  useTable,
  type ColumnFiltersState,
  type ColumnOrderState,
  type ColumnPinningState,
  type ColumnSizingState,
  type ColumnVisibilityState,
  type ExpandedState,
  type OnChangeFn,
  type RowData,
  type RowSelectionState,
  type SortingState,
} from '@tanstack/react-table';
import * as React from 'react';

import { IS_DEV_WARNING_ENABLED } from '../../hooks/devWarning.js';
import { useIdentityChurnWarning } from '../../hooks/useIdentityChurnWarning.js';
import { dataTableFeatures, type DataTableFeatures } from './features.js';
import type {
  ColumnDef,
  DataTableConfig,
  Table,
  UrlSyncedTableStateAdapter,
  UseUrlSyncedTableReturn,
} from './types.js';
import {
  deserializeSorting,
  serializeSorting,
  shouldWarnMissingGetRowId,
  validateSortingState,
} from './utils.js';

export function useDataTable<T extends RowData>(
  data: T[],
  columns: ColumnDef<T>[],
  config: DataTableConfig<T> = {},
): Table<T> {
  // `columns` should be stable (memoized or module-scoped, e.g. via
  // `defineColumns`) — a fresh array each render re-syncs the table. Warns
  // once, dev-only, if it churns.
  useIdentityChurnWarning(columns, 'useDataTable columns');

  // `getRowCanExpand` without a stable `getRowId` means expansion state (and,
  // downstream in `DataTable`, the virtualizer's item keys and measurement
  // cache) key off array indices instead of row identity — silently broken
  // once data is prepended or reordered. Warns once, dev-only.
  const missingRowIdWarned = React.useRef(false);
  if (
    IS_DEV_WARNING_ENABLED &&
    shouldWarnMissingGetRowId(
      config.getRowCanExpand != null,
      config.getRowId != null,
      missingRowIdWarned.current,
    )
  ) {
    missingRowIdWarned.current = true;
    console.warn(
      '[uikit] `useDataTable` was given `getRowCanExpand` without `getRowId` ' +
        "— row expansion state (and DataTable's virtualized row measurement) " +
        'will key off array indices, which breaks when data is prepended or ' +
        'reordered. Pass a stable `getRowId`.',
    );
  }

  const [internalSorting, setInternalSorting] = React.useState<SortingState>(
    config.defaultSorting ?? [],
  );
  const [internalColumnFilters, setInternalColumnFilters] =
    React.useState<ColumnFiltersState>(config.defaultColumnFilters ?? []);
  const [internalGlobalFilter, setInternalGlobalFilter] = React.useState('');
  const [internalColumnSizing, setInternalColumnSizing] =
    React.useState<ColumnSizingState>(config.defaultColumnSizing ?? {});
  const [internalColumnOrder, setInternalColumnOrder] =
    React.useState<ColumnOrderState>(config.defaultColumnOrder ?? []);
  const [internalColumnPinning, setInternalColumnPinning] =
    React.useState<ColumnPinningState>(
      config.defaultColumnPinning ?? { start: [], end: [] },
    );
  const [internalRowSelection, setInternalRowSelection] =
    React.useState<RowSelectionState>(config.defaultRowSelection ?? {});
  const [internalColumnVisibility, setInternalColumnVisibility] =
    React.useState<ColumnVisibilityState>(config.defaultColumnVisibility ?? {});
  const [internalExpanded, setInternalExpanded] = React.useState<ExpandedState>(
    config.defaultExpanded ?? {},
  );

  const sorting = config.sorting ?? internalSorting;
  const columnFilters = config.columnFilters ?? internalColumnFilters;
  const globalFilter = config.globalFilter ?? internalGlobalFilter;
  const columnSizing = config.columnSizing ?? internalColumnSizing;
  const columnOrder = config.columnOrder ?? internalColumnOrder;
  const columnPinning = config.columnPinning ?? internalColumnPinning;
  const rowSelection = config.rowSelection ?? internalRowSelection;
  const columnVisibility = config.columnVisibility ?? internalColumnVisibility;
  const expanded = config.expanded ?? internalExpanded;

  const handleSortingChange: OnChangeFn<SortingState> =
    config.onSortingChange ?? setInternalSorting;
  const handleColumnFiltersChange: OnChangeFn<ColumnFiltersState> =
    config.onColumnFiltersChange ?? setInternalColumnFilters;
  const handleGlobalFilterChange =
    config.onGlobalFilterChange ?? setInternalGlobalFilter;
  const handleColumnSizingChange: OnChangeFn<ColumnSizingState> =
    config.onColumnSizingChange ?? setInternalColumnSizing;
  const handleColumnOrderChange: OnChangeFn<ColumnOrderState> =
    config.onColumnOrderChange ?? setInternalColumnOrder;
  const handleColumnPinningChange: OnChangeFn<ColumnPinningState> =
    config.onColumnPinningChange ?? setInternalColumnPinning;
  const handleRowSelectionChange: OnChangeFn<RowSelectionState> =
    config.onRowSelectionChange ?? setInternalRowSelection;
  const handleColumnVisibilityChange: OnChangeFn<ColumnVisibilityState> =
    config.onColumnVisibilityChange ?? setInternalColumnVisibility;
  const handleExpandedChange: OnChangeFn<ExpandedState> =
    config.onExpandedChange ?? setInternalExpanded;

  // Faceted row models back the DataTable's per-column `select` filter
  // affordance (`column.getFacetedUniqueValues()`) — cheap to register
  // unconditionally since faceting is computed lazily per-column on demand.
  // All row models (core/sorted/filtered/expanded/faceted) are registered
  // once, up front, on `dataTableFeatures` (see `features.ts`) rather than
  // per-call here — TanStack v9 moved row-model factories from table options
  // onto the `features` object.
  return useTable<DataTableFeatures, T>({
    features: dataTableFeatures,
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      columnSizing,
      columnOrder,
      columnPinning,
      rowSelection,
      columnVisibility,
      expanded,
    },
    onSortingChange: handleSortingChange,
    onColumnFiltersChange: handleColumnFiltersChange,
    onGlobalFilterChange: handleGlobalFilterChange,
    onColumnSizingChange: handleColumnSizingChange,
    onColumnOrderChange: handleColumnOrderChange,
    onColumnPinningChange: handleColumnPinningChange,
    onRowSelectionChange: handleRowSelectionChange,
    onColumnVisibilityChange: handleColumnVisibilityChange,
    onExpandedChange: handleExpandedChange,
    getRowCanExpand: config.getRowCanExpand,
    globalFilterFn: 'includesString',
    enableSorting: config.enableSorting,
    enableGlobalFilter: config.enableSearch,
    enableColumnResizing: config.enableColumnResizing,
    // TanStack's own default is `'onEnd'`; `DataTable` is built for the live
    // relayout feel of `'onChange'` (see the config JSDoc), so that's the
    // default here rather than leaving it to TanStack's.
    columnResizeMode: config.columnResizeMode ?? 'onChange',
    enableRowSelection: config.enableRowSelection,
    enableMultiRowSelection:
      config.enableMultiRowSelection ?? Boolean(config.enableRowSelection),
    getRowId: config.getRowId,
  });
}

/**
 * Runs `sorting`/`globalFilter` controlled by two URL query params via
 * `adapter` (see {@link UrlSyncedTableStateAdapter}). This hook never touches
 * `window.location`, `history`, or a router itself — the consumer's adapter is
 * the only thing that does, so any router (or none) can back it. Wire the
 * returned `sorting`/`globalFilter`/`setSorting`/`setGlobalFilter` straight
 * into `useDataTable`'s `config` to make the table URL-controlled. The
 * uncontrolled default (no adapter) is `useDataTable`'s own internal state.
 */
export function useUrlSyncedTableStateAdapter(
  adapter: UrlSyncedTableStateAdapter,
): UseUrlSyncedTableReturn {
  const sorting = React.useMemo(() => {
    return validateSortingState(deserializeSorting(adapter.sortParam));
  }, [adapter.sortParam]);

  const globalFilter = adapter.searchParam ?? '';

  const handleSetSorting = React.useCallback(
    (nextSorting: SortingState | ((old: SortingState) => SortingState)) => {
      const resolvedSorting =
        typeof nextSorting === 'function' ? nextSorting(sorting) : nextSorting;
      const serializedSorting = serializeSorting(resolvedSorting);
      adapter.setSortParam(serializedSorting || null);
    },
    [adapter, sorting],
  );

  const handleSetGlobalFilter = React.useCallback(
    (filter: string) => {
      adapter.setSearchParam(filter || null);
    },
    [adapter],
  );

  return {
    sorting,
    globalFilter,
    setSorting: handleSetSorting,
    setGlobalFilter: handleSetGlobalFilter,
  };
}
