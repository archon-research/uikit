import { DataContext } from '@visx/xychart';
import {
  useContext,
  useState,
  type ComponentPropsWithoutRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';

import { resolveChartColor, type ChartColor } from './chart-color.js';
import { chartTokens } from './theme.js';

export type CursorSeries = {
  /**
   * Stable identity; defaults to the array index. Pass an explicit, stable
   * `id` when `series` can reorder — an index-based default re-attributes a
   * readout dot to the wrong series across renders otherwise.
   */
  id?: string;
  /**
   * Readout-dot color. Prefer a token name (`'chart.series.primary'`); a raw
   * CSS color string also works.
   */
  color: ChartColor;
  /** Series value at an x-domain stop, or `null` where the series has no point. */
  valueAt: (x: number) => number | null;
};

/** One readout point resolved at the active cursor stop. */
export type CursorPoint = {
  id: string;
  /**
   * The series' color as a ready-to-use CSS string — already resolved from its
   * `CursorSeries.color`, so a tooltip render prop can drop it straight into a
   * `style` without resolving anything itself.
   */
  color: string;
  /** Pixel y of the dot. */
  y: number;
  /** Series value at the stop. */
  value: number;
};

export type CursorTooltipContext = {
  /** The active x-domain stop. */
  x: number;
  /** Pixel x of the crosshair (absolute SVG coordinates). */
  left: number;
  /** Pixel y of the topmost readout dot, or the plot top when there are none. */
  top: number;
  points: CursorPoint[];
};

export type ChartCursorLayerProps = {
  /** Sorted x-domain values the cursor snaps to. */
  stops: number[];
  series: CursorSeries[];
  /** Controlled active x (an x-domain value). Omit for uncontrolled. */
  cursor?: number | null;
  /** Initial active x when uncontrolled. */
  defaultCursor?: number;
  onCursorChange?: (x: number | null) => void;
  /** Called when the cursor is committed via Enter/Space. */
  onCommit?: (x: number) => void;
  /** When true, Enter/Space also toggles a persistent pin (survives pointer-out). */
  pinnable?: boolean;
  /** Snap the pointer to the nearest `stop` (default true). */
  snap?: boolean;
  /** Enable keyboard control: focusable slider, arrows move, Enter/Space commit (default true). */
  keyboard?: boolean;
  /** Tooltip render prop, positioned at the cursor via a `<foreignObject>` overlay. */
  children?: (context: CursorTooltipContext) => ReactNode;
};

type XYChartDataContext = {
  xScale?: {
    (value: unknown): number | undefined;
    invert?: (value: number) => number;
  };
  yScale?: (value: number) => number | undefined;
  innerWidth?: number;
  innerHeight?: number;
  width?: number;
  height?: number;
  margin?: { top: number; left: number; right: number; bottom: number };
};

/** Clamp `value` into the closed `[min, max]` interval. */
function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/**
 * The `stop` in `stops` closest to `value` (nearest by absolute difference,
 * ties resolve to the lower stop). `stops` must be sorted ascending. Returns
 * `NaN` for an empty array. Exported for unit testing.
 */
export function nearestStop(stops: number[], value: number): number {
  const n = stops.length;
  if (n === 0) return NaN;
  if (value <= stops[0]!) return stops[0]!;
  if (value >= stops[n - 1]!) return stops[n - 1]!;

  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    const midValue = stops[mid]!;
    if (midValue === value) return midValue;
    if (midValue < value) lo = mid;
    else hi = mid;
  }
  return value - stops[lo]! <= stops[hi]! - value ? stops[lo]! : stops[hi]!;
}

export type CrosshairProps = {
  /** Pixel x of the crosshair (already resolved via `xScale`). */
  x: number;
  /** Pixel y of the plot top (`margin.top`). */
  top: number;
  /** Plot inner height (`innerHeight`) the line spans. */
  height: number;
} & Omit<ComponentPropsWithoutRef<'line'>, 'x1' | 'y1' | 'x2' | 'y2'>;

/**
 * A stateless, themed vertical crosshair line: the direct analog of the
 * themed standalone axes (`AxisBottom`/`AxisLeft`/...) for the crosshair mark
 * `ChartCursorLayer` draws internally. Unlike `ChartCursorLayer`, this has no
 * tooltip, no per-series readout dots, and no cursor state of its own — it
 * just draws one line at a pixel `x` the caller already resolved (from a
 * shared cursor position, e.g. `useSyncedCursor`), for a hand-composed chart
 * that only needs the crosshair line itself.
 */
export function Crosshair({
  x,
  top,
  height,
  stroke = chartTokens.axis,
  strokeWidth = 1,
  strokeDasharray = '3 3',
  pointerEvents = 'none',
  ...rest
}: CrosshairProps) {
  return (
    <line
      x1={x}
      y1={top}
      x2={x}
      y2={top + height}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeDasharray={strokeDasharray}
      pointerEvents={pointerEvents}
      {...rest}
    />
  );
}

/**
 * A snap-to-datum crosshair with per-series readout dots and a positioned
 * tooltip (via render prop), usable as a child of `<XYChart>`.
 *
 * Pointer moves over the plot snap to the nearest `stop` and draw a vertical
 * crosshair plus a dot per series; keyboard users get a focusable slider whose
 * arrows step between stops and whose Enter/Space commits (and optionally
 * pins) the cursor. Reads `xScale`/`yScale`/`margin`/inner size from
 * `DataContext`; keeps its own state so it does not touch the shared
 * interaction layer.
 */
