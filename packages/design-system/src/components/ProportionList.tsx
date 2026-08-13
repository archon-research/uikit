import { type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';

/**
 * Class names emitted by the `proportionList` slot recipe (registered in the
 * preset + staticCss). The design-system ships no generated `styled-system`, so
 * styling is applied by stable slot class names. Bar widths and colors are
 * runtime values, so the component sets them inline — which is the point:
 * consumers stop hand-rolling a set of labelled bars and their table mirror.
 */
const cx = (...classes: Array<string | false | null | undefined>): string =>
  classes.filter(Boolean).join(' ');

const visuallyHidden: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  borderWidth: 0,
};

const DEFAULT_BAR_COLOR = 'var(--colors-chart-series-primary)';

export type ProportionListRow = {
  key: string;
  label: ReactNode;
  value: number;
  /** Bar color (any CSS color). Defaults to the chart-series primary hue. */
  color?: string;
  /** Formatted value shown on the row and in the table mirror. */
  valueText?: string;
};

export type ProportionListProps = HTMLAttributes<HTMLDivElement> & {
  rows: ProportionListRow[];
  /**
   * Denominator each bar is measured against. Defaults to the largest row
   * value, so the biggest bar fills the track and the rest read relative to it.
   * Pass a fixed total to make the bars read as shares of a whole.
   */
  max?: number;
  /** Emit a visually-hidden `<table>` mirror of the rows. Defaults to true. */
  a11yTable?: boolean;
  /** Caption for the table mirror. */
  caption?: string;
  /** Show the per-row value. Defaults to true. */
  showValue?: boolean;
};

/**
 * A list of labelled bars on a common baseline — one track per row — for a set
 * of independent shares (allocations, weights). Distinct from the single
 * stacked `ProportionBar`. Carries the data in a visually-hidden table too, so
 * the values are available as text.
 */
export function ProportionList({
  rows,
  max,
  a11yTable = true,
  caption,
  showValue = true,
  className,
  ...rest
}: ProportionListProps) {
  const denominator =
    max ?? rows.reduce((peak, row) => Math.max(peak, row.value || 0), 0);
  const pctOf = (value: number) =>
    denominator > 0 ? Math.max(0, (value / denominator) * 100) : 0;

  return (
    <div
      {...rest}
      className={cx('proportionList__root', className)}
      data-scope="proportion-list"
      data-part="root"
    >
      {rows.map((row) => (
        <div key={row.key} className="proportionList__row" data-part="row">
          <div className="proportionList__header" data-part="header">
            <span className="proportionList__label" data-part="label">
              {row.label}
            </span>
            {showValue ? (
              <span className="proportionList__value" data-part="value">
                {row.valueText ?? String(row.value)}
              </span>
            ) : null}
          </div>
          <div
            className="proportionList__track"
            data-part="track"
            role="img"
            aria-label={
              typeof row.label === 'string'
                ? `${row.label}: ${row.valueText ?? row.value}`
                : undefined
            }
          >
            <div
              className="proportionList__fill"
              data-part="fill"
              style={{
                width: `${pctOf(row.value)}%`,
                background: row.color ?? DEFAULT_BAR_COLOR,
              }}
            />
          </div>
        </div>
      ))}
      {a11yTable ? (
        <table style={visuallyHidden}>
          {caption != null ? <caption>{caption}</caption> : null}
          <thead>
            <tr>
              <th scope="col">Category</th>
              <th scope="col">Value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <th scope="row">{row.label}</th>
                <td>{row.valueText ?? String(row.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
