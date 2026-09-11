// The tooltip readout for a synced chart group, driven by the shared cursor
// instead of visx's event bus.
//
// `SyncedChartGroup` puts one `EventEmitterProvider` above every panel, which
// is what makes a visx `<Tooltip>` in one chart react to a hover in another.
// That is the feature, and at scale it is also the cost: one pointer move fans
// out to EVERY panel's `Tooltip`, and each one independently runs a
// nearest-datum lookup over its own series, updates its own tooltip context,
// and re-renders its own portal. N tooltip pipelines, all reacting to a single
// hover, N times per pointer move.
//
// This is the same hover routed the other way round. The pointer publishes ONE
// number to the interaction store (`hoveredTimestamp`); each panel resolves
// that number against its own data with ONE binary search (`snapToStop`) and
// writes the result onto nodes it has already mounted. Nothing fans out, and
// nothing re-renders: the subscription is `useInteractionStore()` — `get` and
// `subscribe` WITHOUT `useSyncExternalStore` — so a cursor move costs a
// handful of attribute and `textContent` writes per panel and never reaches
// React. It is the shape `EmphasisLayer` established for hover-frequency
// effects (see `emphasis.tsx`), applied to the readout.
//
// Additive on purpose: the bus is still there, and a panel using visx
// `<Tooltip>` is unaffected. Adopting this is a swap inside one chart body.
import { DataContext } from '@visx/xychart';
import {
  useCallback,
  useContext,
  useEffect,
  useRef,
  type CSSProperties,
} from 'react';

import { resolveChartColor } from './chart-color.js';
import { snapToStop } from './crosshair.js';
import type { CursorSeries } from './cursor-layer.js';
import { useInteractionStore } from './interaction.js';
import { chartTokens } from './theme.js';
import { useLatest } from './use-latest.js';

/**
 * One row of the readout. A superset of `ChartCursorLayer`'s
 * {@link CursorSeries}, so the SAME array can be handed to both when a chart
 * wants that layer's pointer/keyboard input as well as this readout.
 */
export type SyncedTooltipSeries = CursorSeries & {
  /** Row label, e.g. the series name as the legend says it. */
  label: string;
  /**
   * Value formatter for this row. Defaults to `String`, deliberately: number
   * formatting is locale and domain policy this package does not own (no mark
   * here formats a value either — `DirectLabels` takes a ready-made string).
   * Pass a formatter; the default is a legible fallback, not a house style.
   */
  format?: (value: number) => string;
};

export type SyncedTooltipProps = {
  /**
   * This chart's own sorted x-domain stops. The shared cursor is snapped to
   * the nearest one (a binary search) before any value is read, so a panel
   * sampled differently from the one being hovered still reads a real datum of
   * its own rather than interpolating.
   */
  stops: number[];
  series: SyncedTooltipSeries[];
  /** Formats the active stop for the card header. Defaults to `String`. */
  formatX?: (x: number) => string;
  /**
   * Also draw the crosshair line and the per-series readout dots (default
   * `true`). Set `false` when a `ChartCursorLayer` in the same chart already
   * draws them and this component is only wanted for the card.
   */
  marks?: boolean;
  /** Gap in px between the crosshair and the card. Defaults to `12`. */
  offset?: number;
};

type XYChartDataContext = {
  xScale?: (value: unknown) => number | undefined;
  yScale?: (value: number) => number | undefined;
  innerHeight?: number;
  width?: number;
  height?: number;
  margin?: { top: number; left: number; right: number; bottom: number };
};

/**
 * Every input the imperative update reads, snapshotted per render so the
 * effect that applies a cursor change depends on none of them.
 */
type TooltipInputs = {
  stops: number[];
  series: SyncedTooltipSeries[];
  formatX: (x: number) => string;
  marks: boolean;
  offset: number;
  context: XYChartDataContext;
};

const CARD_STYLE: CSSProperties = {
  position: 'absolute',
  // The resting state. Written here rather than in a mount effect so the card
  // is never painted at the origin on the way to being hidden; React keeps
  // this property at `'none'` across every re-render (the prop value never
  // changes, so its style diff writes nothing), leaving the imperative
  // `style.display` below the only thing that moves it.
  display: 'none',
  left: 0,
  top: 0,
  pointerEvents: 'none',
  boxSizing: 'border-box',
  padding: '6px 8px',
  borderRadius: 6,
  background: chartTokens.tooltipSurface,
  color: chartTokens.tooltipText,
  fontSize: 12,
  lineHeight: 1.4,
  whiteSpace: 'nowrap',
};

const HEADER_STYLE: CSSProperties = {
  opacity: 0.7,
  marginBottom: 2,
};

const ROW_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

