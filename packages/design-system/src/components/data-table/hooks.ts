import {
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnOrderState,
  type ColumnPinningState,
  type ColumnSizingState,
  type OnChangeFn,
  type RowSelectionState,
  type SortingState,
  type Table,
  type VisibilityState,
} from '@tanstack/react-table';
import * as React from 'react';

import { useIdentityChurnWarning } from '../../hooks/useIdentityChurnWarning.js';
import type {
  DataTableConfig,
  UrlSyncedTableStateAdapter,
  UseUrlSyncedTableReturn,
} from './types.js';
import {
  deserializeSorting,
  serializeSorting,
  validateSortingState,
} from './utils.js';

export function useDataTable<T>(
  data: T[],
  columns: ColumnDef<T>[],
  config: DataTableConfig<T> = {},
): Table<T> {
  // `columns` should be stable (memoized or module-scoped, e.g. via
  // `defineColumns`) — a fresh array each render re-syncs the table. Warn in
  // dev if it churns.
  useIdentityChurnWarning(columns, 'useDataTable columns');

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
      config.defaultColumnPinning ?? { left: [], right: [] },
    );
  const [internalRowSelection, setInternalRowSelection] =
    React.useState<RowSelectionState>(config.defaultRowSelection ?? {});
  const [internalColumnVisibility, setInternalColumnVisibility] =
    React.useState<VisibilityState>(config.defaultColumnVisibility ?? {});

  const sorting = config.sorting ?? internalSorting;
  const columnFilters = config.columnFilters ?? internalColumnFilters;
  const globalFilter = config.globalFilter ?? internalGlobalFilter;
  const columnSizing = config.columnSizing ?? internalColumnSizing;
  const columnOrder = config.columnOrder ?? internalColumnOrder;
  const columnPinning = config.columnPinning ?? internalColumnPinning;
  const rowSelection = config.rowSelection ?? internalRowSelection;
  const columnVisibility = config.columnVisibility ?? internalColumnVisibility;

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
  const handleColumnVisibilityChange: OnChangeFn<VisibilityState> =
    config.onColumnVisibilityChange ?? setInternalColumnVisibility;

  return useReactTable({
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
    },
    onSortingChange: handleSortingChange,
    onColumnFiltersChange: handleColumnFiltersChange,
    onGlobalFilterChange: handleGlobalFilterChange,
    onColumnSizingChange: handleColumnSizingChange,
    onColumnOrderChange: handleColumnOrderChange,
    onColumnPinningChange: handleColumnPinningChange,
    onRowSelectionChange: handleRowSelectionChange,
    onColumnVisibilityChange: handleColumnVisibilityChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    // Faceted models back the DataTable's per-column `select` filter
    // affordance (`column.getFacetedUniqueValues()`) — cheap to register
    // unconditionally since faceting is computed lazily per-column on demand.
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
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
