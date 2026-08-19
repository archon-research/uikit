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

import { resolveChartColor, type ChartColor } from './chart-color.js';

/** A closed timestamp interval, in epoch milliseconds. */
export interface TimeRange {
  start: number;
  end: number;
}

/** Stable empty set so an unchanged `hiddenKeys` keeps one identity (no churn). */
const EMPTY_HIDDEN_KEYS: ReadonlySet<string> = new Set();

export interface DashboardInteractionState {
  /** Time range selected via a brush gesture; `null` means "no selection, show everything". */
  timeRange: TimeRange | null;
  /** Timestamp under the pointer while hovering any synced chart; `null` when not hovering. */
  hoveredTimestamp: number | null;
  /** Free-form filter bag (e.g. `{ category: 'A' }`) so app-specific filters can layer on top. */
  filters: Record<string, unknown>;
  /** Series key emphasized across the group (e.g. from a legend hover). */
  highlightedKey: string | null;
  /**
   * Series keys toggled off across the group (e.g. click-to-hide in a legend).
   * The first-class partner to `highlightedKey`; a stable empty set when none
   * are hidden, so a consumer bound to it doesn't churn on unrelated updates.
   */
  hiddenKeys: ReadonlySet<string>;
}

/** One field of {@link DashboardInteractionState} — the unit `useInteractionValue` subscribes to. */
export type InteractionKey = keyof DashboardInteractionState;

/**
 * The stable set of writers for the shared interaction state. Carried in its
 * own context ({@link useInteractionDispatch}) whose identity never changes, so
 * a component that only *writes* (a legend, a filter control) can grab a setter
 * without subscribing to the state value and re-rendering on every cursor tick.
 */
export interface InteractionDispatch {
  setTimeRange: (range: TimeRange | null) => void;
  setHoveredTimestamp: (timestamp: number | null) => void;
  setFilter: (key: string, value: unknown) => void;
  clearFilter: (key: string) => void;
  setHighlightedKey: (key: string | null) => void;
  /** Replace the hidden-keys set (accepts any iterable of ids). */
  setHiddenKeys: (keys: Iterable<string>) => void;
  /** Toggle one key in/out of the hidden set. */
  toggleKey: (id: string) => void;
}

export interface DashboardInteractionApi
  extends DashboardInteractionState, InteractionDispatch {}

const DashboardInteractionContext =
  createContext<DashboardInteractionApi | null>(null);