const DOT_STYLE: CSSProperties = {
  display: 'inline-block',
  width: 8,
  height: 8,
  borderRadius: '50%',
  flex: 'none',
};

const VALUE_STYLE: CSSProperties = {
  marginLeft: 'auto',
  paddingLeft: 12,
  fontVariantNumeric: 'tabular-nums',
};

/**
 * Toggles `display` between `none` and `shown`, writing only when it differs so
 * a static readout writes nothing.
 *
 * `shown` is explicit, and has to be: these nodes carry a `display` in their
 * JSX `style` prop, and writing `''` here would delete it rather than restore
 * it — a row would lose its `flex` and React, seeing an unchanged style prop,
 * would never put it back. Pass the same value the prop declares.
 */
function setDisplay(
  node: { style: CSSStyleDeclaration },
  on: boolean,
  shown = '',
): void {
  const display = on ? shown : 'none';
  if (node.style.display !== display) node.style.display = display;
}

/** Indexes the nodes carrying `attribute` under `root` by that attribute's value. */
function byAttribute<T extends Element>(
  root: Element,
  attribute: string,
): Map<string, T> {
  const found = new Map<string, T>();
  for (const node of root.querySelectorAll<T>(`[${attribute}]`)) {
    found.set(node.getAttribute(attribute)!, node);
  }
  return found;
}

/**
 * A tooltip card (and, by default, a crosshair and per-series readout dots)
 * driven by the group's shared `hoveredTimestamp` rather than by visx's
 * tooltip event bus. Render it as a child of `<XYChart>`, inside a
 * `SyncedChartGroup`.
 *
 * The cursor itself still has to be published by whichever chart the pointer
 * is over — `useSyncedCursorHandlers(xAccessor)` on the `<XYChart>` is the
 * setter-only path and does not re-render the chart that publishes:
 *
 * ```tsx
 * function Panel({ data }: { data: Point[] }) {
 *   const handlers = useSyncedCursorHandlers<Point>((d) => d.t);
 *   return (
 *     <XYChart … {...handlers}>
 *       <LineSeries dataKey="tvl" data={data} … />
 *       <SyncedTooltip
 *         stops={STOPS}
 *         formatX={(t) => format(t)}
 *         series={[
 *           {
 *             id: 'tvl',
 *             label: 'TVL',
 *             color: 'chart.series.primary',
 *             valueAt: (t) => byTime.get(t) ?? null,
 *             format: (v) => usd(v),
 *           },
 *         ]}
 *       />
 *     </XYChart>
 *   );
 * }
 * ```
 *
 * Fifteen panels wired this way cost one binary search and a few DOM writes
 * each per pointer move, and zero renders — where fifteen visx `<Tooltip>`s on
 * the shared bus cost fifteen nearest-datum searches, fifteen tooltip-context
 * updates and fifteen portal re-renders.
 *
 * Rows for series in the group's `hiddenKeys` are dropped, as `DirectLabels`
 * drops their labels — the same imperative read, so hiding a series from the
 * legend does not re-render the readout either.
 *
 * This is output only: it captures no pointer or keyboard input. For keyboard
 * control of the cursor, keep one `ChartCursorLayer` (its focusable slider
 * publishing through `onCursorChange`) as the input surface.
 *
 * Requires a `DashboardInteractionProvider` (a `SyncedChartGroup` is one) and
 * a visx `DataContext` — i.e. it must be inside an `<XYChart>`.
 */
