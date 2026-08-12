import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ExpandedState,
  type OnChangeFn,
  type Row,
  type SortingState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { type ReactNode, type RefCallback, useRef, useState } from 'react';

import type { DataTableColumnAlign, DataTableDensity } from './types.js';

/**
 * Class names emitted by the `expandableDataTable` slot recipe (registered in
 * the preset + staticCss). The design-system ships no generated `styled-system`,
 * so styling is applied by stable slot class names
 * (`expandableDataTable__${slot}`, variant `…--${key}_${value}`).
 *
 * A master/detail table: each logical row renders as its OWN `<tbody>` holding
 * the main `<tr>` and, when expanded, a full-width detail `<tr>`. That grouping
 * is what lets the virtualizer measure a row's expanded height as one unit.
 *
 * Identity: a stable `getRowId` is REQUIRED and is threaded through TanStack's
 * expansion state, the virtualizer's `getItemKey`, and the measure cache — so
 * prepending/reordering rows (live data) never re-attributes an expanded row's
 * measured height to a different row.
 */
const cx = (...classes: Array<string | false | null | undefined>): string =>
  classes.filter(Boolean).join(' ');

const DEFAULT_ESTIMATED_ROW_HEIGHT: Record<DataTableDensity, number> = {
  comfortable: 44,
  compact: 32,
};

export type ExpandableDataTableDensity = DataTableDensity;

export interface ExpandableDataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  /**
   * REQUIRED stable per-row identity. Threaded through expansion state, the
   * virtualizer's `getItemKey`, and the measure cache. Never derive it from the
   * array index — with reordering/prepending data that mis-attributes an
   * expanded row's measured height to the wrong row.
   */
  getRowId: (row: TData, index: number) => string;
  /**
   * Renders the detail panel beneath an expanded row. Providing it turns on the
   * expander column. Omit for a plain (non-expandable) virtualized table.
   */
  renderDetailRow?: (row: TData) => ReactNode;
  /** Which rows may expand. Defaults to all rows when `renderDetailRow` is set. */
  getRowCanExpand?: (row: TData) => boolean;
  /** Controlled expansion state (TanStack `ExpandedState`). Uncontrolled by default. */
  expanded?: ExpandedState;
  onExpandedChange?: OnChangeFn<ExpandedState>;
  defaultExpanded?: ExpandedState;
  enableSorting?: boolean;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  defaultSorting?: SortingState;
  density?: ExpandableDataTableDensity;
  /** Virtualize rows (react-virtual). Defaults to true. */
  virtualized?: boolean;
  /** Scroll-container max height (any CSS length). Enables the scroll viewport. */
  maxHeight?: number | string;
  estimatedRowHeight?: number;
  overscan?: number;
  /** Stick the header while scrolling. Defaults to true when `maxHeight` is set. */
  stickyHeader?: boolean;
  isLoading?: boolean;
  /** Rendered when there are no rows and not loading. Defaults to "No records". */
  emptyContent?: ReactNode;
  className?: string;
}

