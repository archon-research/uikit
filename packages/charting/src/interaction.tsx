import { DataContext, EventEmitterProvider } from '@visx/xychart';
// Shared cross-chart interaction layer (cross-filter + synced cursor).
//
// Each `<XYChart>` is otherwise an isolated island: visx's `DataProvider`,
// `EventEmitterProvider`, and `TooltipProvider` are internal to a single chart
// unless a shared instance is placed above it in context. `SyncedChartGroup`
// supplies that shared `EventEmitterProvider` (a mitt bus @visx/xychart already
// depends on) alongside an app-level `DashboardInteractionProvider` so a stack
// of charts - and any non-chart widget (a list row, a status strip) - can
// read and drive one shared selection state.
//
// See packages/charting/DESIGN.md for the full contract and the governance
// note on why this lives here rather than a new package.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

/** A closed timestamp interval, in epoch milliseconds. */
export interface TimeRange {
  start: number;
  end: number;
}

export interface DashboardInteractionState {
  /** Time range selected via a brush gesture; `null` means "no selection, show everything". */
  timeRange: TimeRange | null;
  /** Timestamp under the pointer while hovering any synced chart; `null` when not hovering. */
  hoveredTimestamp: number | null;
  /** Free-form filter bag (e.g. `{ category: 'A' }`) so app-specific filters can layer on top. */
  filters: Record<string, unknown>;
  /** Series key emphasized across the group (e.g. from a legend hover). */
  highlightedKey: string | null;
}

export interface DashboardInteractionApi extends DashboardInteractionState {
  setTimeRange: (range: TimeRange | null) => void;
  setHoveredTimestamp: (timestamp: number | null) => void;
  setFilter: (key: string, value: unknown) => void;
  clearFilter: (key: string) => void;
  setHighlightedKey: (key: string | null) => void;
}

const DashboardInteractionContext =
  createContext<DashboardInteractionApi | null>(null);

/**
 * Owns the shared interaction state. Usually reached via `SyncedChartGroup`
 * rather than used directly, but exported so a non-chart-only dashboard shell
 * can provide it independently of the chart event bus.
 */
export function DashboardInteractionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [timeRange, setTimeRange] = useState<TimeRange | null>(null);
  const [hoveredTimestamp, setHoveredTimestamp] = useState<number | null>(null);
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const [highlightedKey, setHighlightedKey] = useState<string | null>(null);

  const setFilter = useCallback((key: string, value: unknown) => {
    setFilters((previous) => ({ ...previous, [key]: value }));
  }, []);

  const clearFilter = useCallback((key: string) => {
    setFilters((previous) => {
      if (!(key in previous)) return previous;
      const next = { ...previous };
      delete next[key];
      return next;
    });
  }, []);

  const value = useMemo<DashboardInteractionApi>(
    () => ({
      timeRange,
      hoveredTimestamp,
      filters,
      highlightedKey,
      setTimeRange,
      setHoveredTimestamp,
      setFilter,
      clearFilter,
      setHighlightedKey,
    }),
    [
      timeRange,
      hoveredTimestamp,
      filters,
      highlightedKey,
      setFilter,
      clearFilter,
    ],
  );

  return (
    <DashboardInteractionContext.Provider value={value}>
      {children}
    </DashboardInteractionContext.Provider>
  );
}

/** Full read/write access to the shared interaction state. */
export function useDashboardInteraction(): DashboardInteractionApi {
  const context = useContext(DashboardInteractionContext);
  if (!context) {
    throw new Error(
      'useDashboardInteraction must be used within a DashboardInteractionProvider (SyncedChartGroup provides one).',
    );
  }
  return context;
}

/** Narrow selector hook for the shared time range (e.g. set by a brush). */
export function useSelectedTimeRange() {
  const { timeRange, setTimeRange } = useDashboardInteraction();
  return [timeRange, setTimeRange] as const;
}

/** Narrow selector hook for the synced-cursor timestamp. */
export function useHoveredTimestamp() {
  const { hoveredTimestamp, setHoveredTimestamp } = useDashboardInteraction();
  return [hoveredTimestamp, setHoveredTimestamp] as const;
}

/** Narrow selector hook for the emphasized series key. */
export function useHighlightedKey() {
  const { highlightedKey, setHighlightedKey } = useDashboardInteraction();
  return [highlightedKey, setHighlightedKey] as const;
}

/** Narrow selector hook for one named filter in the shared filter bag. */
export function useDashboardFilter(key: string) {
  const { filters, setFilter, clearFilter } = useDashboardInteraction();
  const setValue = useCallback(
    (value: unknown) => setFilter(key, value),
    [setFilter, key],
  );
  const clear = useCallback(() => clearFilter(key), [clearFilter, key]);
  return [filters[key], setValue, clear] as const;
}

/**
 * Wraps a stack of charts (and any other interaction-aware widgets) in one
 * shared visx event bus and one shared `DashboardInteractionProvider`.
 *
 * All `<XYChart>` instances nested inside pick up the shared
 * `EventEmitterContext` automatically (visx's own `XYChart` only creates its
 * own `EventEmitterProvider` when one isn't already in context), so pointer
 * events from any panel are visible to every other panel's own `Tooltip` /
 * `DataContext`.
 *
 * Invariant: for the shared pixel-space cursor to land on the same timestamp
 * in every panel, every `<XYChart>` in the group must render at the same
 * `width`/`height`/`margin` and share the same x-domain.
 */
