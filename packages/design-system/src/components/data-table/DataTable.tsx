import { Progress } from '@ark-ui/react/progress';
import {
  flexRender,
  type Column,
  type Row,
  type Table,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  Check,
  ChevronRight,
  Columns3,
  Copy,
  Maximize2,
  Minimize2,
  Pin,
  PinOff,
  Rows3,
  X,
} from 'lucide-react';
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefCallback,
} from 'react';

import { IS_DEV_WARNING_ENABLED } from '../../hooks/devWarning.js';
import { Popover } from '../Popover.js';
import { SearchInput } from '../SearchInput.js';
import { SkeletonRows } from '../SkeletonRows.js';
import { Select } from '../StyledSelect.js';
import {
  createMagnitudeStateMap,
  formatMagnitudeValueText,
  normalizeMagnitudeValue,
} from './magnitude.js';
import type { DataTableColumnAlign, DataTableDensity } from './types.js';
import { shouldWarnMissingGetRowId } from './utils.js';

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
  slot: 'headerCell' | 'bodyCell' | 'selectCell',
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

export type CellFlashDirection = 'positive' | 'critical' | 'neutral' | 'none';

type CellFlashEntry = {
  value: unknown;
  seq: number;
  direction: Exclude<CellFlashDirection, 'none'>;
};

/**
 * Delta-highlight class is only emitted while a cell is actively flashing;
 * `none` is the slot base (no animation). Exported (but not re-exported from
 * `index.ts`/the package root) so `DataTable.flash.test.ts` can exercise the
 * pure direction → class mapping without rendering.
 */
export const flashClass = (direction: CellFlashDirection): string | false =>
  direction !== 'none' ? `dataTable__bodyCell--flash_${direction}` : false;

/**
 * The two-phase (`flashOnUpdate="two-phase"`) sibling of `flashClass`, over
 * the recipe's `flashTwoPhase` variant. Reuses the same detected direction
 * (`getCellFlashState` doesn't know or care which flash mode is active) but
 * maps it onto the two-phase variant's own value names — `up`/`down` for an
 * inferred numeric increase/decrease, `neutral` for any other change (an
 * "unchanged-refresh").
 */