/** Stable writers-only context — see {@link InteractionDispatch}. */
const InteractionDispatchContext = createContext<InteractionDispatch | null>(
  null,
);

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
  const [hiddenKeys, setHiddenKeysState] =
    useState<ReadonlySet<string>>(EMPTY_HIDDEN_KEYS);
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
    hiddenKeys: EMPTY_HIDDEN_KEYS,
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

  const setHiddenKeys = useCallback(
    (keys: Iterable<string>) => {
      const next = new Set(keys);
      const resolved: ReadonlySet<string> =
        next.size === 0 ? EMPTY_HIDDEN_KEYS : next;
      valuesRef.current.hiddenKeys = resolved;
      setHiddenKeysState(resolved);
      notify('hiddenKeys');
    },
    [notify],
  );

  const toggleKey = useCallback(
    (id: string) => {
      const previous = valuesRef.current.hiddenKeys;
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      const resolved: ReadonlySet<string> =
        next.size === 0 ? EMPTY_HIDDEN_KEYS : next;
      valuesRef.current.hiddenKeys = resolved;
      setHiddenKeysState(resolved);
      notify('hiddenKeys');
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

  // Stable-forever: every setter is a `useCallback` closing over refs only, so
  // this object's identity never changes across renders. That's what lets a
  // writer-only consumer read a setter without subscribing to state (no
  // re-render on cursor ticks).
  const dispatch = useMemo<InteractionDispatch>(
    () => ({
      setTimeRange,
      setHoveredTimestamp,
      setFilter,
      clearFilter,
      setHighlightedKey,
      setHiddenKeys,
      toggleKey,
    }),
    [
      setTimeRange,
      setHoveredTimestamp,
      setFilter,
      clearFilter,
      setHighlightedKey,
      setHiddenKeys,
      toggleKey,
    ],
  );

  const value = useMemo<DashboardInteractionApi>(
    () => ({
      timeRange,
      hoveredTimestamp,
      filters,
      highlightedKey,
      hiddenKeys,
      ...dispatch,
      subscribe,
    }),
    [
      timeRange,
      hoveredTimestamp,
      filters,
      highlightedKey,
      hiddenKeys,
      dispatch,
      subscribe,
    ],
  );

  return (
    <InteractionStoreContext.Provider value={store}>
      <InteractionDispatchContext.Provider value={dispatch}>
        <DashboardInteractionContext.Provider value={value}>
          {children}
        </DashboardInteractionContext.Provider>
      </InteractionDispatchContext.Provider>
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

/**
 * The stable writers-only dispatch (see {@link InteractionDispatch}). Its
 * identity never changes, so a component that only *writes* — a legend firing
 * hover/click, a filter control — can grab setters here WITHOUT subscribing to
 * the state value and re-rendering on every cursor tick. Use this (or the named
 * `useSet*` hooks below) for the setter half; use {@link useInteractionValue}
 * or the narrow selector hooks for the read half.
 */
export function useInteractionDispatch(): InteractionDispatch {
  const dispatch = useContext(InteractionDispatchContext);
  if (!dispatch) {
    throw new Error(
      'useInteractionDispatch must be used within a DashboardInteractionProvider (SyncedChartGroup provides one).',
    );
  }
  return dispatch;
}

/** Setter-only hook for the emphasized key — does not subscribe (no re-render on ticks). */
export function useSetHighlightedKey(): (key: string | null) => void {
  return useInteractionDispatch().setHighlightedKey;
}

/** Setter-only hook that replaces the hidden-keys set — does not subscribe. */
export function useSetHiddenKeys(): (keys: Iterable<string>) => void {
  return useInteractionDispatch().setHiddenKeys;
}

/** Setter-only hook that toggles one key in/out of the hidden set — does not subscribe. */
export function useToggleHiddenKey(): (id: string) => void {
  return useInteractionDispatch().toggleKey;
}

/** Setter-only hook for the synced cursor — does not subscribe (a broadcaster wants no ticks). */
export function useSetHoveredTimestamp(): (timestamp: number | null) => void {
  return useInteractionDispatch().setHoveredTimestamp;
}

/**
 * All stable interaction setters as one object — the discoverable, setter-first
 * name for {@link useInteractionDispatch} (same value; kept so a consumer
 * reaching for "the setters" finds them). Like the named `useSet*` hooks, it
 * does NOT subscribe, so a component that only writes — a legend, a cursor
 * broadcaster, a filter control — never re-renders on cursor ticks.
 *
 * Pair it with the READ path: {@link useInteractionValue} (or a narrow selector
 * hook), which is what anything rendered per pointer-move frame should use to
 * bind to exactly one field instead of the whole context.
 */
export function useInteractionSetters(): InteractionDispatch {
  return useInteractionDispatch();
}

/**
 * Narrow selector hook for the shared time range (e.g. set by a brush).
 * Per-key subscribed: re-renders only when `timeRange` changes, not on cursor
 * ticks. The setter is the stable dispatch setter.
 */
export function useSelectedTimeRange() {
  const timeRange = useInteractionValue('timeRange');
  return [timeRange, useInteractionDispatch().setTimeRange] as const;
}

/** Narrow selector hook for the synced-cursor timestamp (re-renders each tick, by nature). */
export function useHoveredTimestamp() {
  const hoveredTimestamp = useInteractionValue('hoveredTimestamp');
  return [
    hoveredTimestamp,
    useInteractionDispatch().setHoveredTimestamp,
  ] as const;
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
  const setHoveredTimestamp = useSetHoveredTimestamp();

  const subscribe = useCallback(
    (callback: (timestamp: number | null) => void) =>
      store.subscribe('hoveredTimestamp', () => {
        callback(store.getSnapshot('hoveredTimestamp') as number | null);
      }),
    [store],
  );

  return { timestamp, set: setHoveredTimestamp, subscribe };
}

/**
 * Narrow selector hook for the emphasized series key. Per-key subscribed, so it
 * re-renders only when `highlightedKey` changes — NOT on every cursor tick
 * (unlike reading the whole context via `useDashboardInteraction`).
 */
export function useHighlightedKey() {
  const highlightedKey = useInteractionValue('highlightedKey');
  return [highlightedKey, useInteractionDispatch().setHighlightedKey] as const;
}

/**
 * Narrow selector hook for the hidden-keys set (click-to-hide across the group),
 * returning `[hiddenKeys, toggle]` — the first-class partner to
 * {@link useHighlightedKey}. Per-key subscribed. Use {@link useSetHiddenKeys}
 * for a bulk replace.
 */
export function useHiddenKeys() {
  const hiddenKeys = useInteractionValue('hiddenKeys');
  return [hiddenKeys, useInteractionDispatch().toggleKey] as const;
}

/** Narrow selector hook for one named filter in the shared filter bag. */
export function useDashboardFilter(key: string) {
  const filters = useInteractionValue('filters');
  const { setFilter, clearFilter } = useInteractionDispatch();
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
 *
 * Reads the cursor setter via the stable dispatch (not the subscribing
 * context), so wiring a chart up with this — the documented path — does NOT
 * re-render it on every cursor tick it publishes.
 */
export function useSyncedCursorHandlers<Datum>(
  xAccessor: (datum: Datum) => number,
) {
  const setHoveredTimestamp = useSetHoveredTimestamp();

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
  fill = 'chart.series.primary',
}: {
  livePx: PixelRange | null;
  committedPx: PixelRange | null;
  /**
   * Selection-band fill. Defaults to `chart.series.primary`. Prefer a token
   * name; a raw CSS color string also works.
   */
  fill?: ChartColor;
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
      fill={resolveChartColor(fill)}
      fillOpacity={0.15}
      pointerEvents="none"
    />
  );
}
