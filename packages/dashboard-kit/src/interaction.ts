import {
  useCallback,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

/**
 * The interaction surface a manifest's widgets read and write, addressed by
 * the free-form string keys a `WidgetNode.interaction.reads`/`writes` names.
 *
 * This is deliberately a small, transport-agnostic `{read, write, subscribe}`
 * contract rather than charting's concrete `DashboardInteractionApi` (which is
 * typed to a fixed set of keys: `timeRange`, `hoveredTimestamp`, `filters`,
 * `highlightedKey`). A manifest names its OWN vocabulary (`highlightedAsset`,
 * `selectedTimeRange`, ...); {@link module:charting-interaction} is the adapter
 * that maps that vocabulary onto charting's real per-key store. Keeping the
 * engine's contract generic is what lets a consumer back interaction with
 * charting, with their own store, or with the built-in local store below —
 * without the engine caring which.
 */
export type InteractionContextValue = {
  read: (key: string) => unknown;
  write: (key: string, value: unknown) => void;
  /**
   * Optional per-key change subscription. When present, widgets reach values
   * through {@link useInteractionField} rather than calling `read` during
   * render, so only the widgets bound to a changed key re-render — the same
   * hover-perf discipline charting's own per-key store enforces.
   */
  subscribe?: (key: string, onChange: () => void) => () => void;
};

type InteractionState = Record<string, unknown>;

/**
 * A self-contained interaction store backed by React state — the default the
 * renderer falls back to when no `interaction` prop is supplied. Correct and
 * cheap for a standalone manifest (a story, a preview) that isn't synced to a
 * live chart group; for chart-synced interaction, pass the adapter from
 * {@link module:charting-interaction} instead.
 */
export function useLocalInteraction(): InteractionContextValue {
  const [, setState] = useState<InteractionState>({});
  // Keep `read`/`write` identity-stable so the context value doesn't change
  // for reasons other than a real state change.
  const stateRef = useRef<InteractionState>({});

  const read = useCallback((key: string) => stateRef.current[key], []);
  const write = useCallback((key: string, value: unknown) => {
    if (Object.is(stateRef.current[key], value)) return;
    stateRef.current = { ...stateRef.current, [key]: value };
    setState(stateRef.current);
  }, []);

  return useMemo(() => ({ read, write }), [read, write]);
}

/**
 * Reads ONE interaction key, subscribing to just that key when the provider
 * supports it. `key` may be `undefined` (a widget that declares no
 * `interaction.reads`), in which case this is a no-op returning `undefined`.
 *
 * Named `useInteractionField` (not `useInteractionValue`) so a consumer file
 * can import both this and charting's own `useInteractionValue` without a name
 * collision.
 */
export function useInteractionField(
  interaction: InteractionContextValue,
  key: string | undefined,
): unknown {
  const { read, subscribe } = interaction;

  const subscribeToKey = useCallback(
    (onChange: () => void) => {
      if (!key || !subscribe) return () => {};
      return subscribe(key, onChange);
    },
    [key, subscribe],
  );

  const getSnapshot = useCallback(
    () => (key ? read(key) : undefined),
    [key, read],
  );

  return useSyncExternalStore(subscribeToKey, getSnapshot, getSnapshot);
}
