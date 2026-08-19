import { LineSubject } from '@visx/annotation';
import { DataContext } from '@visx/xychart';
import { useContext } from 'react';

import { resolveChartColor, type ChartColor } from './chart-color.js';
import { chartTokens, seriesColor } from './theme.js';

type ReferenceBandCommon = {
  /**
   * Reference stroke color. Defaults to a token role per mode
   * (`chart.series.critical` for a threshold, `chart.series.tertiary` for a
   * band). Prefer a token name; a raw CSS color string also works.
   */
  stroke?: ChartColor;
  /**
   * Fill color for the shaded region. Defaults to a token-derived `color-mix`
   * tint of the matching stroke role.
   */
  fill?: ChartColor;
  /** Optional label rendered near the reference. */
  label?: string;
};

export type ThresholdBandProps = ReferenceBandCommon & {
  mode: 'threshold';
  /** The threshold value in y-data units, e.g. a limit or target line. */
  value: number;
  /**
   * Which side of the threshold is a breach. `'below'` (default) shades the
   * region under the line. `'above'` shades the region over the line.
   */
  breach?: 'below' | 'above';
};

export type ConfidenceBandProps<Datum> = ReferenceBandCommon & {
  mode: 'band';
  data: Datum[];
  xAccessor: (d: Datum) => number | Date | string;
  lowerAccessor: (d: Datum) => number;
  upperAccessor: (d: Datum) => number;
  /** Optional solid center line, e.g. a point estimate within the interval. */
  centerAccessor?: (d: Datum) => number;
};

export type ReferenceBandProps<Datum = unknown> =
  | ThresholdBandProps
  | ConfidenceBandProps<Datum>;

type XYChartDataContext = {
  xScale?: { (value: unknown): number | undefined; bandwidth?: () => number };
  yScale?: (value: number) => number | undefined;
  innerWidth?: number;
  innerHeight?: number;
  margin?: { top: number; left: number; right: number; bottom: number };
};

/**
 * One reference-band primitive, two configurations:
 *
 * - `mode="threshold"`: a dashed reference line (`@visx/annotation`
 *   `LineSubject`) plus a one-sided breach fill for the region past it — for
 *   example a limit or target line that should read as "breached" on one
 *   side.
 * - `mode="band"`: a shaded symmetric/asymmetric confidence band between a
 *   lower and upper bound, with an optional solid center line — for example
 *   a confidence interval around an estimate.
 *
 * Must be rendered as a child of `<XYChart>` (or another `@visx/xychart`
 * `DataProvider`): it reads the live `xScale`/`yScale` from `DataContext`, so
 * it always lines up with sibling series and never computes its own domain
 * math.
 */
export function ReferenceBand<Datum = unknown>(
  props: ReferenceBandProps<Datum>,
) {
  const {
    xScale,
    yScale,
    innerWidth = 0,
    innerHeight = 0,
    margin,
  } = useContext(DataContext) as XYChartDataContext;

  if (!yScale || !margin) return null;

  const left = margin.left;
  const top = margin.top;

  if (props.mode === 'threshold') {
    const {
      value,
      breach = 'below',
      stroke: strokeColor = seriesColor.critical,
      fill: fillColor = chartTokens.breachFill,
      label,
    } = props;
    const stroke = resolveChartColor(strokeColor);
    const fill = resolveChartColor(fillColor);
    const y = yScale(value);
    if (y === undefined || !Number.isFinite(y)) return null;

    const fillY = breach === 'below' ? y : top;
    const fillHeight = breach === 'below' ? top + innerHeight - y : y - top;
    if (fillHeight <= 0) return null;

    return (
      <g data-part="reference-threshold">
        <rect
          x={left}
          y={fillY}
          width={innerWidth}
          height={fillHeight}
          fill={fill}
          pointerEvents="none"
        />
        <LineSubject
          orientation="horizontal"
          y={y}
          min={left}
          max={left + innerWidth}
          stroke={stroke}
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
        {label ? (
          <text x={left + 6} y={y - 6} fill={stroke} fontSize={11}>
            {label}
          </text>
        ) : null}
      </g>
    );
  }

  if (!xScale) return null;

  const {
    data,
    xAccessor,
    lowerAccessor,
    upperAccessor,
    centerAccessor,
    stroke: strokeColor = seriesColor.tertiary,
    fill: fillColor = chartTokens.bandFill,
    label,
  } = props;
  const stroke = resolveChartColor(strokeColor);
  const fill = resolveChartColor(fillColor);
  if (data.length === 0) return null;

  const bandwidth =
    typeof xScale.bandwidth === 'function' ? xScale.bandwidth() : 0;
  const xAt = (d: Datum) => (xScale(xAccessor(d)) ?? 0) + bandwidth / 2;

  const upperPoints = data.map((d) => `${xAt(d)},${yScale(upperAccessor(d))}`);
  const lowerPoints = [...data]
    .reverse()
    .map((d) => `${xAt(d)},${yScale(lowerAccessor(d))}`);
  const path = `M ${upperPoints.join(' L ')} L ${lowerPoints.join(' L ')} Z`;

  return (
    <g data-part="reference-band">
      <path d={path} fill={fill} stroke="none" pointerEvents="none" />
      {centerAccessor ? (
        <polyline
          points={data
            .map((d) => `${xAt(d)},${yScale(centerAccessor(d))}`)
            .join(' ')}
          fill="none"
          stroke={stroke}
          strokeWidth={1.5}
          strokeDasharray="4 3"
          pointerEvents="none"
        />
      ) : null}
      {label ? (
        <text x={left + 6} y={top + 12} fill={stroke} fontSize={11}>
          {label}
        </text>
      ) : null}
    </g>
  );
}
