import { Progress } from '@ark-ui/react/progress';
import { flexRender, type Table } from '@tanstack/react-table';
import type { ReactNode } from 'react';

import { SkeletonRows } from '../SkeletonRows';
import {
  createMagnitudeStateMap,
  formatMagnitudeValueText,
  normalizeMagnitudeValue,
} from './magnitude';
import { dataTableRecipes } from './recipes';

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
  minWidth?: string;
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
  minWidth = '48rem',
}: DataTableProps<TData>) {
  const magnitudeStateByColumn = createMagnitudeStateMap(table);

  return (
    <div
      className={className}
      style={{
        ...dataTableRecipes.wrapper,
      }}
    >
      <table
        style={{
          ...dataTableRecipes.table,
          minWidth,
        }}
      >
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} style={dataTableRecipes.headerRow}>
              {headerGroup.headers.map((header) => {
                const sorted = header.column.getIsSorted();
                const canSort = header.column.getCanSort();
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
                    style={dataTableRecipes.headerCell({ sortable: canSort })}
                  >
                    {header.isPlaceholder ? null : canSort ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        style={dataTableRecipes.headerButton}
                      >
                        <span>
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                        </span>
                        <span>
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
                    style={{
                      ...dataTableRecipes.bodyRow({
                        selected: Boolean(isSelected),
                        clickable: isClickable,
                      }),
                    }}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const cellContent = flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      );
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
                          <div style={dataTableRecipes.magnitudeCell}>
                            <span style={dataTableRecipes.magnitudeValue}>
                              {cellContent}
                            </span>
                            <Progress.Root
                              value={percent}
                              min={0}
                              max={100}
                              style={dataTableRecipes.magnitudeProgressRoot}
                            >
                              <Progress.Track
                                style={dataTableRecipes.magnitudeProgressTrack}
                              >
                                <Progress.Range
                                  style={
                                    dataTableRecipes.magnitudeProgressRange
                                  }
                                />
                              </Progress.Track>
                              {valueText ? (
                                <span
                                  style={dataTableRecipes.magnitudeValueText}
                                >
                                  {valueText}
                                </span>
                              ) : hasValueTextResolver ? null : (
                                <Progress.ValueText
                                  style={dataTableRecipes.magnitudeValueText}
                                >
                                  {formatMagnitudeValueText(percent)}
                                </Progress.ValueText>
                              )}
                            </Progress.Root>
                          </div>
                        );
                      }

                      return (
                        <td key={cell.id} style={dataTableRecipes.bodyCell}>
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
