import type {
  ColumnDef,
  RowData,
  OnChangeFn,
  SortingState,
} from '@tanstack/react-table';

export type DataTableMagnitudeScale = 'log' | 'linear';

export type DataTableMagnitudeDomain<TData> =
  | 'column'
  | { min: number; max: number }
  | ((values: number[], rows: TData[]) => { min: number; max: number } | null);

export interface DataTableMagnitudeConfig<TData> {
  enabled?: boolean;
  scale?: DataTableMagnitudeScale;
  domain?: DataTableMagnitudeDomain<TData>;
  scope?: 'filtered' | 'all';
  getValue?: (row: TData) => number | null | undefined;
  // Return a string to override the value-text, or null to suppress it entirely
  // (bar only). When this resolver is omitted, the normalized percentage shows.
  getValueText?: (
    value: number,
    context: { min: number; max: number },
  ) => string | null;
}

export interface DataTableConfig {
  enableSearch?: boolean;
  enableSorting?: boolean;
  sorting?: SortingState;
  globalFilter?: string;
  onSortingChange?: OnChangeFn<SortingState>;
  onGlobalFilterChange?: (filter: string) => void;
  defaultSorting?: SortingState;
  searchDebounceMs?: number;
}

export interface UrlSyncedTableStateAdapter {
  sortParam: string | null;
  setSortParam: (value: string | null) => void;
  searchParam: string | null;
  setSearchParam: (value: string | null) => void;
}

export interface UseUrlSyncedTableReturn {
  sorting: SortingState;
  globalFilter: string;
  setSorting: OnChangeFn<SortingState>;
  setGlobalFilter: (filter: string) => void;
}

export type TypedColumnDef<T> = ColumnDef<T> & {
  searchable?: boolean;
  sortable?: boolean;
};

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    magnitude?: DataTableMagnitudeConfig<TData>;
  }
}
