// Cross-chart emphasis, applied as CSS on already-mounted nodes.
//
// `highlightedKey`/`hiddenKeys` in the interaction store do nothing on their
// own: visx's `LineSeries`/`AreaSeries`/`BarSeries` have no emphasis notion, so
// every consumer that wanted "hover a legend item, dim the other series
// everywhere" hand-threaded a composed `strokeOpacity`/`fillOpacity` and a
// skip-render into each mark. That works and is wrong for one measured reason:
// it makes emphasis a RENDER. A legend hover then re-renders every wired chart
// (hundreds of nested SVG groups downstream), and under live streaming data
// that highlight render queues behind the per-tick re-renders — 1-2s from
// hover to dim.
//
// So emphasis here is not a render at all. `EmphasisSeries` wraps each mark in
// one stable `<g data-series="{id}">`, mounted once; `EmphasisLayer`
// subscribes to the store IMPERATIVELY (`useInteractionStore`, which does not
// re-render its caller) and, on each change, writes `data-dim`/`data-hidden`
// plus the matching `opacity`/`display` onto those existing nodes. A hover
// costs one attribute write per series and the compositor work to fade them;
// React is not involved, so the cost does not scale with how much chart is
// mounted, and a data tick mid-hover has nothing to queue behind.
//
// The same shape applies to anything else driven at pointer frequency (a
// tooltip readout, a canvas overlay): subscribe to the store imperatively,
// mutate the mounted node, never route it through render.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';

import { useInteractionStore } from './interaction.js';
import { useLatest } from './use-latest.js';

/** Opacity applied to series that are not the highlighted one. */
const DEFAULT_DIM_OPACITY = 0.18;
/** Fade duration for a dim/undim, in ms. */
const DEFAULT_TRANSITION_MS = 120;

/** The two store fields emphasis is a function of, read together. */
type EmphasisSnapshot = {
  highlightedKey: string | null;
  hiddenKeys: ReadonlySet<string>;
};

type EmphasisConfig = {
  dimOpacity: number;
  transitionMs: number;
};

/**
 * Writes `name` when `on`, removes it otherwise, and touches the DOM only when
 * the value actually changes — a hover over a 12-series group should not
 * produce 12 writes when it changes two.
 */
function setFlag(node: SVGElement, name: string, on: boolean): void {
  if (on) {
    if (node.getAttribute(name) !== 'true') node.setAttribute(name, 'true');
  } else if (node.hasAttribute(name)) {
    node.removeAttribute(name);
  }
}

/**
 * The whole emphasis mechanism, on one node: derive dim/hidden from the
 * snapshot and reflect it as attributes plus inline style.
 *
 * Both are written, and each earns its place. The attributes (`data-dim`,
 * `data-hidden`) are the styling contract — a consumer stylesheet can key off
 * them to do something other than fade (desaturate a heatmap, drop a glow) —
 * and they are what the tests assert on. The inline `opacity`/`display` is the
 * default rendering of that contract, so the primitive works with no stylesheet
 * shipped alongside it; this package renders inline SVG and owns no CSS file.
 *
 * `style` is written imperatively and `EmphasisSeries` passes no `style` prop,
 * so React has no previous value for these properties and never diffs them back
 * out from under us on an unrelated re-render.
 */
function applyEmphasis(
  node: SVGElement,
  { highlightedKey, hiddenKeys }: EmphasisSnapshot,
  { dimOpacity, transitionMs }: EmphasisConfig,
): void {
  const id = node.getAttribute('data-series');
  if (id === null) return;

  const hidden = hiddenKeys.has(id);
  // A hidden series is not also dimmed: it is gone, and `display: none` on a
  // node that is also mid-fade produces a flash when it comes back.
  const dim = !hidden && highlightedKey !== null && highlightedKey !== id;

  setFlag(node, 'data-hidden', hidden);
  setFlag(node, 'data-dim', dim);

  const transition = transitionMs > 0 ? `opacity ${transitionMs}ms ease` : '';
  if (node.style.transition !== transition) node.style.transition = transition;

  const display = hidden ? 'none' : '';
  if (node.style.display !== display) node.style.display = display;

  const opacity = dim ? String(dimOpacity) : '';
  if (node.style.opacity !== opacity) node.style.opacity = opacity;
}

/**
 * How a nested {@link EmphasisSeries} asks the enclosing layer to bring a node
 * it has just mounted up to date. Defaults to a no-op so an `EmphasisSeries`
 * outside a layer still renders its `data-series` hook (useful to a consumer
 * stylesheet) instead of throwing.
 */
const EmphasisApplyContext = createContext<(node: SVGElement) => void>(
  () => {},
);

export type EmphasisLayerProps = {
  children: ReactNode;
  /**
   * Opacity for series other than the highlighted one. Defaults to `0.18` —
   * low enough that the highlighted series reads as the only foreground
   * element, high enough that the dimmed ones still give it context.
   */
  dimOpacity?: number;
  /** Dim/undim fade duration in ms; `0` disables the transition. Defaults to `120`. */
  transitionMs?: number;
};

/**
 * Applies the group's `highlightedKey`/`hiddenKeys` to every
 * {@link EmphasisSeries} beneath it, as a CSS change on already-mounted nodes
 * rather than a re-render (see the note at the top of this file).
 *
 * Render it inside `<XYChart>` (it is a plain `<g>`, so it is also at home in a
 * hand-composed SVG chart) and wrap each mark in an `EmphasisSeries` carrying
 * the canonical series id:
 *
 * ```tsx
 * <SyncedChartGroup>
 *   <SyncedChartLegend items={items} shape="line" />
 *   <XYChart …>
 *     <EmphasisLayer>
 *       <EmphasisSeries id="tvl">
 *         <LineSeries dataKey="tvl_usd" … />
 *       </EmphasisSeries>
 *       <EmphasisSeries id="debt">
 *         <LineSeries dataKey="debt_usd" … />
 *       </EmphasisSeries>
 *       <DirectLabels labels={labels} />
 *     </EmphasisLayer>
 *   </XYChart>
 * </SyncedChartGroup>
 * ```
 *
 * Requires a `DashboardInteractionProvider` (a `SyncedChartGroup` is one): the
 * store read throws without one, rather than silently rendering a chart whose
 * legend does nothing.
 *
 * Stacked marks are the documented exception — see `EmphasisSeries`.
 */
