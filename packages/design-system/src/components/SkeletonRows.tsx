import { type CSSProperties } from 'react';

import { usePrefersReducedMotion } from '../hooks/useMediaQuery.js';
import {
  SKELETON_PULSE_ANIMATION,
  SKELETON_PULSE_KEYFRAMES,
  SKELETON_PULSE_PEAK_OPACITY,
} from './skeletonPulse.js';

/**
 * Shape of the content a skeleton cell stands in for.
 *
 * - `text` (default) — a single bar, centered in the column's inset track.
 * - `numeric` — a shorter bar pushed to the trailing edge, mirroring the
 *   right-aligned mono cells a numeric column renders (see `numericColumnMeta`).
 * - `identity` — a leading circle (avatar/token dot) plus two stacked lines, for
 *   the "name over secondary label" cell that usually opens a table. The richer
 *   generalization of `firstColumnTall`, which still works and stays orthogonal.
 *
 * `text` and `numeric` size purely in percentages, so they contribute no
 * intrinsic width and the surrounding table keeps full control of its columns.
 * `identity` is the exception: its avatar dot is a fixed 32px box, which makes
 * that cell the only one with a non-zero max-content width. Under a
 * content-derived (`table-layout: auto`) table with no other content — a
 * standalone skeleton with no `<thead>` — the table awards it all the slack and
 * starves its siblings. Give such a table `table-layout: fixed` (or a
 * `<colgroup>`); inside `DataTable` the real header row already sizes the
 * columns, so no extra work is needed.
 */
export type SkeletonColumnKind = 'text' | 'numeric' | 'identity';

export type SkeletonColumnHint = {
  /** Content shape for this column. Defaults to `'text'`. */
  kind?: SkeletonColumnKind;
  /**
   * Bar width as a percentage of the column's inset track, before per-row
   * variance. Rounded and clamped to 10–100; a non-finite value falls back to
   * the `kind` default. Defaults per `kind`: `text` 100, `numeric` 55,
   * `identity` 100 (its second line is derived from the first).
   */
  widthPercent?: number;
};

type SkeletonRowsProps = {
  rows?: number;
  columns?: number;
  /**
   * Renders the first column's bar taller (48px vs 32px). Independent of
   * `columnHints`: it still applies to column 0 unless that column's hint asks
   * for `identity`, which owns its own two-line height.
   */
  firstColumnTall?: boolean;
  /**
   * Per-column content hints, index-aligned with the rendered cells. Shorter
   * than `columns` is fine — unhinted columns fall back to `text`.
   *
   * Passing hints opts into the *detailed* skeleton: bars additionally take a
   * deterministic per-row width variance so rows don't read as stamped copies
   * (see `skeletonBarWidthPercent`). Omitting hints keeps the plain uniform
   * skeleton exactly as before, so existing callers see no visual change.
   */
  columnHints?: readonly SkeletonColumnHint[];
  /** Pulses each block to signal loading. Default true; suppressed under `prefers-reduced-motion`. */
  animate?: boolean;
  /** Applied to each skeleton `<tr>`. */
  className?: string;
  style?: CSSProperties;
};

const rowStyle: CSSProperties = {
  borderBottomWidth: 1,
  borderBottomStyle: 'solid',
  borderBottomColor: 'var(--colors-border-subtle, #d0d5dd)',
};

const cellStyle: CSSProperties = {
  padding: '14px 0',
};

const blockBaseStyle: CSSProperties = {
  // The 16px horizontal inset is a width clamp on the block, not padding on
  // the cell: fixed cell padding swallows narrow columns whole (DataTable's
  // ~32px expander column left a 0px content box — an invisible skeleton).
  // Columns ≥ 80px get the exact 16px-per-side inset as before; narrower
  // ones keep a visible centered block with a proportional inset instead.
  width: 'max(60%, 100% - 32px)',
  marginInline: 'auto',
  borderRadius: 6,
  background: 'var(--colors-surface-subtle, #f8f9fb)',
  opacity: SKELETON_PULSE_PEAK_OPACITY,
};

/**
 * The same inset track as `blockBaseStyle`, reused as a flex container so a
 * hinted cell can align and stack bars *inside* the inset instead of against
 * the raw cell edge. Keeping one clamp expression means the narrow-column
 * behavior above holds for hinted cells too.
 */
const hintedTrackStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  width: 'max(60%, 100% - 32px)',
  marginInline: 'auto',
};

const barStyle: CSSProperties = {
  borderRadius: 6,
  background: 'var(--colors-surface-subtle, #f8f9fb)',
  opacity: SKELETON_PULSE_PEAK_OPACITY,
};

const DEFAULT_WIDTH_PERCENT: Record<SkeletonColumnKind, number> = {
  text: 100,
  numeric: 55,
  identity: 100,
};

/** Widest and narrowest a bar may end up after variance is applied. */
const MIN_WIDTH_PERCENT = 10;
const MAX_WIDTH_PERCENT = 100;

