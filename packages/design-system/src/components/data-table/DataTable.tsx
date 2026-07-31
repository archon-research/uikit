import { Progress } from '@ark-ui/react/progress';
import {
  flexRender,
  type Column,
  type Row,
  type Table,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  useMemo,
  useRef,
  type CSSProperties,
  type ReactNode,
  type RefCallback,
} from 'react';

import { SkeletonRows } from '../SkeletonRows.js';
import { Select } from '../StyledSelect.js';
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

/** Estimated row height (px) per density, seeding the virtualizer before it
 * measures real rows. Only matters for the first paint / scrollbar size —
 * `measureElement` corrects it continuously afterward. */
const DEFAULT_ESTIMATED_ROW_HEIGHT: Record<DataTableDensity, number> = {
  comfortable: 52,
  compact: 34,
};

/** Fallback bound when `virtualized` is on but no `maxHeight` was given —
 * virtualization is meaningless without a bounded scroll viewport. */
const DEFAULT_VIRTUALIZED_MAX_HEIGHT = '640px';

type CellFlashDirection = 'positive' | 'critical' | 'neutral' | 'none';

type CellFlashEntry = {
  value: unknown;
  seq: number;
  direction: Exclude<CellFlashDirection, 'none'>;
};

/**
 * Delta-highlight class is only emitted while a cell is actively flashing;
 * `none` is the slot base (no animation).
 */
const flashClass = (direction: CellFlashDirection): string | false =>
  direction !== 'none' ? `dataTable__bodyCell--flash_${direction}` : false;

/**
 * Diffs a single displayed cell's raw value against the previous render and
 * returns a flash directive. Bounded to the cells actually rendered this pass
 * (visible/virtualized rows only), so cost is O(viewport) even with a
 * thousands-of-rows dataset. A first sighting of a row/column pair seeds the
 * map without flashing (avoids flashing on initial mount or newly-scrolled
 * rows). Once a cell has flashed, its direction is held steady across
 * unrelated re-renders (no new value) so the CSS animation — which fades out
 * on its own — is never cut off mid-fade by a class reset.
 */
function getCellFlashState(
  flashMap: Map<string, CellFlashEntry>,
  cellKey: string,
  rawValue: unknown,
): { seq: number; direction: CellFlashDirection } {
  const previous = flashMap.get(cellKey);

  if (previous === undefined) {
    flashMap.set(cellKey, { value: rawValue, seq: 0, direction: 'neutral' });
    return { seq: 0, direction: 'none' };
  }

  if (Object.is(previous.value, rawValue)) {
    return {
      seq: previous.seq,
      direction: previous.seq === 0 ? 'none' : previous.direction,
    };
  }

  const isNumericDelta =
    typeof previous.value === 'number' && typeof rawValue === 'number';
  const direction: Exclude<CellFlashDirection, 'none'> = isNumericDelta
    ? (rawValue as number) > (previous.value as number)
      ? 'positive'
      : 'critical'
    : 'neutral';
  const seq = previous.seq + 1;

  flashMap.set(cellKey, { value: rawValue, seq, direction });
  return { seq, direction };
}

/** Native-`<select>` faceted filter, populated from
 * `column.getFacetedUniqueValues()` (registered by `useDataTable`). Assumes
 * exact-value matching — give the column an explicit `filterFn` (e.g.
 * `'equalsString'`) since the table-wide auto default is a substring match. */
function FacetedColumnFilter<TData>({
  column,
}: {
  column: Column<TData, unknown>;
}) {
  const uniqueValues = column.getFacetedUniqueValues();
  const options = useMemo(
    () =>
      Array.from(uniqueValues.entries()).sort((a, b) =>
        String(a[0]).localeCompare(String(b[0])),
      ),
    [uniqueValues],
  );
  const currentValue = (column.getFilterValue() as string | undefined) ?? '';

  return (
    <Select
      value={currentValue}
      onChange={(event) =>
        column.setFilterValue(event.target.value || undefined)
      }
      className="dataTable__filterSelect"
      data-part="filter-select"
      aria-label={`Filter ${column.id}`}
    >
      <option value="">All</option>
      {options.map(([value, count]) => (
        <option key={String(value)} value={String(value)}>
          {String(value)} ({count})
        </option>
      ))}
    </Select>
  );
}