export function ExpandableDataTable<TData>({
  data,
  columns,
  getRowId,
  renderDetailRow,
  getRowCanExpand,
  expanded,
  onExpandedChange,
  defaultExpanded,
  enableSorting = false,
  sorting,
  onSortingChange,
  defaultSorting,
  density = 'comfortable',
  virtualized = true,
  maxHeight,
  estimatedRowHeight,
  overscan = 8,
  stickyHeader,
  isLoading = false,
  emptyContent,
  className,
}: ExpandableDataTableProps<TData>) {
  const expandable = renderDetailRow != null;

  const [internalExpanded, setInternalExpanded] = useState<ExpandedState>(
    defaultExpanded ?? {},
  );
  const [internalSorting, setInternalSorting] = useState<SortingState>(
    defaultSorting ?? [],
  );
  const expandedState = expanded ?? internalExpanded;
  const sortingState = sorting ?? internalSorting;

  const table = useReactTable({
    data,
    columns,
    getRowId,
    state: { expanded: expandedState, sorting: sortingState },
    onExpandedChange: onExpandedChange ?? setInternalExpanded,
    onSortingChange: onSortingChange ?? setInternalSorting,
    enableSorting,
    // Expansion is opt-in: only allow it when a detail renderer is supplied.
    getRowCanExpand: expandable
      ? (row: Row<TData>) =>
          getRowCanExpand ? getRowCanExpand(row.original) : true
      : undefined,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  const rows = table.getRowModel().rows;
  const leafColumnCount =
    table.getVisibleLeafColumns().length + (expandable ? 1 : 0);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const resolvedEstimatedRowHeight =
    estimatedRowHeight ?? DEFAULT_ESTIMATED_ROW_HEIGHT[density];

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => (virtualized ? scrollRef.current : null),
    estimateSize: () => resolvedEstimatedRowHeight,
    overscan,
    // IDENTITY: key the virtual item (and thus the measure cache) off the row's
    // stable id, never the array index — otherwise a prepend/reorder shifts
    // indices and the measured height of an expanded row lands on a sibling.
    getItemKey: (index) => rows[index]?.id ?? index,
  });

  const virtualItems = virtualized ? rowVirtualizer.getVirtualItems() : [];
  const totalSize = virtualized ? rowVirtualizer.getTotalSize() : 0;
  const paddingTop =
    virtualized && virtualItems.length > 0 ? virtualItems[0]!.start : 0;
  const paddingBottom =
    virtualized && virtualItems.length > 0
      ? totalSize - virtualItems[virtualItems.length - 1]!.end
      : 0;

  const resolvedStickyHeader = stickyHeader ?? maxHeight != null;

  function renderRowGroup(
    row: Row<TData>,
    index: number,
    measureRef?: RefCallback<HTMLTableSectionElement>,
  ) {
    const isExpanded = row.getIsExpanded();
    return (
      <tbody
        key={row.id}
        ref={measureRef}
        data-index={virtualized ? index : undefined}
        className="expandableDataTable__rowGroup"
        data-part="row-group"
      >
        <tr className="expandableDataTable__row" data-part="row">
          {expandable ? (
            <td
              className="expandableDataTable__expanderCell"
              data-part="expander-cell"
            >
              {row.getCanExpand() ? (
                <button
                  type="button"
                  className="expandableDataTable__expander"
                  data-part="expander"
                  data-expanded={isExpanded}
                  aria-expanded={isExpanded}
                  aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
                  onClick={row.getToggleExpandedHandler()}
                >
                  <span aria-hidden="true">▸</span>
                </button>
              ) : null}
            </td>
          ) : null}
          {row.getVisibleCells().map((cell) => {
            const meta = cell.column.columnDef.meta as
              | { align?: DataTableColumnAlign; mono?: boolean }
              | undefined;
            return (
              <td
                key={cell.id}
                className={cx(
                  'expandableDataTable__cell',
                  meta?.mono && 'expandableDataTable__cell--mono_true',
                )}
                data-part="cell"
                style={meta?.align ? { textAlign: meta.align } : undefined}
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            );
          })}
        </tr>
        {isExpanded && renderDetailRow ? (
          <tr className="expandableDataTable__detailRow" data-part="detail-row">
            <td
              className="expandableDataTable__detailCell"
              data-part="detail-cell"
              colSpan={leafColumnCount}
            >
              {renderDetailRow(row.original)}
            </td>
          </tr>
        ) : null}
      </tbody>
    );
  }

  const isEmpty = rows.length === 0 && !isLoading;

  return (
    <div
      className={cx(
        'expandableDataTable__root',
        density !== 'comfortable' &&
          `expandableDataTable__root--density_${density}`,
        className,
      )}
      data-scope="expandable-data-table"
      data-part="root"
    >
      <div
        ref={scrollRef}
        className="expandableDataTable__scroll"
        data-part="scroll"
        style={maxHeight != null ? { maxHeight } : undefined}
      >
        <table className="expandableDataTable__table" data-part="table">
          <thead
            className={cx(
              'expandableDataTable__header',
              resolvedStickyHeader &&
                'expandableDataTable__header--stickyHeader_true',
            )}
            data-part="header"
          >
            <tr
              className="expandableDataTable__headerRow"
              data-part="header-row"
            >
              {expandable ? (
                <th
                  className={cx(
                    'expandableDataTable__headerCell',
                    density !== 'comfortable' &&
                      `expandableDataTable__headerCell--density_${density}`,
                  )}
                  aria-label="Expand column"
                />
              ) : null}
              {table.getLeafHeaders().map((header) => {
                const meta = header.column.columnDef.meta as
                  | { align?: DataTableColumnAlign }
                  | undefined;
                const canSort = enableSorting && header.column.getCanSort();
                const sorted = header.column.getIsSorted();
                const label = flexRender(
                  header.column.columnDef.header,
                  header.getContext(),
                );
                return (
                  <th
                    key={header.id}
                    className={cx(
                      'expandableDataTable__headerCell',
                      density !== 'comfortable' &&
                        `expandableDataTable__headerCell--density_${density}`,
                    )}
                    data-part="header-cell"
                    style={meta?.align ? { textAlign: meta.align } : undefined}
                    aria-sort={
                      sorted === 'asc'
                        ? 'ascending'
                        : sorted === 'desc'
                          ? 'descending'
                          : undefined
                    }
                  >
                    {canSort ? (
                      <button
                        type="button"
                        className="expandableDataTable__sortButton"
                        data-part="sort-button"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {label}
                        <span aria-hidden="true">
                          {sorted === 'asc'
                            ? '↑'
                            : sorted === 'desc'
                              ? '↓'
                              : ''}
                        </span>
                      </button>
                    ) : (
                      label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          {isEmpty ? (
            <tbody>
              <tr>
                <td
                  className="expandableDataTable__empty"
                  data-part="empty"
                  colSpan={leafColumnCount}
                >
                  {emptyContent ?? 'No records'}
                </td>
              </tr>
            </tbody>
          ) : virtualized ? (
            <>
              {paddingTop > 0 ? (
                <tbody aria-hidden="true">
                  <tr>
                    <td
                      colSpan={leafColumnCount}
                      style={{ height: paddingTop }}
                    />
                  </tr>
                </tbody>
              ) : null}
              {virtualItems.map((virtualItem) =>
                renderRowGroup(
                  rows[virtualItem.index]!,
                  virtualItem.index,
                  rowVirtualizer.measureElement,
                ),
              )}
              {paddingBottom > 0 ? (
                <tbody aria-hidden="true">
                  <tr>
                    <td
                      colSpan={leafColumnCount}
                      style={{ height: paddingBottom }}
                    />
                  </tr>
                </tbody>
              ) : null}
            </>
          ) : (
            rows.map((row, index) => renderRowGroup(row, index))
          )}
        </table>
      </div>
    </div>
  );
}
