/**
 * One tile of a diverging heat/sector scale: green ↔ grey ↔ red,
 * saturation = magnitude, grey = flat. Built on the `colors.heat.*` token
 * family (light + dark), which is deliberately a SEPARATE family from the
 * categorical `chart.series.*` ramp used for chart-series/legend coloring —
 * never repurpose one for the other, and never invent a third hue for
 * "neutral" (it's always grey).
 *
 * `HeatCell` renders exactly one tile; laying several out into a grid (and
 * computing a shared `domain` across them) is the consumer's concern —
 * consistent with this package's other atoms (`Badge`, `Chip`, `StatTile`),
 * `HeatCell` doesn't own a layout.
 *
 * The design-system package builds with `tsc` and ships no generated
 * `styled-system`, so — same convention as `DataTable`/`SidebarLayout` —
 * this component applies recipe styling by its stable, deterministic Panda
 * class names rather than importing `css()`/recipe fns.
 */

/** The diverging scale's seven fixed steps, negative-to-positive. */
export type HeatStep =
  | 'neg3'
  | 'neg2'
  | 'neg1'
  | 'flat'
  | 'pos1'
  | 'pos2'
  | 'pos3';

const STEPS: readonly HeatStep[] = [
  'neg3',
  'neg2',
  'neg1',
  'flat',
  'pos1',
  'pos2',
  'pos3',
];

/**
 * Maps a signed value onto one of the seven steps. `domain` is the
 * magnitude at which the scale saturates; beyond it, a value clamps rather
 * than inventing an eighth color. Exported (but not re-exported from
 * `index.ts`/the package root) so `HeatCell.test.ts` can exercise the pure
 * bucketing directly, and so a consumer building a custom legend can reuse
 * the same bucketing via a deep import if it needs to.
 */
export function heatStep(value: number, domain: number): HeatStep {
  if (!Number.isFinite(value) || domain <= 0) return 'flat';
  const normalized = Math.max(-1, Math.min(1, value / domain));
  // -1..1 -> 0..6, with a dead band around zero mapping to the flat centre.
  const index = Math.round(normalized * 3) + 3;
  return STEPS[index] ?? 'flat';
}

const cx = (...classes: Array<string | false | null | undefined>): string =>
  classes.filter(Boolean).join(' ');

export type HeatCellProps = {
  label: string;
  /** Signed magnitude. Units are the caller's. */
  value: number;
  sub?: string;
  /** Magnitude at which the scale saturates. If several `HeatCell`s share a scale, compute one shared domain (e.g. the max absolute value across them) and pass it to each. */
  domain: number;
  /** How to render `value`. Defaults to `'number'`. */
  format?: 'percent' | 'number';
  className?: string;
};

export function HeatCell({
  label,
  value,
  sub,
  domain,
  format = 'number',
  className,
}: HeatCellProps) {
  const step = heatStep(value, domain);
  const sign = value >= 0 ? '+' : '';
  const formattedValue =
    format === 'percent'
      ? `${sign}${value.toFixed(2)}%`
      : `${sign}${value.toLocaleString('en-US', { maximumFractionDigits: 1 })}`;

  return (
    <div
      className={cx(
        'heatCell__root',
        `heatCell__root--step_${step}`,
        className,
      )}
      data-scope="heat-cell"
      data-part="root"
    >
      <span className="heatCell__label" data-part="label">
        {label}
      </span>
      <span className="heatCell__value" data-part="value">
        {formattedValue}
      </span>
      {sub ? (
        <span className="heatCell__sub" data-part="sub">
          {sub}
        </span>
      ) : null}
    </div>
  );
}
