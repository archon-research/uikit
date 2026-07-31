import { Progress } from '@ark-ui/react/progress';
import { flexRender, type Table } from '@tanstack/react-table';
import type { CSSProperties, ReactNode } from 'react';

import { SkeletonRows } from '../SkeletonRows.js';
import {
  createMagnitudeStateMap,
  formatMagnitudeValueText,
  normalizeMagnitudeValue,
} from './magnitude.js';
import type { DataTableColumnAlign, DataTableDensity } from './types.js';

/**
 * The design-system package builds with `tsc` and ships no generated
 * `styled-system`, so this component applies recipe styling by its stable,
 * deterministic Panda class names rather than importing `css()`/recipe fns.
 * Conventions: slot base = `${className}__${slot}`; a slot variant =
 * `${className}__${slot}--${key}_${value}`.
 *
 * DataTable is the `dataTable` slot recipe (registered in the preset +
 * staticCss): the bordered frame, header/body rows and cells, and the inline
 * magnitude value bar are all class-driven, with no inline style objects. The
 * consumer `className` spreads last onto the root, and every slot carries a
 * `data-part` so `[data-part="..."]` overrides reach each part.
 */
const cx = (...classes: Array<string | false | null | undefined>): string =>
  classes.filter(Boolean).join(' ');

/**
 * Alignment class is only emitted for non-default alignments; `left` is the
 * slot base.
 */
const alignClass = (
  slot: 'headerCell' | 'bodyCell',
  align: DataTableColumnAlign | undefined,
): string | false =>
  align != null && align !== 'left'
    ? `dataTable__${slot}--align_${align}`
    : false;

/** Compact is the only non-default density; comfortable is the slot base. */
const densityClass = (
  slot: 'headerCell' | 'bodyCell',
  density: DataTableDensity,
): string | false =>
  density === 'compact' ? `dataTable__${slot}--density_compact` : false;

type DataTableProps<TData> = {
  table: Table<TData>;
  isLoading: boolean;
  onRowClick?: (row: TData) => void;
  getRowKey?: (row: TData) => string;
  selectedRowKey?: string | null;
  skeletonConfig?: {
    rows?: number;
    columns?: number;
    firstColumnTall?: boolean;
  };
  renderCell?: (cell: ReactNode) => ReactNode;
  className?: string;
  /**
   * Minimum table width. Defaults to `undefined` (natural/`auto` width) so the
   * table fits narrow containers instead of forcing horizontal scroll. Pass an
   * explicit value (e.g. `'48rem'`) to restore a forced minimum for wide,
   * many-column tables. BREAKING: the previous default was `'48rem'`.
   */
  minWidth?: string;
  /**
   * Row density. `'comfortable'` (default) keeps the historical row
   * height/padding; `'compact'` lowers header and body padding.
   */
  density?: DataTableDensity;
};

