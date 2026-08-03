import {
  useDashboardInteraction,
  type InteractionKey,
  type TimeRange,
} from '@archon-research/charting';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import type { InteractionContextValue } from './interaction.js';

/**
 * Adapts a manifest's free-form interaction vocabulary onto charting's REAL
 * per-key store (`DashboardInteractionProvider` / `useDashboardInteraction` /
 * `useInteractionValue`), so a declarative dashboard cross-filters the same
 * synced chart group a hand-built one would.
 *
 * The reconciliation this file owns: a manifest names keys in an FDC3-shaped
 * vocabulary (`highlightedAsset`, `selectedTimeRange`) while charting's store
 * is typed to `highlightedKey` / `timeRange` / `hoveredTimestamp`. The key map
 * below is the single, declared place that translation happens — not a rename
 * of either side. Consumers can pass their own map to extend the vocabulary.
 *
 * ── Why a bridge rather than calling `useDashboardInteraction` in each widget
 * Charting's `DashboardInteractionContext` value changes identity on every
 * pointer move (`hoveredTimestamp` lives in it), so anything that consumes it
 * re-renders at hover frequency. {@link InteractionSync} is the SOLE consumer:
 * a null-rendering component that republishes the mapped keys into a tiny
 * per-key store. A widget that declared `interaction.reads: ['highlightedAsset']`
 * then re-renders when the highlight changes and at no other time — matching
 * the discipline of charting's own `useInteractionValue`.
 */
export type InteractionKeyMap = Record<string, InteractionKey>;

/**
 * Default manifest-key -> charting-key aliases. Native charting keys map to
 * themselves so a manifest may also name them directly.
 */
export const DEFAULT_INTERACTION_KEY_MAP: InteractionKeyMap = {
  highlightedAsset: 'highlightedKey',
  highlightedKey: 'highlightedKey',
  selectedTimeRange: 'timeRange',
  timeRange: 'timeRange',
  hoveredTimestamp: 'hoveredTimestamp',
};

export type ChartingInteraction = {
  /** The generic surface to hand the renderer's `interaction` prop. */
  interaction: InteractionContextValue;
  /**
   * Render ONCE inside a `SyncedChartGroup` / `DashboardInteractionProvider`.
   * It renders nothing; it is the sole subscriber to the high-frequency
   * charting context and republishes the mapped keys into the per-key store
   * that {@link interaction} reads.
   */
  InteractionSync: () => null;
};

/**
 * Builds a charting-backed {@link InteractionContextValue}. Call it above a
 * `SyncedChartGroup`, hand `interaction` to `DashboardRenderer`, and render
 * `<InteractionSync />` inside the group.
 */
export function useChartingInteraction(
  keyMap: InteractionKeyMap = DEFAULT_INTERACTION_KEY_MAP,
): ChartingInteraction {
  const valuesRef = useRef(new Map<string, unknown>());
  const listenersRef = useRef(new Map<string, Set<() => void>>());
  const writerRef = useRef<(key: string, value: unknown) => void>(() => {});
  // Which charting key each manifest key resolves to — a ref so `interaction`
  // stays identity-stable even if the caller passes an inline map object.
  const keyMapRef = useRef(keyMap);
  keyMapRef.current = keyMap;

  const read = useCallback((key: string) => valuesRef.current.get(key), []);

  const write = useCallback((key: string, value: unknown) => {
    writerRef.current(key, value);
  }, []);

  const subscribe = useCallback((key: string, onChange: () => void) => {
    let listeners = listenersRef.current.get(key);
    if (!listeners) {
      listeners = new Set();
      listenersRef.current.set(key, listeners);
    }
    listeners.add(onChange);
    return () => {
      listeners.delete(onChange);
    };
  }, []);

  const publish = useCallback((key: string, value: unknown) => {
    if (Object.is(valuesRef.current.get(key), value)) return;
    valuesRef.current.set(key, value);
    for (const listener of listenersRef.current.get(key) ?? []) listener();
  }, []);

  const interaction = useMemo<InteractionContextValue>(
    () => ({ read, write, subscribe }),
    [read, write, subscribe],
  );

  // A stable component type, created once, so React never unmounts/remounts it
  // (and its charting subscription) across the dashboard's renders.
  const InteractionSync = useMemo(
    () =>
      function ChartingInteractionSync(): null {
        const chart = useDashboardInteraction();

        // Every manifest alias that resolves to `highlightedKey` gets the
        // charting value republished under it; likewise for the other keys.
        const aliasesFor = (chartingKey: InteractionKey): string[] =>
          Object.entries(keyMapRef.current)
            .filter(([, target]) => target === chartingKey)
            .map(([alias]) => alias);

        useEffect(() => {
          for (const alias of aliasesFor('highlightedKey')) {
            publish(alias, chart.highlightedKey ?? undefined);
          }
        }, [chart.highlightedKey]);
        useEffect(() => {
          for (const alias of aliasesFor('timeRange')) {
            publish(alias, chart.timeRange ?? undefined);
          }
        }, [chart.timeRange]);
        useEffect(() => {
          for (const alias of aliasesFor('hoveredTimestamp')) {
            publish(alias, chart.hoveredTimestamp ?? undefined);
          }
        }, [chart.hoveredTimestamp]);

        // The write side, held in a ref so `interaction.write` stays
        // identity-stable for every consumer.
        useEffect(() => {
          writerRef.current = (key: string, value: unknown) => {
            switch (keyMapRef.current[key]) {
              case 'highlightedKey':
                chart.setHighlightedKey(value == null ? null : String(value));
                return;
              case 'timeRange':
                chart.setTimeRange((value as TimeRange | null) ?? null);
                return;
              case 'hoveredTimestamp':
                chart.setHoveredTimestamp(value == null ? null : Number(value));
                return;
              default:
                return;
            }
          };
        }, [chart]);

        return null;
      },
    [publish],
  );

  return { interaction, InteractionSync };
}