export function SyncedTooltip({
  stops,
  series,
  formatX = String,
  marks = true,
  offset = 12,
}: SyncedTooltipProps) {
  const store = useInteractionStore();
  const context = useContext(DataContext) as XYChartDataContext;

  const rootRef = useRef<SVGGElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const lineRef = useRef<SVGLineElement | null>(null);

  // Read through a ref so the subscription effect below depends on the store
  // alone: `series` and the formatters are fresh identities on every render of
  // the parent, and naming them would re-subscribe once per data tick.
  const inputsRef = useLatest<TooltipInputs>({
    stops,
    series,
    formatX,
    marks,
    offset,
    context,
  });

  const apply = useCallback(() => {
    const root = rootRef.current;
    const card = cardRef.current;
    if (!root || !card) return;

    const {
      stops: currentStops,
      series: currentSeries,
      formatX: formatHeader,
      offset: currentOffset,
      context: { xScale, yScale, margin, innerHeight = 0, width = 0 },
    } = inputsRef.current;

    const line = lineRef.current;
    const dots = byAttribute<SVGCircleElement>(root, 'data-readout-dot');
    const rows = byAttribute<HTMLElement>(card, 'data-readout-row');

    const hideAll = () => {
      setDisplay(card, false, 'block');
      if (line) setDisplay(line, false);
      for (const dot of dots.values()) setDisplay(dot, false);
    };

    const cursor = store.get('hoveredTimestamp');
    if (cursor == null || !xScale || !yScale || !margin) {
      hideAll();
      return;
    }

    // The per-chart binary search: this panel's own nearest stop, not the
    // pixel the pointer happened to be over in the panel that published.
    const x = snapToStop(currentStops, cursor);
    const cx = x === undefined ? undefined : xScale(x);
    if (x === undefined || cx === undefined || !Number.isFinite(cx)) {
      hideAll();
      return;
    }

    const hiddenKeys = store.get('hiddenKeys');
    let topY = Infinity;

    for (const [index, entry] of currentSeries.entries()) {
      const id = entry.id ?? String(index);
      const row = rows.get(id);
      const dot = dots.get(id);
      const value = hiddenKeys.has(id) ? null : entry.valueAt(x);
      const y = value == null ? undefined : yScale(value);
      const visible = value != null && y !== undefined && Number.isFinite(y);

      if (dot) {
        setDisplay(dot, visible);
        if (visible) {
          dot.setAttribute('cx', String(cx));
          dot.setAttribute('cy', String(y));
        }
      }
      if (row) {
        setDisplay(row, visible, 'flex');
        const valueNode = row.querySelector('[data-readout-value]');
        if (visible && valueNode) {
          valueNode.textContent = (entry.format ?? String)(value);
        }
      }
      if (visible) topY = Math.min(topY, y);
    }

    const header = card.querySelector('[data-readout-header]');
    if (header) header.textContent = formatHeader(x);

    if (line) {
      setDisplay(line, true);
      line.setAttribute('x1', String(cx));
      line.setAttribute('x2', String(cx));
      line.setAttribute('y1', String(margin.top));
      line.setAttribute('y2', String(margin.top + innerHeight));
    }

    setDisplay(card, true, 'block');
    card.style.left = `${cx}px`;
    card.style.top = `${Number.isFinite(topY) ? topY : margin.top}px`;
    // Flip to the other side of the crosshair rather than overflow the plot.
    // `offsetWidth` is 0 before the card has been laid out (and in jsdom),
    // which reads as "it fits" — the right answer for the first frame, and
    // self-correcting on the next move.
    const flip = cx + currentOffset + card.offsetWidth > width;
    card.style.transform = flip
      ? `translate(calc(-100% - ${currentOffset}px), -50%)`
      : `translate(${currentOffset}px, -50%)`;
  }, [store, inputsRef]);

  // The hot path: a pointer move lands here, not in React.
  useEffect(() => {
    const unsubscribeCursor = store.subscribe('hoveredTimestamp', apply);
    const unsubscribeHidden = store.subscribe('hiddenKeys', apply);
    return () => {
      unsubscribeCursor();
      unsubscribeHidden();
    };
  }, [store, apply]);

  // Deliberately no dependency array, as in `EmphasisLayer`: the readout is a
  // function of scales and data this component does not own, so a render that
  // moved the y-scale (a streaming tick, a resize) has to be reflected onto
  // nodes the cursor is not currently moving over. This is not the hover path
  // — it runs on renders that were happening anyway, and writes only what
  // changed.
  useEffect(() => {
    apply();
  });

  if (!context.xScale || !context.yScale || !context.margin) return null;

  const { width = 0, height = 0 } = context;

  return (
    <g ref={rootRef} data-part="synced-tooltip">
      {marks ? (
        <>
          <line
            ref={lineRef}
            style={{ display: 'none' }}
            stroke={chartTokens.axis}
            strokeWidth={1}
            strokeDasharray="3 3"
            pointerEvents="none"
          />
          {series.map((entry, index) => (
            <circle
              key={entry.id ?? String(index)}
              data-readout-dot={entry.id ?? String(index)}
              style={{ display: 'none' }}
              r={3.5}
              fill={resolveChartColor(entry.color)}
              stroke={chartTokens.surface}
              strokeWidth={1}
              pointerEvents="none"
            />
          ))}
        </>
      ) : null}
      <foreignObject
        x={0}
        y={0}
        width={width}
        height={height}
        pointerEvents="none"
        style={{ overflow: 'visible' }}
      >
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <div ref={cardRef} data-part="synced-tooltip-card" style={CARD_STYLE}>
            <div data-readout-header="" style={HEADER_STYLE} />
            {series.map((entry, index) => (
              <div
                key={entry.id ?? String(index)}
                data-readout-row={entry.id ?? String(index)}
                style={ROW_STYLE}
              >
                <span
                  style={{
                    ...DOT_STYLE,
                    background: resolveChartColor(entry.color),
                  }}
                />
                <span>{entry.label}</span>
                <span data-readout-value="" style={VALUE_STYLE} />
              </div>
            ))}
          </div>
        </div>
      </foreignObject>
    </g>
  );
}
