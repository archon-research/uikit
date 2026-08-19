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
export * from './types.js';
export * from './utils.js';
