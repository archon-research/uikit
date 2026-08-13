import { type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';

/**
 * Class names emitted by the `proportionBar` slot recipe (registered in the
 * preset + staticCss). The design-system ships no generated `styled-system`, so
 * styling is applied by stable slot class names. Segment widths and colors are
 * runtime values, so the component sets them inline — which is the point:
 * consumers stop hand-rolling the labelled-share bar and its table mirror.
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

/**
 * Default segment/swatch colors — the chart series ramp, so a share here and a
 * series line elsewhere read as the same category. Overridden per row by
 * `color`.
 */
const SERIES_VARS = [
  'var(--colors-chart-series-primary)',
  'var(--colors-chart-series-secondary)',
  'var(--colors-chart-series-tertiary)',
  'var(--colors-chart-series-quaternary)',
  'var(--colors-chart-series-quinary)',
  'var(--colors-chart-series-positive)',
  'var(--colors-chart-series-critical)',
];

export type ProportionRow = {
  key: string;
  label: ReactNode;
  value: number;
  /** Bar/legend color (any CSS color). Defaults to a chart-series hue by index. */
  color?: string;
  /** Optional formatted value shown in the legend and table mirror. */
  valueText?: string;
};

export type ProportionBarProps = HTMLAttributes<HTMLDivElement> & {
  rows: ProportionRow[];
  /** Denominator for the shares. Defaults to the sum of row values. */
  total?: number;
  /** Emit a visually-hidden `<table>` mirror of the shares. Defaults to true. */
  a11yTable?: boolean;
  /** Caption for the table mirror (and the bar's `aria-label`). */
  caption?: string;
  /** Show the legend row beneath the bar. Defaults to true. */
  showLegend?: boolean;
};

/**
 * A single stacked bar of labelled shares with a legend and a visually-hidden
 * table mirror, so the state is carried in text as well as in the bar.
 */
export function ProportionBar({
  rows,
  total,
  a11yTable = true,
  caption,
  showLegend = true,
  className,
  ...rest
}: ProportionBarProps) {
  const sum = total ?? rows.reduce((acc, row) => acc + (row.value || 0), 0);
  const colorFor = (row: ProportionRow, index: number) =>
    row.color ?? SERIES_VARS[index % SERIES_VARS.length];
  const pctOf = (value: number) => (sum > 0 ? (value / sum) * 100 : 0);

  return (
    <div
      {...rest}
      className={cx('proportionBar__root', className)}
      data-scope="proportion-bar"
      data-part="root"
    >
      <div
        className="proportionBar__track"
        data-part="track"
        role="img"
        aria-label={caption}
      >
        {rows.map((row, index) => (
          <div
            key={row.key}
            className="proportionBar__segment"
            data-part="segment"
            style={{
              width: `${pctOf(row.value)}%`,
              background: colorFor(row, index),
            }}
          />
        ))}
      </div>
      {showLegend ? (
        <div className="proportionBar__legend" data-part="legend">
          {rows.map((row, index) => (
            <span
              key={row.key}
              className="proportionBar__legendItem"
              data-part="legend-item"
            >
              <span
                className="proportionBar__swatch"
                data-part="swatch"
                style={{ background: colorFor(row, index) }}
                aria-hidden="true"
              />
              <span
                className="proportionBar__legendLabel"
                data-part="legend-label"
              >
                {row.label}
              </span>
              <span
                className="proportionBar__legendValue"
                data-part="legend-value"
              >
                {row.valueText ?? `${Math.round(pctOf(row.value))}%`}
              </span>
            </span>
          ))}
        </div>
      ) : null}
      {a11yTable ? (
        <table style={visuallyHidden}>
          {caption != null ? <caption>{caption}</caption> : null}
          <thead>
            <tr>
              <th scope="col">Category</th>
              <th scope="col">Value</th>
              <th scope="col">Share</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <th scope="row">{row.label}</th>
                <td>{row.valueText ?? String(row.value)}</td>
                <td>{`${Math.round(pctOf(row.value))}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
