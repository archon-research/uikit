// The legend half of the emphasis system: `ChartLegend interactive` with the
// store wiring already done.
//
// `ChartLegend` deliberately takes plain `onHover`/`onToggle` callbacks and
// `hidden`/`emphasis` per item, so rendering and store-wiring stay separable.
// The cost of that is a loop every consumer wrote identically: hover ->
// `setHighlightedKey`, click -> `toggleKey`, then read both back and map them
// onto each item. This component is that loop, and nothing else — it renders
// through `ChartLegend`, so there is one legend implementation, not two.
import { useCallback, useMemo } from 'react';

import {
  useInteractionValue,
  useSetHighlightedKey,
  useToggleHiddenKey,
} from './interaction.js';
import { ChartLegend, type ChartLegendItem } from './legend.js';

export type SyncedChartLegendItem = ChartLegendItem & {
  /**
   * Set `false` to leave this item out of the sync: it renders and is still
   * clickable, but hovering it does not highlight anything and clicking it does
   * not hide anything.
   *
   * For the odd entry in an otherwise series-shaped legend — a threshold line,
   * a "shaded region = forecast" note — that has no series behind it, and would
   * otherwise dim every real series on hover by highlighting an id no mark
   * carries.
   */
  sync?: boolean;
};

export type SyncedChartLegendProps = {
  items: SyncedChartLegendItem[];
  /** Swatch shape, as `ChartLegend`. Defaults to a filled square. */
  shape?: 'swatch' | 'line';
  /** Render each label in its swatch color, as `ChartLegend`. Off by default. */
  colorLabel?: boolean;
  /**
   * Whether hovering an item highlights its series across the group. Default
   * `true`. Set `false` for a legend that should only toggle visibility.
   */
  hover?: boolean;
  /**
   * Whether clicking an item hides/shows its series across the group. Default
   * `true`. Set `false` for a hover-only legend.
   */
  toggle?: boolean;
};

/**
 * A `ChartLegend` bound to the surrounding `SyncedChartGroup`: hovering an item
 * highlights that series in every chart in the group, clicking it hides the
 * series everywhere, and both states are reflected back onto the item (dimmed +
 * struck-through when hidden, bolder when highlighted) with no wiring at the
 * call site.
 *
 * ```tsx
 * <SyncedChartGroup>
 *   <SyncedChartLegend
 *     shape="line"
 *     items={[
 *       { id: 'tvl', label: 'TVL', color: 'chart.series.primary' },
 *       { id: 'debt', label: 'Debt', color: 'chart.series.secondary' },
 *       { id: 'limit', label: 'Limit', color: 'chart.critical', sync: false },
 *     ]}
 *   />
 *   …charts wrapped in <EmphasisLayer> / <EmphasisSeries id="tvl"> …
 * </SyncedChartGroup>
 * ```
 *
 * The ids are the contract, and they are LOGICAL ids: `EmphasisSeries id="tvl"`
 * is what ties this item to a mark whose visx `dataKey` may be `tvl_usd` in one
 * chart and `tvl` in another. Nothing here ever sees a `dataKey`. An item with
 * no `id` falls back to its `label`, matching `ChartLegend`.
 *
 * A legend that is NOT about series — a color key for a categorical map, a
 * status ramp — should stay a plain `ChartLegend` (or pass `hover={false}`
 * here); a legend not backed by marks would otherwise dim every chart in the
 * group on hover. A single stray entry inside a series legend is the `sync:
 * false` case above.
 *
 * This component re-renders on hover, by design: it is a handful of DOM nodes
 * and it has to repaint to show its own state. The charts do not — see
 * `EmphasisLayer`, which applies the same state as a CSS change on mounted
 * nodes.
 */
export function SyncedChartLegend({
  items,
  shape = 'swatch',
  colorLabel = false,
  hover = true,
  toggle = true,
}: SyncedChartLegendProps) {
  const highlightedKey = useInteractionValue('highlightedKey');
  const hiddenKeys = useInteractionValue('hiddenKeys');
  const setHighlightedKey = useSetHighlightedKey();
  const toggleKey = useToggleHiddenKey();

  // Ids that must not drive the store, resolved once so the callbacks below
  // stay a set lookup rather than a scan of `items`.
  const unsynced = useMemo(
    () =>
      new Set(
        items
          .filter((item) => item.sync === false)
          .map((item) => item.id ?? item.label),
      ),
    [items],
  );

  const onHover = useCallback(
    (id: string | null) => {
      if (!hover) return;
      // A leave (`null`) always clears, even leaving an unsynced item: the
      // pointer may have crossed one on its way out of a synced one.
      if (id !== null && unsynced.has(id)) return;
      setHighlightedKey(id);
    },
    [hover, unsynced, setHighlightedKey],
  );

  const onToggle = useCallback(
    (id: string) => {
      if (!toggle || unsynced.has(id)) return;
      toggleKey(id);
    },
    [toggle, unsynced, toggleKey],
  );

  const resolved = useMemo(
    () =>
      items.map((item): ChartLegendItem => {
        const id = item.id ?? item.label;
        const synced = item.sync !== false;
        return {
          ...item,
          id,
          hidden: synced && hiddenKeys.has(id),
          emphasis: synced && highlightedKey === id,
        };
      }),
    [items, hiddenKeys, highlightedKey],
  );

  return (
    <ChartLegend
      items={resolved}
      shape={shape}
      colorLabel={colorLabel}
      interactive
      onHover={onHover}
      onToggle={onToggle}
    />
  );
}
