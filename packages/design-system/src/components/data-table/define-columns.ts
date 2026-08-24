import type { RowData } from '@tanstack/react-table';

import type {
  CellContext,
  ColumnDef,
  DataTableColumnAlign,
  HeaderContext,
} from './types.js';

/**
 * A column entry accepted by {@link defineColumns}: a real column definition, or
 * a falsy placeholder (`false` / `null` / `undefined`) standing in for a column
 * a given viewport, tier, or permission omits. A tiered `columnsFor(tier)`
 * factory can therefore inline `tier === 'wide' && { ... }` without a local
 * `present()`/`filter(Boolean)` helper.
 */
export type DataTableColumnEntry<T extends RowData> =
  | ColumnDef<T>
  | false
  | null
  | undefined;

/**
 * Render-prop context for a {@link DataTable} body cell, pinned to the row type
 * `T` (and optionally the cell value `V`). Re-exported so a `cell` renderer can
 * be typed without importing `CellContext` from `@tanstack/react-table`
 * directly — e.g. `cell: (ctx: DataTableCell<Row>) => ...`.
 */
export type DataTableCell<T extends RowData, V = unknown> = CellContext<T, V>;

/**
 * Render-prop context for a {@link DataTable} header, pinned to `T` (and
 * optionally `V`). The header counterpart of {@link DataTableCell}.
 */
export type DataTableHeader<T extends RowData, V = unknown> = HeaderContext<
  T,
  V
>;

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
export function defineColumns<T extends RowData>(
  ...columns: Array<DataTableColumnEntry<T>>
): ColumnDef<T>[] {
  return columns.filter((column): column is ColumnDef<T> => Boolean(column));
}

/**
 * A {@link ColumnDef} that is guaranteed to carry a string `id`. Upstream,
 * `ColumnDef.id` is `string | undefined`, so id-keyed logic (an allow-list, a
 * width map, a pinned-column set) has to cast. Use this — and
 * {@link defineIdentifiedColumns} — when every column supplies an `id`.
 */
export type IdentifiedColumnDef<T extends RowData, V = unknown> = ColumnDef<
  T,
  V
> & {
  id: string;
};

/**
 * Like {@link defineColumns}, but every entry must supply a string `id`, and the
 * returned columns are typed {@link IdentifiedColumnDef} — so `col.id` narrows to
 * `string` (not `string | undefined`) and id-keyed logic needs no cast. Falsy
 * conditional entries are still filtered.
 *
 * ```ts
 * const columns = defineIdentifiedColumns<Row>(
 *   { id: 'name', accessorKey: 'name', header: 'Name' },
 *   wide && { id: 'detail', accessorKey: 'detail', header: 'Detail' },
 * );
 * const widths = new Map(columns.map((c) => [c.id, 120])); // c.id is string
 * ```
 */
export function defineIdentifiedColumns<T extends RowData>(
  ...columns: Array<IdentifiedColumnDef<T> | false | null | undefined>
): IdentifiedColumnDef<T>[] {
  return columns.filter((column): column is IdentifiedColumnDef<T> =>
    Boolean(column),
  );
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
