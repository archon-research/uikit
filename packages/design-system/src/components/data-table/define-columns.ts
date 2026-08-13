import type {
  CellContext,
  ColumnDef,
  HeaderContext,
} from '@tanstack/react-table';

import type { DataTableColumnAlign } from './types.js';

/**
 * A column entry accepted by {@link defineColumns}: a real column definition, or
 * a falsy placeholder (`false` / `null` / `undefined`) standing in for a column
 * a given viewport, tier, or permission omits. A tiered `columnsFor(tier)`
 * factory can therefore inline `tier === 'wide' && { ... }` without a local
 * `present()`/`filter(Boolean)` helper.
 */
export type DataTableColumnEntry<T> = ColumnDef<T> | false | null | undefined;

/**
 * Render-prop context for a {@link DataTable} body cell, pinned to the row type
 * `T` (and optionally the cell value `V`). Re-exported so a `cell` renderer can
 * be typed without importing `CellContext` from `@tanstack/react-table`
 * directly — e.g. `cell: (ctx: DataTableCell<Row>) => ...`.
 */
export type DataTableCell<T, V = unknown> = CellContext<T, V>;

/**
 * Render-prop context for a {@link DataTable} header, pinned to `T` (and
 * optionally `V`). The header counterpart of {@link DataTableCell}.
 */
export type DataTableHeader<T, V = unknown> = HeaderContext<T, V>;

/**
 * Build a `ColumnDef<T>[]` for {@link useDataTable} / {@link DataTable} from a
 * heterogeneous list that may contain conditional (falsy) entries, pinning the
 * row type `T` in one call.
 *
 * This removes the `columns as never` cast that a `ColumnDef<T>[]` parameter
 * otherwise forces at every call site: a conditional list (`[..., wide && col]`)
 * has type `(ColumnDef<T> | false)[]`, which is not assignable to
 * `ColumnDef<T>[]`, so consumers previously threw the type away. `defineColumns`
 * both strips the falsy entries and returns a correctly-typed array, so a column
 * referencing a field that no longer exists on `T` becomes a compile error
 * again.
 *
 * ```ts
 * const columns = defineColumns<Row>(
 *   { accessorKey: 'name', header: 'Name' },
 *   tier === 'wide' && { accessorKey: 'detail', header: 'Detail' },
 * );
 * const table = useDataTable(rows, columns); // no `as never`
 * ```
 */
export function defineColumns<T>(
  ...columns: Array<DataTableColumnEntry<T>>
): ColumnDef<T>[] {
  return columns.filter((column): column is ColumnDef<T> => Boolean(column));
}

/**
 * Column `meta` preset for a numeric column: right-aligned and rendered in the
 * mono font with tabular figures so values align down the column. Spread into a
 * column's `meta` (`meta: { ...numericColumnMeta }`) instead of re-typing the
 * `align`/`mono` object at each numeric column.
 */
export const numericColumnMeta: { align: DataTableColumnAlign; mono: boolean } =
  {
    align: 'right',
    mono: true,
  };