export function SyncedChartGroup({ children }: { children: ReactNode }) {
  return (
    <DashboardInteractionProvider>
      <EventEmitterProvider>{children}</EventEmitterProvider>
    </DashboardInteractionProvider>
  );
}

/**
 * Wires a single `<XYChart>`'s top-level pointer events to the shared
 * `hoveredTimestamp`, using the caller's own x-accessor to read a timestamp
 * off the nearest datum (no scale inversion needed). Spread the returned
 * handlers onto `<XYChart onPointerMove onPointerOut>`.
 */
export function useSyncedCursorHandlers<Datum>(
  xAccessor: (datum: Datum) => number,
) {
  const { setHoveredTimestamp } = useDashboardInteraction();

  // `params` is typed loosely (rather than `{ datum?: Datum }`) so this stays
  // assignable to `XYChart`'s `onPointerMove` prop, whose `Datum` generic
  // widens to `object` when the chart's series children don't drive
  // inference. The real datum shape is recovered via the caller's own
  // `xAccessor` immediately below.
  const onPointerMove = useCallback(
    (params: { datum?: unknown } | undefined) => {
      const datum = params?.datum;
      if (datum != null) setHoveredTimestamp(xAccessor(datum as Datum));
    },
    [xAccessor, setHoveredTimestamp],
  );

  const onPointerOut = useCallback(() => {
    setHoveredTimestamp(null);
  }, [setHoveredTimestamp]);

  return { onPointerMove, onPointerOut };
}

/** A pixel-space horizontal interval, in the enclosing chart's own SVG coordinates. */
export interface PixelRange {
  start: number;
  end: number;
}

/**
 * Tracks a drag-to-select gesture from an `<XYChart>`'s own pointer events
 * (`svgPoint` is already computed in that chart's local SVG coordinate
 * space, so no extra measurement is needed). Spread `onPointerDown` /
 * `onPointerMove` / `onPointerUp` onto the `<XYChart>` that should host the
 * brush, and render `<DragSelectionOverlay>` as a child of that same chart to
 * draw the selection band and publish the committed range.
 */
export function useTimeRangeBrushGesture() {
  const [livePx, setLivePx] = useState<PixelRange | null>(null);
  const [committedPx, setCommittedPx] = useState<PixelRange | null>(null);
  const draggingRef = useRef(false);

  const onPointerDown = useCallback(
    (params: { svgPoint?: { x: number } } | undefined) => {
      const x = params?.svgPoint?.x;
      if (x == null) return;
      draggingRef.current = true;
      setLivePx({ start: x, end: x });
    },
    [],
  );

  const onPointerMove = useCallback(
    (params: { svgPoint?: { x: number } } | undefined) => {
      if (!draggingRef.current) return;
      const x = params?.svgPoint?.x;
      if (x == null) return;
      setLivePx((previous) =>
        previous ? { start: previous.start, end: x } : { start: x, end: x },
      );
    },
    [],
  );

  const onPointerUp = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setLivePx((previous) => {
      if (previous && Math.abs(previous.end - previous.start) > 4) {
        setCommittedPx(previous);
      }
      return null;
    });
  }, []);

  return { livePx, committedPx, onPointerDown, onPointerMove, onPointerUp };
}

/**
 * Renders the live selection band for a `useTimeRangeBrushGesture` drag, and
 * publishes the committed pixel range to the shared `timeRange` once a drag
 * gesture completes, inverted through this chart's own `xScale`. Must be
 * rendered as a child of `<XYChart>` so it can read `DataContext`.
 */
export function DragSelectionOverlay({
  livePx,
  committedPx,
  fill = 'var(--colors-chart-series-primary, #155eef)',
}: {
  livePx: PixelRange | null;
  committedPx: PixelRange | null;
  fill?: string;
}) {
  const dataContext = useContext(DataContext);
  const { setTimeRange } = useDashboardInteraction();
  const lastCommittedRef = useRef<PixelRange | null>(null);

  useEffect(() => {
    if (!committedPx || committedPx === lastCommittedRef.current) return;
    lastCommittedRef.current = committedPx;
    const xScale = dataContext?.xScale as
      | { invert?: (value: number) => number }
      | undefined;
    if (typeof xScale?.invert !== 'function') return;
    const start = xScale.invert(Math.min(committedPx.start, committedPx.end));
    const end = xScale.invert(Math.max(committedPx.start, committedPx.end));
    if (Number.isFinite(start) && Number.isFinite(end)) {
      setTimeRange({ start, end });
    }
  }, [committedPx, dataContext, setTimeRange]);

  const margin = dataContext?.margin;
  const height = dataContext?.height ?? 0;
  if (!livePx || !margin) return null;

  const top = margin.top ?? 0;
  const bottom = height - (margin.bottom ?? 0);

  return (
    <rect
      x={Math.min(livePx.start, livePx.end)}
      y={top}
      width={Math.abs(livePx.end - livePx.start)}
      height={Math.max(bottom - top, 0)}
      fill={fill}
      fillOpacity={0.15}
      pointerEvents="none"
    />
  );
}