/** Percentage points removed per variance step, and how many steps exist. */
const VARIANCE_STEP_PERCENT = 8;
const VARIANCE_STEPS = 3;

/**
 * Deterministic per-cell width variance — no `Math.random`, no `Date`, no
 * state. Rows and columns are walked by a fixed modular sequence
 * (`rowIndex * 7 + columnIndex * 5`, mod 3), so a skeleton looks organically
 * ragged while rendering identically on every mount, on the server and the
 * client, and across snapshot runs.
 *
 * Exported for unit tests; not part of the package's public surface.
 */
export function skeletonBarWidthPercent(
  basePercent: number,
  rowIndex: number,
  columnIndex: number,
): number {
  const step = (rowIndex * 7 + columnIndex * 5) % VARIANCE_STEPS;
  const varied = basePercent - step * VARIANCE_STEP_PERCENT;
  return Math.min(MAX_WIDTH_PERCENT, Math.max(MIN_WIDTH_PERCENT, varied));
}

/**
 * A hint's bar width before per-row variance: the requested percentage rounded
 * and clamped into the visible 10–100 band, or the `kind`'s default when none
 * was requested.
 *
 * A non-finite request (a `NaN` from arithmetic upstream — a division by a zero
 * total, a parse of a missing value — or an `Infinity`) also falls back to the
 * default. Clamping cannot rescue `NaN` (`Math.min`/`Math.max` propagate it), and
 * it would reach the DOM as `width: NaN%`, which browsers discard: the bar would
 * silently render at its intrinsic zero width, an invisible skeleton.
 *
 * Exported for unit tests; not part of the package's public surface.
 */
export function resolveBasePercent(
  hint: SkeletonColumnHint | undefined,
): number {
  const fallback = DEFAULT_WIDTH_PERCENT[hint?.kind ?? 'text'];
  const requested = hint?.widthPercent;
  const base = Number.isFinite(requested) ? (requested as number) : fallback;
  return Math.min(
    MAX_WIDTH_PERCENT,
    Math.max(MIN_WIDTH_PERCENT, Math.round(base)),
  );
}

export function SkeletonRows({
  rows = 6,
  columns = 6,
  firstColumnTall = true,
  columnHints,
  animate = true,
  className,
  style,
}: SkeletonRowsProps = {}) {
  const reducedMotion = usePrefersReducedMotion();
  const shouldAnimate = animate && !reducedMotion;
  const animation = shouldAnimate ? SKELETON_PULSE_ANIMATION : undefined;
  const detailed = columnHints != null;

  return Array.from({ length: rows }, (_row, rowIndex) => (
    <tr key={rowIndex} className={className} style={{ ...rowStyle, ...style }}>
      {Array.from({ length: columns }, (_cell, cellIndex) => {
        const hint = columnHints?.[cellIndex];
        const kind = hint?.kind ?? 'text';
        const tall = cellIndex === 0 && firstColumnTall;

        return (
          <td key={cellIndex} style={cellStyle} aria-hidden="true">
            {/* Injected once, from the first cell, rather than once per block. */}
            {rowIndex === 0 && cellIndex === 0 && shouldAnimate ? (
              <style>{SKELETON_PULSE_KEYFRAMES}</style>
            ) : null}
            {detailed ? (
              <SkeletonCellContent
                kind={kind}
                widthPercent={skeletonBarWidthPercent(
                  resolveBasePercent(hint),
                  rowIndex,
                  cellIndex,
                )}
                tall={tall}
                animation={animation}
              />
            ) : (
              <div
                style={{
                  ...blockBaseStyle,
                  height: tall ? 48 : 32,
                  animation,
                }}
              />
            )}
          </td>
        );
      })}
    </tr>
  ));
}

function SkeletonCellContent({
  kind,
  widthPercent,
  tall,
  animation,
}: {
  kind: SkeletonColumnKind;
  widthPercent: number;
  tall: boolean;
  animation: string | undefined;
}) {
  if (kind === 'identity') {
    // The circle is 32px — the same height a plain bar takes — so an identity
    // column never changes the row height it sits in.
    return (
      <div style={hintedTrackStyle}>
        <div
          style={{
            ...barStyle,
            width: 32,
            height: 32,
            borderRadius: '50%',
            flexShrink: 0,
            animation,
          }}
        />
        <div
          style={{
            display: 'grid',
            gap: 6,
            flex: 1,
            minWidth: 0,
          }}
        >
          <div
            style={{
              ...barStyle,
              width: `${widthPercent}%`,
              height: 11,
              animation,
            }}
          />
          <div
            style={{
              ...barStyle,
              // A secondary label always reads shorter than the name above it.
              width: `${Math.max(MIN_WIDTH_PERCENT, Math.round(widthPercent * 0.65))}%`,
              height: 9,
              animation,
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        ...hintedTrackStyle,
        justifyContent: kind === 'numeric' ? 'flex-end' : 'flex-start',
      }}
    >
      <div
        style={{
          ...barStyle,
          width: `${widthPercent}%`,
          height: tall ? 48 : 32,
          animation,
        }}
      />
    </div>
  );
}
