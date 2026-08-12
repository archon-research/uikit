import { DataContext, EventEmitterProvider } from '@visx/xychart';
// Shared cross-chart interaction layer (cross-filter + synced cursor).
//
// Each `<XYChart>` is otherwise an isolated island: visx's `DataProvider`,
// `EventEmitterProvider`, and `TooltipProvider` are internal to a single chart
// unless a shared instance is placed above it in context. `SyncedChartGroup`
// supplies that shared `EventEmitterProvider` (a mitt bus @visx/xychart already
// depends on) alongside an app-level `DashboardInteractionProvider` so a stack
// of charts - and any non-chart widget (a list row, a status strip) - can
// read and drive one shared selection state. A separate per-key store (see
// `useInteractionValue`) lets a widget subscribe to exactly one field of
// that state, so a hover-frequency field (`hoveredTimestamp`) does not
// re-render widgets bound to an unrelated field (`highlightedKey`).
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
  useSyncExternalStore,
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

/** One field of {@link DashboardInteractionState} — the unit `useInteractionValue` subscribes to. */
export type InteractionKey = keyof DashboardInteractionState;

export interface DashboardInteractionApi extends DashboardInteractionState {
  setTimeRange: (range: TimeRange | null) => void;
  setHoveredTimestamp: (timestamp: number | null) => void;
  setFilter: (key: string, value: unknown) => void;
  clearFilter: (key: string) => void;
  setHighlightedKey: (key: string | null) => void;
  /**
   * Per-key change subscription backing {@link useInteractionValue}. Reach
   * for it directly only if you need a bespoke `useSyncExternalStore`
   * consumer; the intended entry point is `useInteractionValue`, not this
   * field. Optional so a hand-rolled `DashboardInteractionApi` (e.g. in a
   * test) that only implements the plain read/write contract stays valid;
   * `useInteractionValue` reads the separate {@link InteractionStore} the
   * provider installs (not this field), so omitting it here doesn't affect it.
   */
  subscribe?: (key: InteractionKey, onChange: () => void) => () => void;
}

const DashboardInteractionContext =
  createContext<DashboardInteractionApi | null>(null);

/**
 * Stable per-key store surface, carried in its own context so subscribing to
 * it does not also subscribe to {@link DashboardInteractionContext}'s value
 * (which changes identity on every `hoveredTimestamp` update — see the
 * "hover-perf" note on {@link DashboardInteractionProvider}). The object
 * itself never changes identity across renders of the provider: `subscribe`
 * and `getSnapshot` both close over refs, not state, so React's context
 * bailout (same value in, no re-render out) keeps consumers of *this*
 * context from re-rendering when the provider re-renders for an unrelated
 * reason.
 */
interface InteractionStore {
  subscribe: (key: InteractionKey, onChange: () => void) => () => void;
  getSnapshot: (
    key: InteractionKey,
  ) => DashboardInteractionState[InteractionKey];
}