export function DataTable<TData>({
  table,
  isLoading,
  onRowClick,
  getRowKey,
  selectedRowKey,
  skeletonConfig = { rows: 3, columns: 3, firstColumnTall: true },
  renderCell,
  className,
  minWidth,
  density = 'comfortable',
}: DataTableProps<TData>) {
  const magnitudeStateByColumn = createMagnitudeStateMap(table);

  // `minWidth` is a consumer-supplied runtime dimension (any CSS length), not a
  // styling decision, so it stays an inline style; everything else is classes.
  const tableStyle: CSSProperties | undefined =
    minWidth != null ? { minWidth } : undefined;

  return (
    <div
      className={cx('dataTable__root', className)}
      data-scope="data-table"
      data-part="root"
      data-density={density}
    >
      <table className="dataTable__table" data-part="table" style={tableStyle}>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr
              key={headerGroup.id}
              className="dataTable__headerRow"
              data-part="header-row"
            >
              {headerGroup.headers.map((header) => {
                const sorted = header.column.getIsSorted();
                const canSort = header.column.getCanSort();
                const align = header.column.columnDef.meta?.align;
                const ariaSort = canSort
                  ? sorted === 'asc'
                    ? 'ascending'
                    : sorted === 'desc'
                      ? 'descending'
                      : 'none'
                  : undefined;

                return (
                  <th
                    key={header.id}
                    aria-sort={ariaSort}
                    className={cx(
                      'dataTable__headerCell',
                      alignClass('headerCell', align),
                      densityClass('headerCell', density),
                      canSort && 'dataTable__headerCell--sortable_true',
                    )}
                    data-part="header-cell"
                  >
                    {header.isPlaceholder ? null : canSort ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="dataTable__headerButton"
                        data-part="header-button"
                      >
                        <span>
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                        </span>
                        <span aria-hidden="true">
                          {sorted === 'asc'
                            ? '↑'
                            : sorted === 'desc'
                              ? '↓'
                              : '↕'}
                        </span>
                      </button>
                    ) : (
                      <span>
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {isLoading && table.getRowModel().rows.length === 0
            ? SkeletonRows(skeletonConfig)
            : table.getRowModel().rows.map((row) => {
                const rowKey = getRowKey
                  ? getRowKey(row.original)
                  : String(row.id);
                const isSelected =
                  selectedRowKey !== undefined && rowKey === selectedRowKey;
                const isClickable = onRowClick !== undefined;

                return (
                  <tr
                    key={rowKey}
                    aria-selected={isSelected || undefined}
                    tabIndex={isClickable ? 0 : undefined}
                    onClick={
                      isClickable ? () => onRowClick(row.original) : undefined
                    }
                    onKeyDown={
                      isClickable
                        ? (event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              onRowClick(row.original);
                            }
                          }
                        : undefined
                    }
                    className={cx(
                      'dataTable__bodyRow',
                      isSelected && 'dataTable__bodyRow--selected_true',
                      isClickable && 'dataTable__bodyRow--clickable_true',
                    )}
                    data-part="body-row"
                  >
                    {row.getVisibleCells().map((cell) => {
                      const cellContent = flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      );
                      const align = cell.column.columnDef.meta?.align;
                      const isMono = cell.column.columnDef.meta?.mono === true;
                      const magnitude = cell.column.columnDef.meta?.magnitude;
                      const magnitudeState = magnitude
                        ? magnitudeStateByColumn.get(cell.column.id)
                        : undefined;

                      const customValue = magnitude?.getValue?.(row.original);
                      const rawValue =
                        customValue !== null && customValue !== undefined
                          ? customValue
                          : cell.getValue();
                      const isNumericValue =
                        typeof rawValue === 'number' &&
                        Number.isFinite(rawValue);

                      let content = cellContent;

                      if (
                        magnitude &&
                        magnitude.enabled !== false &&
                        magnitudeState &&
                        isNumericValue
                      ) {
                        const normalized = normalizeMagnitudeValue(
                          rawValue,
                          magnitudeState.domain,
                          magnitudeState.scale,
                        );
                        const percent = normalized * 100;
                        const hasValueTextResolver =
                          typeof magnitude.getValueText === 'function';
                        const valueText = magnitude.getValueText?.(rawValue, {
                          min: magnitudeState.domain.min,
                          max: magnitudeState.domain.max,
                        });

                        content = (
                          <div
                            className="dataTable__magnitudeCell"
                            data-part="magnitude-cell"
                          >
                            <span
                              className="dataTable__magnitudeValue"
                              data-part="magnitude-value"
                            >
                              {cellContent}
                            </span>
                            <Progress.Root
                              value={percent}
                              min={0}
                              max={100}
                              className="dataTable__magnitudeProgressRoot"
                              data-part="magnitude-progress-root"
                            >
                              <Progress.Track
                                className="dataTable__magnitudeProgressTrack"
                                data-part="magnitude-progress-track"
                              >
                                <Progress.Range className="dataTable__magnitudeProgressRange" />
                              </Progress.Track>
                              {valueText ? (
                                <span className="dataTable__magnitudeValueText">
                                  {valueText}
                                </span>
                              ) : hasValueTextResolver ? null : (
                                <Progress.ValueText className="dataTable__magnitudeValueText">
                                  {formatMagnitudeValueText(percent)}
                                </Progress.ValueText>
                              )}
                            </Progress.Root>
                          </div>
                        );
                      }

                      return (
                        <td
                          key={cell.id}
                          className={cx(
                            'dataTable__bodyCell',
                            alignClass('bodyCell', align),
                            densityClass('bodyCell', density),
                            isMono && 'dataTable__bodyCell--mono_true',
                          )}
                          data-part="body-cell"
                        >
                          {renderCell ? renderCell(content) : content}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
        </tbody>
      </table>
    </div>
  );
}
