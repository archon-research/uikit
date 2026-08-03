import type {
  ColumnDef,
  ColumnFiltersState,
  ColumnOrderState,
  ColumnPinningState,
  ColumnResizeMode,
  ColumnSizingState,
  RowData,
  RowSelectionState,
  OnChangeFn,
  Row,
  SortingState,
} from '@tanstack/react-table';

export type DataTableMagnitudeScale = 'log' | 'linear';

/**
 * Horizontal alignment for a column's header and body cells. Set per-column via
 * the column definition `meta.align`. Numeric columns typically use `'right'`.
 */
export type DataTableColumnAlign = 'left' | 'right' | 'center';

/**
 * Row density for the whole table. `'comfortable'` (default) preserves the
 * historical row height/padding; `'compact'` lowers both for denser layouts.
 */
export type DataTableDensity = 'comfortable' | 'compact';

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

export interface DataTableConfig<T = unknown> {
  enableSearch?: boolean;
  enableSorting?: boolean;
  sorting?: SortingState;
  globalFilter?: string;
  onSortingChange?: OnChangeFn<SortingState>;
  onGlobalFilterChange?: (filter: string) => void;
  defaultSorting?: SortingState;
  searchDebounceMs?: number;
  /**
   * Controlled per-column filter state. Uncontrolled by default (internal
   * `useState`, seeded from `defaultColumnFilters`) — same controlled/
   * uncontrolled pattern as `sorting`/`globalFilter`. Pair a column's entry
   * with `meta.filterVariant` (see `types.ts`) so `DataTable` renders a filter
   * affordance for it.
   */
  columnFilters?: ColumnFiltersState;
  onColumnFiltersChange?: OnChangeFn<ColumnFiltersState>;
  defaultColumnFilters?: ColumnFiltersState;

  /**
   * Controlled column-sizing state (TanStack's `columnSizing` feature).
   * Uncontrolled by default (internal `useState`, seeded from
   * `defaultColumnSizing`) — same controlled/uncontrolled pattern as
   * `sorting`. Pair with `enableColumnResizing` to turn on the drag handle
   * `DataTable` renders in each resizable header cell.
   */
  columnSizing?: ColumnSizingState;
  onColumnSizingChange?: OnChangeFn<ColumnSizingState>;
  defaultColumnSizing?: ColumnSizingState;
  /**
   * Turns on TanStack's column-resizing feature and the drag handle
   * `DataTable` renders in each resizable header cell (`DataTable` reads this
   * straight off the returned `Table` instance — no separate `DataTable`
   * prop). Off by default (additive/opt-in) — existing consumers are
   * unaffected. Give a column `size`/`minSize`/`maxSize` in its `ColumnDef` to
   * control its resizable range; set `enableResizing: false` on a column to
   * exempt it.
   */
  enableColumnResizing?: boolean;
  /**
   * `'onChange'` (the default here, not TanStack's own default of `'onEnd'`)
   * relayouts the table on every pointer move while dragging, for a
   * live-resize feel — affordable because `DataTable` switches to
   * `tableLayout: fixed` whenever resizing is on. `'onEnd'` waits until the
   * drag finishes. Irrelevant unless `enableColumnResizing` is set.
   */
  columnResizeMode?: ColumnResizeMode;

  /**
   * Controlled column-order state (TanStack's `columnOrder` feature).
   * Uncontrolled by default (internal `useState`, seeded from
   * `defaultColumnOrder`) — same controlled/uncontrolled pattern as
   * `sorting`. Column ordering needs no table-level enable flag in TanStack
   * itself; pair this with `DataTable`'s `enableColumnReordering` prop for the
   * drag-to-reorder header affordance.
   */
  columnOrder?: ColumnOrderState;
  onColumnOrderChange?: OnChangeFn<ColumnOrderState>;
  defaultColumnOrder?: ColumnOrderState;

  /**
   * Controlled column-pinning state (TanStack's `columnPinning` feature).
   * Uncontrolled by default (internal `useState`, seeded from
   * `defaultColumnPinning`) — same controlled/uncontrolled pattern as
   * `sorting`. Pair with `DataTable`'s `enableColumnPinning` prop for the
   * pin/unpin toggle button and sticky-positioned pinned cells; a column
   * opts out of pinning with `enableColumnPinning: false` on its `ColumnDef`.
   */
  columnPinning?: ColumnPinningState;
  onColumnPinningChange?: OnChangeFn<ColumnPinningState>;
  defaultColumnPinning?: ColumnPinningState;

  /**
   * Controlled multi-row-selection state (TanStack's `rowSelection`
   * feature). Uncontrolled by default (internal `useState`, seeded from
   * `defaultRowSelection`) — same controlled/uncontrolled pattern as
   * `sorting`. `DataTable` renders a checkbox column (header select-all +
   * one per row) whenever this feature is turned on via `enableRowSelection`
   * below — `DataTable` reads that straight off the returned `Table`
   * instance, no separate `DataTable` prop.
   */
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  defaultRowSelection?: RowSelectionState;
  /**
   * Turns on TanStack's row-selection feature. Off by default
   * (additive/opt-in). Accepts a predicate to make only some rows
   * selectable (TanStack renders/disables the checkbox per row via
   * `row.getCanSelect()`), mirroring TanStack's own `enableRowSelection`
   * table option.
   */
  enableRowSelection?: boolean | ((row: Row<T>) => boolean);
  /**
   * Allows selecting more than one row at once. Defaults to `true`
   * whenever `enableRowSelection` is set (single-select is the unusual
   * case); pass `false` explicitly for a single-select checkbox column.
   */
  enableMultiRowSelection?: boolean;
  /**
   * Stable per-row id, so selection (and pinning) state survives a sort or
   * filter instead of tracking whatever row now sits at a given index.
   * Defaults to TanStack's own index-based id when omitted. Mirrors
   * TanStack's `getRowId` table option.
   */
  getRowId?: (row: T, index: number) => string;
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

/**
 * Per-column filter affordance `DataTable` renders in the (opt-in) filter row
 * beneath the header. `'text'` is a free-text input filtered against
 * `column.getFilterValue()`; `'select'` is a native `<select>` populated from
 * `column.getFacetedUniqueValues()` (register `getFacetedRowModel`/
 * `getFacetedUniqueValues` — `useDataTable` already does this). Omit to render
 * no affordance for that column, even if it's otherwise filterable.
 *
 * `'select'` assumes exact-value matching; give the column an explicit
 * `filterFn: 'equalsString'` (or a custom exact-match fn) in its `ColumnDef` —
 * the table-wide `filterFns.auto` default resolves to a substring match, which
 * can over-match when one facet value is a substring of another.
 */
export type DataTableFilterVariant = 'text' | 'select';

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    magnitude?: DataTableMagnitudeConfig<TData>;
    /**
     * Horizontal alignment applied to this column's header and body cells.
     * Defaults to `'left'` when omitted.
     */
    align?: DataTableColumnAlign;
    /**
     * Render this column's body cells in the mono font with tabular figures so
     * numeric values align down the column. Pair with `align: 'right'` for
     * currency/amount columns. Defaults to `false` when omitted.
     */
    mono?: boolean;
    /**
     * Renders a per-column filter affordance in `DataTable`'s filter row. See
     * `DataTableFilterVariant`. Omitted (default) renders no affordance.
     */
    filterVariant?: DataTableFilterVariant;
  }
}
