export { DataTable } from './DataTable.js';
export type { DataTableProps } from './DataTable.js';
// Re-exported so a `./data-table` subpath consumer can name the type used by
// `skeletonConfig.columnHints` without also importing the package root.
export type {
  SkeletonColumnHint,
  SkeletonColumnKind,
} from '../SkeletonRows.js';
export { useDataTable, useUrlSyncedTableStateAdapter } from './hooks.js';
export {
  defineColumns,
  defineIdentifiedColumns,
  numericColumnMeta,
  type DataTableColumnEntry,
  type IdentifiedColumnDef,
  type DataTableCell,
  type DataTableHeader,
} from './define-columns.js';
// Named (not `export *`) so the v9 migration's internal fixed-features
// aliases (`Table`, `Row`, `Column`, `Cell`, `ColumnDef`, `CellContext`,
// `HeaderContext` — see `types.ts`) don't silently become new public API
// surface. `ColumnDef`/`CellContext` are re-exported deliberately (the root
// `index.ts` re-exports them under those same names, same shape as before
// this migration); the rest stay internal to this package.
export type {
  DataTableColumnAlign,
  DataTableConfig,
  DataTableDensity,
  DataTableFilterVariant,
  DataTableMagnitudeConfig,
  DataTableMagnitudeDomain,
  DataTableMagnitudeScale,
  TypedColumnDef,
  UrlSyncedTableStateAdapter,
  UseUrlSyncedTableReturn,
} from './types.js';
export * from './utils.js';