export function ChartCursorLayer({
  stops,
  series,
  cursor,
  defaultCursor,
  onCursorChange,
  onCommit,
  pinnable = false,
  snap = true,
  keyboard = true,
  children,
}: ChartCursorLayerProps) {
  const {
    xScale,
    yScale,
    innerWidth = 0,
    innerHeight = 0,
    width = 0,
    height = 0,
    margin,
  } = useContext(DataContext) as XYChartDataContext;

  const isControlled = cursor !== undefined;
  const [internal, setInternal] = useState<number | null>(
    defaultCursor ?? null,
  );
  const [pinned, setPinned] = useState(false);

  const activeX = isControlled ? cursor : internal;

  const updateCursor = (next: number | null) => {
    if (!isControlled) setInternal(next);
    onCursorChange?.(next);
  };

  const commit = (value: number) => {
    onCommit?.(value);
    if (pinnable) setPinned((previous) => !previous);
  };

  if (!xScale || !yScale || !margin) return null;

  const left = margin.left;
  const top = margin.top;

  // Nearest stop to a pointer x. Uses `xScale.invert` when available (linear
  // scales); falls back to a pixel-space nearest scan for band scales, which
  // have no invert.
  const stopFromPixel = (svgX: number): number | null => {
    if (stops.length === 0) return null;
    if (typeof xScale.invert === 'function') {
      const domainX = xScale.invert(svgX);
      return snap ? nearestStop(stops, domainX) : domainX;
    }
    let best = stops[0]!;
    let bestDistance = Infinity;
    for (const stop of stops) {
      const px = xScale(stop);
      if (px === undefined) continue;
      const distance = Math.abs(px - svgX);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = stop;
      }
    }
    return best;
  };

  const indexOfActive =
    activeX == null
      ? -1
      : stops.indexOf(snap ? nearestStop(stops, activeX) : activeX);

  const defaultIndex =
    defaultCursor != null && stops.length > 0
      ? stops.indexOf(nearestStop(stops, defaultCursor))
      : 0;

  const moveBy = (delta: number) => {
    if (stops.length === 0) return;
    const base = indexOfActive >= 0 ? indexOfActive : defaultIndex;
    const nextIndex = clamp(base + delta, 0, stops.length - 1);
    updateCursor(stops[nextIndex]!);
  };

  const onKeyDown = (event: ReactKeyboardEvent<SVGRectElement>) => {
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        event.preventDefault();
        moveBy(-1);
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        event.preventDefault();
        moveBy(1);
        break;
      case 'Enter':
      case ' ': {
        event.preventDefault();
        const target =
          activeX ?? (stops.length > 0 ? stops[defaultIndex]! : null);
        if (target != null) {
          updateCursor(target);
          commit(target);
        }
        break;
      }
      default:
        break;
    }
  };

  // Resolve the drawable cursor. When snapping, the stored value is already a
  // stop; guard against a controlled value that is not a stop.
  const drawX =
    activeX == null ? null : snap ? nearestStop(stops, activeX) : activeX;

  const cx = drawX == null ? null : xScale(drawX);

  const points: CursorPoint[] =
    drawX == null || cx === undefined
      ? []
      : series.flatMap((entry, index) => {
          const value = entry.valueAt(drawX);
          if (value == null) return [];
          const py = yScale(value);
          if (py === undefined || !Number.isFinite(py)) return [];
          return [
            {
              id: entry.id ?? String(index),
              color: resolveChartColor(entry.color),
              y: py,
              value,
            },
          ];
        });

  const tooltipTop = points.length
    ? Math.min(...points.map((point) => point.y))
    : top;

  return (
    <g data-part="cursor-layer">
      {/* Transparent hit area over the plot; captures pointer + keyboard. */}
      <rect
        x={left}
        y={top}
        width={innerWidth}
        height={innerHeight}
        fill="transparent"
        style={{ cursor: 'crosshair', outline: 'none' }}
        tabIndex={keyboard ? 0 : undefined}
        role={keyboard ? 'slider' : undefined}
        aria-orientation={keyboard ? 'horizontal' : undefined}
        aria-valuemin={keyboard ? 0 : undefined}
        aria-valuemax={keyboard ? Math.max(0, stops.length - 1) : undefined}
        aria-valuenow={
          keyboard
            ? indexOfActive >= 0
              ? indexOfActive
              : undefined
            : undefined
        }
        aria-label={keyboard ? 'Chart cursor' : undefined}
        onKeyDown={keyboard ? onKeyDown : undefined}
        onPointerMove={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          const svgX = left + (event.clientX - bounds.left);
          updateCursor(stopFromPixel(svgX));
        }}
        onPointerLeave={() => {
          if (!pinned) updateCursor(null);
        }}
      />

      {cx !== undefined && cx !== null ? (
        <>
          <Crosshair x={cx} top={top} height={innerHeight} />
          {points.map((point) => (
            <circle
              key={point.id}
              cx={cx}
              cy={point.y}
              r={3.5}
              fill={point.color}
              stroke={chartTokens.surface}
              strokeWidth={1}
              pointerEvents="none"
            />
          ))}
          {children ? (
            <foreignObject
              x={0}
              y={0}
              width={width}
              height={height}
              pointerEvents="none"
              style={{ overflow: 'visible' }}
            >
              <div
                style={{ position: 'relative', width: '100%', height: '100%' }}
              >
                {children({
                  x: drawX!,
                  left: cx,
                  top: tooltipTop,
                  points,
                })}
              </div>
            </foreignObject>
          ) : null}
        </>
      ) : null}
    </g>
  );
}