/** Free-text per-column filter input. */
function TextColumnFilter<TData>({
  column,
}: {
  column: Column<TData, unknown>;
}) {
  const currentValue = (column.getFilterValue() as string | undefined) ?? '';

  return (
    <input
      type="text"
      value={currentValue}
      onChange={(event) =>
        column.setFilterValue(event.target.value || undefined)
      }
      placeholder="Filter…"
      className="dataTable__filterInput"
      data-part="filter-input"
      aria-label={`Filter ${column.id}`}
    />
  );
}

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
  /**
   * Bounds the scroll container to this CSS height (e.g. `'480px'`) and turns
   * on vertical scrolling. Required (and defaulted if omitted) when
   * `virtualized` is set, since virtualization needs a bounded viewport to
   * compute a visible window; also usable standalone for a tall, non-virtual
   * table with a fixed viewport. Omit to keep the table's natural height
   * (unchanged default behavior).
   */
  maxHeight?: string;
  /**
   * Renders only the rows in (and around) the visible scroll window via
   * `@tanstack/react-virtual`, so a dataset of thousands of rows doesn't put
   * thousands of `<tr>`s in the DOM. Off by default (additive) — existing
   * consumers are unaffected. Requires a bounded viewport; `maxHeight`
   * defaults to `'640px'` if not supplied.
   */
  virtualized?: boolean;
  /** Seed row-height estimate (px) for the virtualizer, before it measures
   * real rendered rows. Defaults from `density`. Irrelevant unless
   * `virtualized` is set. */
  estimatedRowHeight?: number;
  /** Extra rows rendered above/below the visible window, to reduce blank
   * flashes on fast scroll. Defaults to 10. Irrelevant unless `virtualized`
   * is set. */
  overscan?: number;
  /**
   * Pins the header row to the top of the scroll container. Defaults to
   * `true` whenever the table is height-bounded (`maxHeight` is set), `false`
   * otherwise — a non-scrolling table has nothing for a sticky header to
   * float over.
   */
  stickyHeader?: boolean;
  /**
   * Briefly highlights a body cell whose value changed since the previous
   * render — a token-themed background flash that fades via CSS animation,
   * tinted by inferred direction (numeric increase → positive/green
   * background token, decrease → critical/red; any other change → neutral).
   * Off by default (additive/opt-in): diffing only runs, and only over the
   * cells actually rendered this pass, when this is `true`. NOTE: "increase"
   * is treated as "positive" purely by sign — it doesn't know whether a
   * larger number is actually good for a given row (e.g. a metric where a
   * higher value is actually worse, like an error count or latency).
   */
  flashOnUpdate?: boolean;
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
  maxHeight,
  virtualized = false,
  estimatedRowHeight,
  overscan = 10,
  stickyHeader,
  flashOnUpdate = false,
}: DataTableProps<TData>) {
  const magnitudeStateByColumn = createMagnitudeStateMap(table);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const flashMapRef = useRef<Map<string, CellFlashEntry>>(new Map());

  const resolvedMaxHeight =
    maxHeight ?? (virtualized ? DEFAULT_VIRTUALIZED_MAX_HEIGHT : undefined);
  const isScrollable = resolvedMaxHeight != null;
  const resolvedStickyHeader = stickyHeader ?? isScrollable;
  const resolvedEstimatedRowHeight =
    estimatedRowHeight ?? DEFAULT_ESTIMATED_ROW_HEIGHT[density];

  const rows = table.getRowModel().rows;
  const showSkeleton = isLoading && rows.length === 0;
  const leafColumnCount = table.getVisibleLeafColumns().length;

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => (virtualized ? scrollContainerRef.current : null),
    estimateSize: () => resolvedEstimatedRowHeight,
    overscan,
  });

  const virtualItems = virtualized ? rowVirtualizer.getVirtualItems() : [];
  const totalSize = virtualized ? rowVirtualizer.getTotalSize() : 0;
  const paddingTop =
    virtualized && virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualized && virtualItems.length > 0
      ? totalSize - virtualItems[virtualItems.length - 1].end
      : 0;

  // `minWidth`/`maxHeight` are consumer-supplied runtime dimensions (any CSS
  // length), not styling decisions, so they stay inline styles; everything
  // else is classes.
  const tableStyle: CSSProperties | undefined =
    minWidth != null ? { minWidth } : undefined;
  const rootStyle: CSSProperties | undefined =
    resolvedMaxHeight != null ? { maxHeight: resolvedMaxHeight } : undefined;

  const leafHeaders = table.getHeaderGroups().at(-1)?.headers ?? [];
  const hasFilterRow = leafHeaders.some(
    (header) =>
      header.column.columnDef.meta?.filterVariant != null &&
      header.column.getCanFilter(),
  );

  function renderBodyRow(
    row: Row<TData>,
    rowIndex: number,
    measureRef?: RefCallback<HTMLTableRowElement>,
  ) {
    const rowKey = getRowKey ? getRowKey(row.original) : String(row.id);
    const isSelected =
      selectedRowKey !== undefined && rowKey === selectedRowKey;
    const isClickable = onRowClick !== undefined;

    return (
      <tr
        key={rowKey}
        ref={measureRef}
        data-index={virtualized ? rowIndex : undefined}
        aria-selected={isSelected || undefined}
        tabIndex={isClickable ? 0 : undefined}
        onClick={isClickable ? () => onRowClick(row.original) : undefined}
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
            typeof rawValue === 'number' && Number.isFinite(rawValue);

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

          const flashState = flashOnUpdate
            ? getCellFlashState(
                flashMapRef.current,
                `${rowKey}:${cell.column.id}`,
                rawValue,
              )
            : { seq: 0, direction: 'none' as CellFlashDirection };

          return (
            <td
              key={
                flashOnUpdate && flashState.seq > 0
                  ? `${cell.id}:${flashState.seq}`
                  : cell.id
              }
              className={cx(
                'dataTable__bodyCell',
                alignClass('bodyCell', align),
                densityClass('bodyCell', density),
                isMono && 'dataTable__bodyCell--mono_true',
                flashOnUpdate && flashClass(flashState.direction),
              )}
              data-part="body-cell"
            >
              {renderCell ? renderCell(content) : content}
            </td>
          );
        })}
      </tr>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      className={cx(
        'dataTable__root',
        isScrollable && 'dataTable__root--scrollable_true',
        className,
      )}
      style={rootStyle}
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
                      resolvedStickyHeader &&
                        'dataTable__headerCell--stickyHeader_true',
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
          {hasFilterRow ? (
            <tr className="dataTable__filterRow" data-part="filter-row">
              {leafHeaders.map((header) => {
                const filterVariant =
                  header.column.columnDef.meta?.filterVariant;
                const canFilter = header.column.getCanFilter();

                return (
                  <th
                    key={header.id}
                    className="dataTable__filterCell"
                    data-part="filter-cell"
                  >
                    {canFilter && filterVariant === 'select' ? (
                      <FacetedColumnFilter column={header.column} />
                    ) : canFilter && filterVariant === 'text' ? (
                      <TextColumnFilter column={header.column} />
                    ) : null}
                  </th>
                );
              })}
            </tr>
          ) : null}
        </thead>
        <tbody>
          {showSkeleton
            ? SkeletonRows(skeletonConfig)
            : virtualized
              ? [
                  paddingTop > 0 ? (
                    <tr key="__virtual-padding-top" aria-hidden="true">
                      <td
                        aria-hidden="true"
                        colSpan={leafColumnCount}
                        style={{ height: paddingTop, padding: 0, border: 0 }}
                      />
                    </tr>
                  ) : null,
                  ...virtualItems.map((virtualItem) =>
                    renderBodyRow(
                      rows[virtualItem.index],
                      virtualItem.index,
                      rowVirtualizer.measureElement,
                    ),
                  ),
                  paddingBottom > 0 ? (
                    <tr key="__virtual-padding-bottom" aria-hidden="true">
                      <td
                        aria-hidden="true"
                        colSpan={leafColumnCount}
                        style={{
                          height: paddingBottom,
                          padding: 0,
                          border: 0,
                        }}
                      />
                    </tr>
                  ) : null,
                ]
              : rows.map((row, index) => renderBodyRow(row, index))}
        </tbody>
      </table>
    </div>
  );
}