export const flashTwoPhaseClass = (
  direction: CellFlashDirection,
): string | false => {
  if (direction === 'none') return false;
  const value =
    direction === 'positive'
      ? 'up'
      : direction === 'critical'
        ? 'down'
        : 'neutral';
  return `dataTable__bodyCell--flashTwoPhase_${value}`;
};

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
export function getCellFlashState(
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

/**
 * The `pinned` slot-variant class, for a header/body cell whose column is
 * currently pinned. `'none'` is the slot base (no class emitted).
 */
const pinnedClass = (
  slot: 'headerCell' | 'bodyCell',
  pinned: 'left' | 'right' | false,
): string | false => (pinned ? `dataTable__${slot}--pinned_${pinned}` : false);

/**
 * Sticky pixel offset for a pinned column — the one part of pinning that's a
 * genuine runtime value (depends on the actual rendered widths of the
 * columns ahead of it), so it stays an inline style same as `minWidth`/
 * `maxHeight` elsewhere in this component; the recipe's `pinned` variant
 * supplies everything else (position/z-index/background/separator rule).
 */
function pinnedOffsetStyle<TData>(
  column: Column<TData, unknown>,
): CSSProperties {
  const pinned = column.getIsPinned();
  if (!pinned) return {};
  return {
    left: pinned === 'left' ? `${column.getStart('left')}px` : undefined,
    right: pinned === 'right' ? `${column.getAfter('right')}px` : undefined,
  };
}

export type DataTableProps<TData> = {
  table: Table<TData>;
  isLoading: boolean;
  onRowClick?: (row: TData) => void;
  getRowKey?: (row: TData) => string;
  selectedRowKey?: string | null;
  /**
   * Loading-skeleton shape. `columns` defaults to the table's real rendered
   * column count (visible leaf columns plus any expander/selection/actions
   * columns) so skeleton cells align with the header; `rows` defaults to 3.
   */
  skeletonConfig?: {
    rows?: number;
    columns?: number;
    firstColumnTall?: boolean;
    animate?: boolean;
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
   * render, tinted by inferred direction (numeric increase → up, decrease →
   * down; any other change → an "unchanged-refresh" neutral tint). Off by
   * default (additive/opt-in): diffing only runs, and only over the cells
   * actually rendered this pass, when this is set. NOTE: "increase" is
   * treated as "up" purely by sign — it doesn't know whether a larger number
   * is actually good for a given row (e.g. a metric where a higher value is
   * actually worse, like an error count or latency).
   *
   * - `true` — the original single ease-out fade (~1s), from a solid
   *   success/critical background token to transparent.
   * - `'two-phase'` — hold the tint at full strength (~400ms) then an
   *   independently-timed fade (~900ms), as an alpha-tinted (~16%) up/down
   *   background over the chart series positive/critical hue (12% of muted
   *   text for the neutral case) rather than a solid fill. Matches the
   *   two-phase flash shape a fast-moving blotter/ticker table wants, where
   *   a value can change again mid-fade.
   */
  flashOnUpdate?: boolean | 'two-phase';
  /**
   * Turns on the drag-to-reorder header affordance: drag a header to move
   * its column, backed by `table.setColumnOrder` (works whether
   * `useDataTable`'s `columnOrder` is controlled or left uncontrolled).
   * Off by default (additive/opt-in) — column ordering itself needs no
   * table-level enable flag in TanStack, so this is purely "does `DataTable`
   * render the drag handle", independent of `enableColumnResizing`/
   * `enableColumnPinning` below.
   */
  enableColumnReordering?: boolean;
  /**
   * Turns on the pin/unpin toggle button `DataTable` renders in each
   * pinnable header cell (`column.getCanPin()`). Off by default
   * (additive/opt-in). A column already pinned via controlled
   * `useDataTable({ columnPinning })` state renders sticky regardless of
   * this prop — it only gates the built-in toggle button, not the sticky
   * styling itself.
   */
  enableColumnPinning?: boolean;
  /**
   * Renders a toolbar strip above the table hosting the global search (when
   * enabled), the column-visibility menu / density / full-screen toggles you
   * opt into, a selection-count banner, and any `toolbarActions`. Off by
   * default (additive) — without it the table renders exactly as before.
   */
  toolbar?: boolean;
  /** Custom nodes at the end of the toolbar (e.g. an export/refresh button). */
  toolbarActions?: ReactNode;
  /** Placeholder for the toolbar's global-search input. */
  searchPlaceholder?: string;
  /** Show a column show/hide menu in the toolbar (needs `toolbar`). */
  enableColumnVisibility?: boolean;
  /** Show a comfortable/compact density toggle in the toolbar (needs `toolbar`). */
  enableDensityToggle?: boolean;
  /** Notified when the density toggle changes; density is otherwise internal, seeded from `density`. */
  onDensityChange?: (density: DataTableDensity) => void;
  /** Show a full-screen toggle in the toolbar (needs `toolbar`). */
  enableFullScreen?: boolean;
  /**
   * Renders a trailing actions column: `rowActions(row)` is placed in each
   * row's actions cell (inline buttons, or the consumer's own menu). Off by
   * default.
   */
  rowActions?: (row: TData) => ReactNode;
  /** Header content for the actions column (default: empty, aria-labelled). */
  rowActionsHeader?: ReactNode;
  /**
   * Renders an expandable detail panel beneath an expanded row (master/detail).
   * Providing it turns on a leading expander column; each row becomes its own
   * `<tbody>` so the virtualizer measures the row + its open panel as one unit.
   * Pair with `useDataTable({ getRowCanExpand })` to gate which rows expand, and
   * a stable `getRowId` so expansion survives reorders. Off by default.
   */
  renderDetailPanel?: (row: TData) => ReactNode;
};

type CopyStatus = 'idle' | 'copied' | 'failed' | 'unsupported';

const COPY_STATUS_LABEL: Record<CopyStatus, string> = {
  idle: 'Copy',
  copied: 'Copied',
  failed: 'Copy failed',
  unsupported: 'Copy unavailable',
};

/**
 * Copy-to-clipboard affordance for a `meta.copyable` cell. The success glyph
 * only shows once `navigator.clipboard.writeText` actually resolves — an
 * insecure context (or a user denying the permission) surfaces distinctly as
 * `'unsupported'`/`'failed'` rather than reporting success unconditionally.
 */
function CopyButton({ value }: { value: string }) {
  const [status, setStatus] = useState<CopyStatus>('idle');
  const resetAfterDelay = () => {
    window.setTimeout(() => setStatus('idle'), 1200);
  };
  return (
    <button
      type="button"
      className="dataTable__copyButton"
      data-part="copy-button"
      aria-label={COPY_STATUS_LABEL[status]}
      onClick={(event) => {
        event.stopPropagation();
        if (!navigator.clipboard) {
          setStatus('unsupported');
          resetAfterDelay();
          return;
        }
        navigator.clipboard.writeText(value).then(
          () => {
            setStatus('copied');
            resetAfterDelay();
          },
          () => {
            setStatus('failed');
            resetAfterDelay();
          },
        );
      }}
    >
      {status === 'copied' && <Check size={12} />}
      {(status === 'failed' || status === 'unsupported') && (
        <X size={12} color="var(--colors-text-critical, currentColor)" />
      )}
      {status === 'idle' && <Copy size={12} />}
    </button>
  );
}

/** Toolbar show/hide-columns menu (a popover of checkboxes over hideable columns). */
function ColumnVisibilityMenu<TData>({ table }: { table: Table<TData> }) {
  const columns = table
    .getAllLeafColumns()
    .filter((column) => column.getCanHide());
  if (columns.length === 0) return null;
  return (
    <Popover.Root positioning={{ placement: 'bottom-end' }}>
      <Popover.Trigger
        type="button"
        className="dataTable__iconButton"
        aria-label="Show or hide columns"
      >
        <Columns3 size={16} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner>
          <Popover.Content>
            {columns.map((column) => {
              const meta = column.columnDef.meta;
              const header = column.columnDef.header;
              const label =
                meta?.label ??
                (typeof header === 'string' ? header : column.id);
              return (
                <label
                  key={column.id}
                  className="dataTable__menuItem"
                  data-part="columns-menu-item"
                >
                  <input
                    type="checkbox"
                    checked={column.getIsVisible()}
                    onChange={column.getToggleVisibilityHandler()}
                  />
                  {label}
                </label>
              );
            })}
          </Popover.Content>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function DataTable<TData>({
  table,
  isLoading,
  onRowClick,
  getRowKey,
  selectedRowKey,
  skeletonConfig,
  renderCell,
  className,
  minWidth,
  density: densityProp = 'comfortable',
  maxHeight,
  virtualized = false,
  estimatedRowHeight,
  overscan = 10,
  stickyHeader,
  flashOnUpdate = false,
  enableColumnReordering = false,
  enableColumnPinning = false,
  toolbar = false,
  toolbarActions,
  searchPlaceholder,
  enableColumnVisibility = false,
  enableDensityToggle = false,
  onDensityChange,
  enableFullScreen = false,
  rowActions,
  rowActionsHeader,
  renderDetailPanel,
}: DataTableProps<TData>) {
  const expandable = renderDetailPanel != null;
  // Density is stateful (seeded from the prop) so the toolbar toggle can flip
  // it; `onDensityChange` lets a consumer observe/persist it.
  const [density, setDensity] = useState<DataTableDensity>(densityProp);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const toggleDensity = useCallback(() => {
    setDensity((current) => {
      const next = current === 'compact' ? 'comfortable' : 'compact';
      onDensityChange?.(next);
      return next;
    });
  }, [onDensityChange]);
  const actionsEnabled = rowActions != null;

  const magnitudeStateByColumn = createMagnitudeStateMap(table);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const flashMapRef = useRef<Map<string, CellFlashEntry>>(new Map());
  const [dragColumnId, setDragColumnId] = useState<string | null>(null);
  const [dropColumnId, setDropColumnId] = useState<string | null>(null);

  const resolvedMaxHeight =
    maxHeight ?? (virtualized ? DEFAULT_VIRTUALIZED_MAX_HEIGHT : undefined);
  const isScrollable = resolvedMaxHeight != null;
  const resolvedStickyHeader = stickyHeader ?? isScrollable;
  const resolvedEstimatedRowHeight =
    estimatedRowHeight ?? DEFAULT_ESTIMATED_ROW_HEIGHT[density];

  const rows = table.getRowModel().rows;
  const showSkeleton = isLoading && rows.length === 0;

  // `virtualized` without the table's `getRowId` configured means the
  // virtualizer's item keys and row-measurement cache (see `getItemKey`
  // below) key off array indices instead of row identity — silently broken
  // once data is prepended or reordered. Warns once, dev-only.
  const missingRowIdForVirtualizationWarned = useRef(false);
  if (
    IS_DEV_WARNING_ENABLED &&
    shouldWarnMissingGetRowId(
      virtualized,
      table.options.getRowId != null,
      missingRowIdForVirtualizationWarned.current,
    )
  ) {
    missingRowIdForVirtualizationWarned.current = true;
    console.warn(
      "[uikit] `DataTable` is `virtualized` without the table's `getRowId` " +
        "configured — the virtualizer's item keys and row-measurement cache " +
        'will key off array indices, which breaks when data is prepended or ' +
        'reordered. Pass `getRowId` to `useDataTable`.',
    );
  }

  // Column resizing/pinning read straight off the `table` instance's own
  // options/state rather than a parallel `DataTable` prop — the consumer
  // already declared these via `useDataTable`'s config, so `DataTable` just
  // renders what's actually wired up. Row selection follows the same
  // pattern below.
  const resizingEnabled = Boolean(table.options.enableColumnResizing);
  const columnPinningState = table.getState().columnPinning;
  const hasPinnedColumns =
    (columnPinningState?.left?.length ?? 0) > 0 ||
    (columnPinningState?.right?.length ?? 0) > 0;
  // `table-layout: fixed` is required for either a resize drag or a pinned
  // column's sticky offset to mean anything (see the recipe's `fixedLayout`
  // variant), so it turns on whenever either is in play — even if
  // `enableColumnPinning` (the toggle-button prop) is off but a consumer's
  // own controlled `columnPinning` state already pinned a column.
  const fixedLayout =
    resizingEnabled || enableColumnPinning || hasPinnedColumns;
  const rowSelectionEnabled = Boolean(table.options.enableRowSelection);
  const leafColumnCount =
    table.getVisibleLeafColumns().length +
    (expandable ? 1 : 0) +
    (rowSelectionEnabled ? 1 : 0) +
    (actionsEnabled ? 1 : 0);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => (virtualized ? scrollContainerRef.current : null),
    estimateSize: () => resolvedEstimatedRowHeight,
    overscan,
    // Key the virtual item (and thus the measure cache) off the row's id
    // rather than the array index, so prepending/reordering rows — or
    // expanding one — never re-attributes a measured height to a different
    // row. `row.id` is only actually stable when the caller supplied
    // `DataTableConfig.getRowId`; without it, TanStack's own id is
    // index-based, and this falls back to the same index either way (see the
    // dev warning above).
    getItemKey: (index) => rows[index]?.id ?? index,
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
  // else is classes. Column widths only become explicit pixel values when
  // `fixedLayout` is on — leaving them alone otherwise means an ordinary
  // table keeps its natural, content-driven widths (TanStack's per-column
  // default `size` of 150px would otherwise silently override every
  // existing consumer's layout).
  const tableStyle: CSSProperties | undefined = {
    ...(minWidth != null ? { minWidth } : undefined),
    ...(fixedLayout ? { width: table.getTotalSize() } : undefined),
  };
  const rootStyle: CSSProperties | undefined =
    resolvedMaxHeight != null ? { maxHeight: resolvedMaxHeight } : undefined;

  const leafHeaders = table.getHeaderGroups().at(-1)?.headers ?? [];
  const hasFilterRow = leafHeaders.some(
    (header) =>
      header.column.columnDef.meta?.filterVariant != null &&
      header.column.getCanFilter(),
  );

  // Column reorder is manual drag-and-drop over `table.setColumnOrder` —
  // TanStack ships no built-in header DnD. `handleDrop` seeds the order from
  // the table's current leaf-column order (whatever `columnOrder` resolves
  // to when empty) so the very first drag has something to splice.
  const handleColumnDrop = useCallback(
    (targetColumnId: string) => {
      table.setColumnOrder((current) => {
        const order =
          current.length > 0
            ? [...current]
            : table.getAllLeafColumns().map((column) => column.id);
        const from = order.indexOf(dragColumnId ?? '');
        const to = order.indexOf(targetColumnId);
        if (from < 0 || to < 0 || from === to) return current;
        order.splice(to, 0, order.splice(from, 1)[0] as string);
        return order;
      });
      setDragColumnId(null);
      setDropColumnId(null);
    },
    [dragColumnId, table],
  );

  function renderBodyRow(
    row: Row<TData>,
    rowIndex: number,
    measureRef?: RefCallback<HTMLTableSectionElement>,
  ) {
    const rowKey = getRowKey ? getRowKey(row.original) : String(row.id);
    const isSelected =
      selectedRowKey !== undefined && rowKey === selectedRowKey;
    const isClickable = onRowClick !== undefined;
    const isExpanded = expandable && row.getIsExpanded();

    return (
      // Each logical row is its own <tbody> so the virtualizer measures the row
      // and its (optional) open detail panel as a single unit; `data-index` +
      // `measureRef` live here rather than on the <tr>.
      <tbody
        key={rowKey}
        ref={measureRef}
        data-index={virtualized ? rowIndex : undefined}
        className="dataTable__rowGroup"
        data-part="row-group"
      >
        <tr
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
          {expandable ? (
            <td
              className={cx(
                'dataTable__expanderCell',
                densityClass('bodyCell', density),
              )}
              data-part="expander-cell"
              onClick={(event) => event.stopPropagation()}
            >
              {row.getCanExpand() ? (
                <button
                  type="button"
                  className="dataTable__expander"
                  data-part="expander"
                  data-expanded={isExpanded}
                  aria-expanded={isExpanded}
                  aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
                  onClick={row.getToggleExpandedHandler()}
                >
                  <ChevronRight size={14} />
                </button>
              ) : null}
            </td>
          ) : null}
          {rowSelectionEnabled ? (
            <td
              className={cx(
                'dataTable__selectCell',
                densityClass('selectCell', density),
              )}
              data-part="body-cell"
              onClick={(event) => event.stopPropagation()}
            >
              <input
                type="checkbox"
                aria-label={`Select row ${rowKey}`}
                disabled={!row.getCanSelect()}
                checked={row.getIsSelected()}
                onChange={row.getToggleSelectedHandler()}
              />
            </td>
          ) : null}
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

            if (cell.column.columnDef.meta?.copyable) {
              const copyText = cell.column.columnDef.meta.copyValue
                ? cell.column.columnDef.meta.copyValue(row.original)
                : String(rawValue ?? '');
              content = (
                <span
                  className="dataTable__cellCopyWrap"
                  data-part="cell-copy-wrap"
                >
                  {content}
                  <CopyButton value={copyText} />
                </span>
              );
            }

            const flashState = flashOnUpdate
              ? getCellFlashState(
                  flashMapRef.current,
                  `${rowKey}:${cell.column.id}`,
                  rawValue,
                )
              : { seq: 0, direction: 'none' as CellFlashDirection };

            const pinned = cell.column.getIsPinned();

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
                  flashOnUpdate &&
                    (flashOnUpdate === 'two-phase'
                      ? flashTwoPhaseClass(flashState.direction)
                      : flashClass(flashState.direction)),
                  pinnedClass('bodyCell', pinned),
                )}
                data-part="body-cell"
                style={{
                  ...(fixedLayout
                    ? { width: cell.column.getSize() }
                    : undefined),
                  ...pinnedOffsetStyle(cell.column),
                }}
              >
                {renderCell ? renderCell(content) : content}
              </td>
            );
          })}
          {actionsEnabled ? (
            <td
              className={cx(
                'dataTable__actionsCell',
                densityClass('bodyCell', density),
              )}
              data-part="actions-cell"
              onClick={(event) => event.stopPropagation()}
            >
              {rowActions?.(row.original)}
            </td>
          ) : null}
        </tr>
        {isExpanded && renderDetailPanel ? (
          <tr className="dataTable__detailRow" data-part="detail-row">
            <td
              className="dataTable__detailCell"
              data-part="detail-cell"
              colSpan={leafColumnCount}
            >
              {renderDetailPanel(row.original)}
            </td>
          </tr>
        ) : null}
      </tbody>
    );
  }

  const hasToolbar = toolbar;
  const searchable = Boolean(table.options.enableGlobalFilter);
  const globalFilter = (table.getState().globalFilter as string) ?? '';
  const selectedCount = table.getSelectedRowModel().rows.length;

  const tableRoot = (
    <div
      ref={scrollContainerRef}
      className={cx(
        'dataTable__root',
        isScrollable && 'dataTable__root--scrollable_true',
        className,
      )}
      // Square the top corners when a toolbar sits directly above, so the two
      // read as one joined container.
      style={
        hasToolbar
          ? { ...rootStyle, borderTopLeftRadius: 0, borderTopRightRadius: 0 }
          : rootStyle
      }
      data-scope="data-table"
      data-part="root"
      data-density={density}
    >
      <table
        className={cx(
          'dataTable__table',
          fixedLayout && 'dataTable__table--fixedLayout_true',
        )}
        data-part="table"
        style={tableStyle}
      >
        <thead>
          {table.getHeaderGroups().map((headerGroup, headerGroupIndex) => (
            <tr
              key={headerGroup.id}
              className="dataTable__headerRow"
              data-part="header-row"
            >
              {expandable && headerGroupIndex === 0 ? (
                <th
                  className={cx(
                    'dataTable__expanderCell',
                    'dataTable__headerCell',
                    densityClass('headerCell', density),
                    resolvedStickyHeader &&
                      'dataTable__headerCell--stickyHeader_true',
                  )}
                  data-part="header-cell"
                  aria-label="Expand column"
                />
              ) : null}
              {rowSelectionEnabled && headerGroupIndex === 0 ? (
                <th
                  className={cx(
                    'dataTable__selectCell',
                    densityClass('selectCell', density),
                    resolvedStickyHeader &&
                      'dataTable__selectCell--stickyHeader_true',
                  )}
                  data-part="header-cell"
                >
                  <input
                    type="checkbox"
                    aria-label="Select all rows"
                    checked={table.getIsAllRowsSelected()}
                    ref={(element) => {
                      if (element) {
                        element.indeterminate = table.getIsSomeRowsSelected();
                      }
                    }}
                    onChange={table.getToggleAllRowsSelectedHandler()}
                  />
                </th>
              ) : null}
              {headerGroup.headers.map((header) => {
                const sorted = header.column.getIsSorted();
                const canSort = header.column.getCanSort();
                const canResize =
                  resizingEnabled && header.column.getCanResize();
                const canPin = enableColumnPinning && header.column.getCanPin();
                const pinned = header.column.getIsPinned();
                const align = header.column.columnDef.meta?.align;
                const ariaSort = canSort
                  ? sorted === 'asc'
                    ? 'ascending'
                    : sorted === 'desc'
                      ? 'descending'
                      : 'none'
                  : undefined;
                const columnLabel = String(header.column.columnDef.header);
                const dragProps = enableColumnReordering
                  ? {
                      draggable: true,
                      onDragStart: () => setDragColumnId(header.column.id),
                      onDragEnd: () => {
                        setDragColumnId(null);
                        setDropColumnId(null);
                      },
                    }
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
                      pinnedClass('headerCell', pinned),
                      fixedLayout && 'dataTable__headerCell--fixedLayout_true',
                    )}
                    data-part="header-cell"
                    data-dragging={
                      enableColumnReordering &&
                      dragColumnId === header.column.id
                        ? 'true'
                        : undefined
                    }
                    data-drop-target={
                      enableColumnReordering &&
                      dropColumnId === header.column.id
                        ? 'true'
                        : undefined
                    }
                    style={{
                      ...(fixedLayout
                        ? { width: header.getSize() }
                        : undefined),
                      ...pinnedOffsetStyle(header.column),
                    }}
                    onDragOver={
                      enableColumnReordering
                        ? (event) => {
                            event.preventDefault();
                            setDropColumnId(header.column.id);
                          }
                        : undefined
                    }
                    onDrop={
                      enableColumnReordering
                        ? () => handleColumnDrop(header.column.id)
                        : undefined
                    }
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className="dataTable__headerInner"
                        data-part="header-inner"
                      >
                        {canSort ? (
                          <button
                            type="button"
                            onClick={header.column.getToggleSortingHandler()}
                            className="dataTable__headerButton"
                            data-part="header-button"
                            {...dragProps}
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
                          <span {...dragProps}>
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                          </span>
                        )}
                        {canPin ? (
                          <button
                            type="button"
                            className="dataTable__pinToggle"
                            data-part="pin-toggle"
                            data-pinned={pinned ? 'true' : 'false'}
                            aria-label={
                              pinned
                                ? `Unpin ${columnLabel}`
                                : `Pin ${columnLabel} left`
                            }
                            title={pinned ? 'Unpin column' : 'Pin column left'}
                            onClick={() =>
                              header.column.pin(pinned ? false : 'left')
                            }
                          >
                            {pinned ? <PinOff size={12} /> : <Pin size={12} />}
                          </button>
                        ) : null}
                      </div>
                    )}
                    {canResize ? (
                      <div
                        className="dataTable__resizeHandle"
                        data-part="resize-handle"
                        data-resizing={
                          header.column.getIsResizing() ? 'true' : undefined
                        }
                        role="separator"
                        aria-orientation="vertical"
                        aria-label={`Resize ${columnLabel}`}
                        tabIndex={0}
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        onKeyDown={(event) => {
                          // Arrow-key resizing for keyboard users, since the
                          // handle's drag gesture (pointer-only, straight from
                          // TanStack's own resize handler) has no keyboard
                          // equivalent otherwise. A fixed 10px step per press.
                          if (
                            event.key !== 'ArrowLeft' &&
                            event.key !== 'ArrowRight'
                          ) {
                            return;
                          }
                          event.preventDefault();
                          const delta = event.key === 'ArrowRight' ? 10 : -10;
                          table.setColumnSizing((current) => ({
                            ...current,
                            [header.column.id]: Math.max(
                              header.column.columnDef.minSize ?? 20,
                              Math.min(
                                header.column.columnDef.maxSize ??
                                  Number.MAX_SAFE_INTEGER,
                                header.column.getSize() + delta,
                              ),
                            ),
                          }));
                        }}
                      />
                    ) : null}
                  </th>
                );
              })}
              {actionsEnabled && headerGroupIndex === 0 ? (
                <th
                  className={cx(
                    'dataTable__actionsHeaderCell',
                    'dataTable__headerCell',
                    densityClass('headerCell', density),
                    resolvedStickyHeader &&
                      'dataTable__headerCell--stickyHeader_true',
                  )}
                  data-part="header-cell"
                  aria-label={
                    typeof rowActionsHeader === 'string'
                      ? rowActionsHeader
                      : 'Row actions'
                  }
                >
                  {rowActionsHeader}
                </th>
              ) : null}
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
        {/* Each logical row is its own <tbody> (see renderBodyRow), so skeleton
            and virtual-scroll spacers are their own <tbody>s too — no single
            wrapping <tbody> to nest them in. */}
        {showSkeleton ? (
          <tbody>
            <SkeletonRows
              rows={skeletonConfig?.rows ?? 3}
              columns={skeletonConfig?.columns ?? leafColumnCount}
              firstColumnTall={skeletonConfig?.firstColumnTall ?? true}
              animate={skeletonConfig?.animate}
            />
          </tbody>
        ) : virtualized ? (
          <>
            {paddingTop > 0 ? (
              <tbody aria-hidden="true">
                <tr>
                  <td
                    colSpan={leafColumnCount}
                    style={{ height: paddingTop, padding: 0, border: 0 }}
                  />
                </tr>
              </tbody>
            ) : null}
            {virtualItems.map((virtualItem) =>
              renderBodyRow(
                rows[virtualItem.index],
                virtualItem.index,
                rowVirtualizer.measureElement,
              ),
            )}
            {paddingBottom > 0 ? (
              <tbody aria-hidden="true">
                <tr>
                  <td
                    colSpan={leafColumnCount}
                    style={{ height: paddingBottom, padding: 0, border: 0 }}
                  />
                </tr>
              </tbody>
            ) : null}
          </>
        ) : (
          rows.map((row, index) => renderBodyRow(row, index))
        )}
      </table>
    </div>
  );

  // Without a toolbar the table renders exactly as before (no frame wrapper).
  if (!hasToolbar) return tableRoot;

  return (
    <div
      className={cx(
        'dataTable__frame',
        isFullScreen && 'dataTable__frame--fullScreen_true',
      )}
      data-scope="data-table"
      data-part="frame"
    >
      <div className="dataTable__toolbar" data-part="toolbar">
        {searchable ? (
          <div className="dataTable__toolbarSearch" data-part="toolbar-search">
            <SearchInput
              value={globalFilter}
              onValueChange={(next) => table.setGlobalFilter(next)}
              placeholder={searchPlaceholder}
            />
          </div>
        ) : null}
        <div
          className="dataTable__toolbarControls"
          data-part="toolbar-controls"
        >
          {toolbarActions}
          {enableColumnVisibility ? (
            <ColumnVisibilityMenu table={table} />
          ) : null}
          {enableDensityToggle ? (
            <button
              type="button"
              className="dataTable__iconButton"
              data-active={density === 'compact'}
              aria-pressed={density === 'compact'}
              aria-label="Toggle row density"
              onClick={toggleDensity}
            >
              <Rows3 size={16} />
            </button>
          ) : null}
          {enableFullScreen ? (
            <button
              type="button"
              className="dataTable__iconButton"
              data-active={isFullScreen}
              aria-pressed={isFullScreen}
              aria-label={isFullScreen ? 'Exit full screen' : 'Full screen'}
              onClick={() => setIsFullScreen((current) => !current)}
            >
              {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          ) : null}
        </div>
      </div>
      {rowSelectionEnabled && selectedCount > 0 ? (
        <div
          className="dataTable__selectionBanner"
          data-part="selection-banner"
        >
          <span>{selectedCount} selected</span>
          <button
            type="button"
            className="dataTable__iconButton"
            style={{ width: 'auto', paddingInline: '8px' }}
            onClick={() => table.resetRowSelection()}
          >
            Clear
          </button>
        </div>
      ) : null}
      {tableRoot}
    </div>
  );
}
