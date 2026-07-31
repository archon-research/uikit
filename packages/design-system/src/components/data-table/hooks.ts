import {
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type OnChangeFn,
  type SortingState,
  type Table,
} from '@tanstack/react-table';
import * as React from 'react';

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
  config: DataTableConfig = {},
): Table<T> {
  const [internalSorting, setInternalSorting] = React.useState<SortingState>(
    config.defaultSorting ?? [],
  );
  const [internalColumnFilters, setInternalColumnFilters] =
    React.useState<ColumnFiltersState>(config.defaultColumnFilters ?? []);
  const [internalGlobalFilter, setInternalGlobalFilter] = React.useState('');

  const sorting = config.sorting ?? internalSorting;
  const columnFilters = config.columnFilters ?? internalColumnFilters;
  const globalFilter = config.globalFilter ?? internalGlobalFilter;

  const handleSortingChange: OnChangeFn<SortingState> =
    config.onSortingChange ?? setInternalSorting;
  const handleColumnFiltersChange: OnChangeFn<ColumnFiltersState> =
    config.onColumnFiltersChange ?? setInternalColumnFilters;
  const handleGlobalFilterChange =
    config.onGlobalFilterChange ?? setInternalGlobalFilter;

  return useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: handleSortingChange,
    onColumnFiltersChange: handleColumnFiltersChange,
    onGlobalFilterChange: handleGlobalFilterChange,
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