const InteractionStoreContext = createContext<InteractionStore | null>(null);

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
  const [timeRange, setTimeRangeState] = useState<TimeRange | null>(null);
  const [hoveredTimestamp, setHoveredTimestampState] = useState<number | null>(
    null,
  );
  const [filters, setFiltersState] = useState<Record<string, unknown>>({});
  const [highlightedKey, setHighlightedKeyState] = useState<string | null>(
    null,
  );

  // The per-key store lives OUTSIDE React state on purpose. `valuesRef` is
  // updated synchronously by every setter below (not just on commit), so a
  // subscriber notified mid-event-handler always reads the fresh value —
  // no waiting for this component's own re-render to land first. The
  // `useState` above stays the source of truth for `DashboardInteractionApi`
  // (full backward compatibility: existing consumers of
  // `useDashboardInteraction`/the narrow selector hooks keep re-rendering on
  // every change, exactly as before); `valuesRef` mirrors it for
  // `useInteractionValue`'s per-key reads only.
  const valuesRef = useRef<DashboardInteractionState>({
    timeRange: null,
    hoveredTimestamp: null,
    filters: {},
    highlightedKey: null,
  });
  const listenersRef = useRef<Map<InteractionKey, Set<() => void>> | null>(
    null,
  );
  if (!listenersRef.current) listenersRef.current = new Map();

  const notify = useCallback((key: InteractionKey) => {
    for (const listener of listenersRef.current?.get(key) ?? []) listener();
  }, []);

  // Stable forever: closes over refs only, never over `timeRange` /
  // `hoveredTimestamp` / etc, so its identity survives every state update
  // above. That stability is what lets `InteractionStoreContext` skip
  // re-rendering its consumers when this provider re-renders for an
  // unrelated field (see the type's doc comment).
  const subscribe = useCallback((key: InteractionKey, onChange: () => void) => {
    const listeners = listenersRef.current!;
    let set = listeners.get(key);
    if (!set) {
      set = new Set();
      listeners.set(key, set);
    }
    set.add(onChange);
    return () => {
      set!.delete(onChange);
    };
  }, []);

  const getSnapshot = useCallback(
    (key: InteractionKey) => valuesRef.current[key],
    [],
  );

  const setTimeRange = useCallback(
    (range: TimeRange | null) => {
      valuesRef.current.timeRange = range;
      setTimeRangeState(range);
      notify('timeRange');
    },
    [notify],
  );

  const setHoveredTimestamp = useCallback(
    (timestamp: number | null) => {
      valuesRef.current.hoveredTimestamp = timestamp;
      setHoveredTimestampState(timestamp);
      notify('hoveredTimestamp');
    },
    [notify],
  );

  const setHighlightedKey = useCallback(
    (key: string | null) => {
      valuesRef.current.highlightedKey = key;
      setHighlightedKeyState(key);
      notify('highlightedKey');
    },
    [notify],
  );

  const setFilter = useCallback(
    (key: string, value: unknown) => {
      const previous = valuesRef.current.filters;
      if (Object.is(previous[key], value)) return;
      const next = { ...previous, [key]: value };
      valuesRef.current.filters = next;
      setFiltersState(next);
      notify('filters');
    },
    [notify],
  );

  const clearFilter = useCallback(
    (key: string) => {
      const previous = valuesRef.current.filters;
      if (!(key in previous)) return;
      const next = { ...previous };
      delete next[key];
      valuesRef.current.filters = next;
      setFiltersState(next);
      notify('filters');
    },
    [notify],
  );

  const store = useMemo<InteractionStore>(
    () => ({ subscribe, getSnapshot }),
    [subscribe, getSnapshot],
  );

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
      subscribe,
    }),
    [
      timeRange,
      hoveredTimestamp,
      filters,
      highlightedKey,
      setTimeRange,
      setHoveredTimestamp,
      setFilter,
      clearFilter,
      setHighlightedKey,
      subscribe,
    ],
  );

  return (
    <InteractionStoreContext.Provider value={store}>
      <DashboardInteractionContext.Provider value={value}>
        {children}
      </DashboardInteractionContext.Provider>
    </InteractionStoreContext.Provider>
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

/**
 * Reads exactly one field of {@link DashboardInteractionState}, re-rendering
 * only when THAT field changes — unlike `useDashboardInteraction` and the
 * narrow selector hooks below it (`useHoveredTimestamp`, `useHighlightedKey`,
 * etc.), which all read from the same `DashboardInteractionContext` value and
 * so all re-render on every change to ANY field (most consequentially,
 * `hoveredTimestamp`, which updates at pointer-move frequency).
 *
 * Reach for this in a widget that only cares about one field — e.g. a
 * legend or filter chip bound to `highlightedKey` — so it does not re-render
 * on every hover tick over a synced chart. Built on `useSyncExternalStore`
 * against the provider's per-key store (see `DashboardInteractionProvider`).
 * Requires a provider: it throws if used outside one (a `SyncedChartGroup`
 * provides one). So interactivity is an explicit `DashboardInteractionProvider`
 * dependency — a component that reads interaction state can't be dropped into a
 * plain, provider-less tree and silently degrade; wire it under a provider (or
 * gate the store read behind an `interactive` flag) rather than relying on a
 * fallback that does not exist.
 */
export function useInteractionValue<K extends InteractionKey>(
  key: K,
): DashboardInteractionState[K] {
  const store = useContext(InteractionStoreContext);
  if (!store) {
    throw new Error(
      'useInteractionValue must be used within a DashboardInteractionProvider (SyncedChartGroup provides one).',
    );
  }

  const subscribeToKey = useCallback(
    (onChange: () => void) => store.subscribe(key, onChange),
    [store, key],
  );

  const getSnapshot = useCallback(
    () => store.getSnapshot(key) as DashboardInteractionState[K],
    [store, key],
  );

  return useSyncExternalStore(subscribeToKey, getSnapshot, getSnapshot);
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

/**
 * Supported way for a FOREIGN chart — one not built on `@visx/xychart` (raw
 * SVG, canvas, WebGL) — to READ and BROADCAST the shared cursor timestamp
 * WITHOUT importing from `@visx/*` or hardcoding visx's internal
 * `'XYCHART_EVENT_SOURCE'` event-source string. It rides the same interaction
 * store every other synced widget uses:
 *
 * - `timestamp` — the reactive current value; re-renders the caller only when
 *   `hoveredTimestamp` changes (via {@link useInteractionValue}), not on every
 *   change to an unrelated field.
 * - `set` — publishes a new cursor timestamp to every synced panel (the
 *   context `setHoveredTimestamp`).
 * - `subscribe(cb)` — imperative, non-reactive subscription for a chart that
 *   paints outside React (canvas/WebGL) and wants to redraw its own crosshair
 *   on each change without re-rendering. `cb` receives the fresh value read
 *   straight from the store; the returned function unsubscribes.
 *
 * Note: visx `<XYChart>` panels in the same `SyncedChartGroup` should reflect
 * this shared cursor by rendering
 * `<ChartCursorLayer cursor={hoveredTimestamp} … />` — the in-SVG,
 * controllable crosshair — rather than relying on visx's internal tooltip
 * event bus. Then a foreign chart only needs to call `set(...)`, and every
 * panel (visx or not) reads the same timestamp.
 */
export function useSyncedCursor(): {
  timestamp: number | null;
  set: (timestamp: number | null) => void;
  subscribe: (callback: (timestamp: number | null) => void) => () => void;
} {
  const store = useContext(InteractionStoreContext);
  if (!store) {
    throw new Error(
      'useSyncedCursor must be used within a DashboardInteractionProvider (SyncedChartGroup provides one).',
    );
  }

  const timestamp = useInteractionValue('hoveredTimestamp');
  const { setHoveredTimestamp } = useDashboardInteraction();

  const subscribe = useCallback(
    (callback: (timestamp: number | null) => void) =>
      store.subscribe('hoveredTimestamp', () => {
        callback(store.getSnapshot('hoveredTimestamp') as number | null);
      }),
    [store],
  );

  return { timestamp, set: setHoveredTimestamp, subscribe };
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