export function EmphasisLayer({
  children,
  dimOpacity = DEFAULT_DIM_OPACITY,
  transitionMs = DEFAULT_TRANSITION_MS,
}: EmphasisLayerProps) {
  const store = useInteractionStore();
  const rootRef = useRef<SVGGElement | null>(null);
  // Read through a ref so changing `dimOpacity` does not change the identity of
  // the callbacks below — `applyToNode` is the context value every nested
  // `EmphasisSeries` depends on, and `applyToTree` is what the subscription
  // effect is keyed on.
  const configRef = useLatest<EmphasisConfig>({ dimOpacity, transitionMs });

  const applyToNode = useCallback(
    (node: SVGElement) => {
      applyEmphasis(
        node,
        {
          highlightedKey: store.get('highlightedKey'),
          hiddenKeys: store.get('hiddenKeys'),
        },
        configRef.current,
      );
    },
    [store, configRef],
  );

  const applyToTree = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    // One snapshot for the whole sweep: `get` is a ref read, but reading it
    // once also guarantees every node in this chart agrees on one state.
    const snapshot: EmphasisSnapshot = {
      highlightedKey: store.get('highlightedKey'),
      hiddenKeys: store.get('hiddenKeys'),
    };
    for (const node of root.querySelectorAll<SVGElement>('[data-series]')) {
      applyEmphasis(node, snapshot, configRef.current);
    }
  }, [store, configRef]);

  // The hot path: a legend hover lands here, not in React. `subscribe` is the
  // per-key store subscription WITHOUT `useSyncExternalStore`, so this
  // component — and therefore every mark under it — does not re-render.
  useEffect(() => {
    const unsubscribeHighlighted = store.subscribe(
      'highlightedKey',
      applyToTree,
    );
    const unsubscribeHidden = store.subscribe('hiddenKeys', applyToTree);
    return () => {
      unsubscribeHighlighted();
      unsubscribeHidden();
    };
  }, [store, applyToTree]);

  // Deliberately no dependency array: re-sweep after every render of this
  // layer. Emphasis lives on DOM nodes this component does not own, and a
  // re-render for an unrelated reason (a streaming data tick) can mount nodes
  // that carry `data-series` but were never mounted by an `EmphasisSeries` —
  // most obviously `DirectLabels`, which re-keys its `<text>` nodes as series
  // come and go. Those nodes would otherwise arrive un-dimmed mid-hover. The
  // sweep is a `querySelectorAll` over one chart's marks and writes only what
  // changed, so it costs approximately nothing on the renders that were
  // happening anyway — and note this is NOT the hover path, which never
  // re-renders this component at all.
  useEffect(() => {
    applyToTree();
  });

  return (
    <EmphasisApplyContext.Provider value={applyToNode}>
      <g ref={rootRef} data-part="emphasis-layer">
        {children}
      </g>
    </EmphasisApplyContext.Provider>
  );
}

export type EmphasisSeriesProps = {
  /**
   * Canonical, logical series id — the id the legend and the store speak, which
   * is NOT required to match the visx `dataKey` of the mark inside. That
   * indirection is the point: the same logical series is `tvl_usd` in one chart
   * and `tvl` in another, and this wrapper is where the two are reconciled, so
   * neither the legend nor the store ever learns a chart's local naming.
   *
   * Two wrappers may share an id (an upper and lower bound that emphasize as
   * one series), and one wrapper may hold several marks (a line plus its
   * glyphs).
   */
  id: string;
  children: ReactNode;
};

/**
 * Marks its children as one logical series for the enclosing
 * {@link EmphasisLayer}: renders a single stable `<g data-series="{id}">` whose
 * attributes and inline opacity the layer mutates directly.
 *
 * The `<g>` is inert — it adds no transform, no clip, and no pointer handling,
 * so a visx series inside it registers with `DataContext` and emits tooltip
 * events exactly as it does unwrapped (`XYChart` renders `children` as given;
 * it does not inspect or clone them).
 *
 * **Stacked marks are the exception.** `BarStack`/`AreaStack` read their own
 * children to build the stack, so a wrapper between them and their series
 * breaks the stack — and CSS could not fix it anyway: hiding one band of a
 * stack has to re-run the stack layout so the remaining bands re-fill to 100%,
 * which is a data change, not a style change. Filter the stack's children (or
 * its data) by `hiddenKeys` at the call site — `useHiddenKeys()` — and accept
 * the re-render; it is a click-frequency event, not a hover-frequency one. Put
 * `EmphasisLayer` around the stack to dim it as a whole if that reads well.
 */
export function EmphasisSeries({ id, children }: EmphasisSeriesProps) {
  const apply = useContext(EmphasisApplyContext);
  const nodeRef = useRef<SVGGElement | null>(null);

  // Catches up a node that mounts while a hover is already active — a series
  // that arrives with new streaming data, or a chart mounted into a group where
  // something is already highlighted or hidden.
  useEffect(() => {
    const node = nodeRef.current;
    if (node) apply(node);
  }, [apply, id]);

  return (
    <g ref={nodeRef} data-series={id}>
      {children}
    </g>
  );
}
