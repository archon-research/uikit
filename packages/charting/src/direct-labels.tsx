import { DataContext } from '@visx/xychart';
import { useContext } from 'react';

export type DirectLabelItem = {
  /** Stable identity; defaults to `label`. */
  id?: string;
  label: string;
  /** Y-data value the label points at (its ideal position). */
  value: number;
  /** Text color, usually the matching series color. */
  color: string;
};

export type DirectLabelsProps = {
  labels: DirectLabelItem[];
  /** Minimum vertical gap between adjacent labels, in px. */
  gap?: number;
  /** Horizontal offset from the plot's right edge, in px. */
  x?: number;
};

type XYChartDataContext = {
  yScale?: (value: number) => number | undefined;
  innerWidth?: number;
  innerHeight?: number;
  margin?: { top: number; left: number; right: number; bottom: number };
};

/** Clamp `value` into the closed `[min, max]` interval. */
function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/**
 * Pure collision-resolution for stacked labels. Given each label's ideal `y`,
 * returns final `y` positions (in the SAME order as the input) that are at
 * least `gap` px apart and lie within `[min, max]`. Overlaps are nudged apart
 * from the top down; if the stack then overflows `max`, it is pulled back up,
 * which only spills past `min` when the range genuinely cannot fit every
 * label. Exported for unit testing.
 */
export function resolveLabelPositions(
  items: { y: number }[],
  gap: number,
  min: number,
  max: number,
): number[] {
  const n = items.length;
  if (n === 0) return [];

  // Work on an order sorted by ideal y so nudging is monotonic, but remember
  // each entry's original index to restore input order at the end.
  const order = items
    .map((item, index) => ({ index, y: clamp(item.y, min, max) }))
    .sort((a, b) => a.y - b.y);

  // Forward pass: push each label down until it clears the previous by `gap`.
  for (let i = 1; i < n; i++) {
    const flooredY = order[i - 1]!.y + gap;
    if (order[i]!.y < flooredY) order[i]!.y = flooredY;
  }

  // Backward pass: if the last label overflowed `max`, pull the stack up,
  // preserving `gap`. May push the top label past `min` only when the range
  // cannot hold all labels.
  if (order[n - 1]!.y > max) {
    order[n - 1]!.y = max;
    for (let i = n - 2; i >= 0; i--) {
      const cappedY = order[i + 1]!.y - gap;
      if (order[i]!.y > cappedY) order[i]!.y = cappedY;
    }
  }

  const result = new Array<number>(n);
  for (const entry of order) result[entry.index] = entry.y;
  return result;
}

/**
 * End-of-line series labels with vertical collision avoidance. Each label sits
 * at the right edge of the plot at its series' y-value; overlapping labels are
 * stacked apart (see {@link resolveLabelPositions}) so dense series stay
 * legible without a separate legend.
 *
 * Reads the live `yScale`/`innerHeight`/`margin` from `DataContext`, so it
 * lines up with sibling series and computes no domain math of its own. Render
 * as a child of `<XYChart>`.
 */
export function DirectLabels({ labels, gap = 14, x = 4 }: DirectLabelsProps) {
  const {
    yScale,
    innerWidth = 0,
    innerHeight = 0,
    margin,
  } = useContext(DataContext) as XYChartDataContext;

  if (!yScale || !margin) return null;

  // Resolve ideal pixel positions, dropping any label whose value falls off
  // the scale so indices stay aligned with the resolver's output.
  const placed = labels
    .map((label) => ({ label, y: yScale(label.value) }))
    .filter(
      (entry): entry is { label: DirectLabelItem; y: number } =>
        entry.y !== undefined && Number.isFinite(entry.y),
    );

  if (placed.length === 0) return null;

  const top = margin.top;
  const resolved = resolveLabelPositions(
    placed.map((entry) => ({ y: entry.y })),
    gap,
    top,
    top + innerHeight,
  );

  const textX = margin.left + innerWidth + x;

  return (
    <g data-part="direct-labels">
      {placed.map((entry, index) => (
        <text
          key={entry.label.id ?? entry.label.label}
          x={textX}
          y={resolved[index]}
          dominantBaseline="middle"
          fontSize={11}
          fill={entry.label.color}
        >
          {entry.label.label}
        </text>
      ))}
    </g>
  );
}
