import { Bar, Line as ShapeLine } from '@visx/shape';
import { DataContext } from '@visx/xychart';
import { useContext, useEffect } from 'react';

import { resolveChartColor, type ChartColor } from './chart-color.js';
import { seriesColor } from './theme.js';

export type CandlestickSeriesProps<Datum> = {
  /** Unique key for this series, like `XYChart` series `dataKey`. */
  dataKey: string;
  data: Datum[];
  xAccessor: (d: Datum) => number | Date | string;
  openAccessor: (d: Datum) => number;
  highAccessor: (d: Datum) => number;
  lowAccessor: (d: Datum) => number;
  closeAccessor: (d: Datum) => number;
  /** Body width in px, clamped to the band's own width when the x-scale is banded. */
  maxBodyWidth?: number;
  /**
   * Body/wick color for an up (close >= open) candle. Defaults to
   * `chart.series.positive`. Prefer a token name; a raw CSS color string also
   * works.
   */
  upColor?: ChartColor;
  /**
   * Body/wick color for a down (close < open) candle. Defaults to
   * `chart.series.critical`.
   */
  downColor?: ChartColor;
};

type XYChartDataContext<Datum> = {
  xScale?: {
    (value: unknown): number | undefined;
    bandwidth?: () => number;
  };
  yScale?: (value: number) => number | undefined;
  registerData?: (
    entry:
      | {
          key: string;
          data: Datum[];
          xAccessor: (d: Datum) => unknown;
          yAccessor: (d: Datum) => number;
        }
      | {
          key: string;
          data: Datum[];
          xAccessor: (d: Datum) => unknown;
          yAccessor: (d: Datum) => number;
        }[],
  ) => void;
  unregisterData?: (keyOrKeys: string | string[]) => void;
};

/**
 * Candlestick / OHLC mark, built directly on `@visx/shape` (`Bar` for the
 * body, `Line` for the high-low wick): `@visx/xychart` has no OHLC series
 * type, so this is a custom mark per the charting DESIGN.md convention
 * ("we do not hand-roll SVG scaling/axis math" refers to *chart* math — the
 * scale/domain math here still comes entirely from the chart's own
 * `xScale`/`yScale`, read from `DataContext`; only the candle shape itself is
 * bespoke).
 *
 * Registers two synthetic, domain-only entries (`${dataKey}-high` /
 * `${dataKey}-low`) into the chart's data registry so the y-scale auto-extends
 * to the candle extremes, the same way a real `Series` would.
 *
 * Render as a child of `<XYChart>`.
 */
export function CandlestickSeries<Datum>({
  dataKey,
  data,
  xAccessor,
  openAccessor,
  highAccessor,
  lowAccessor,
  closeAccessor,
  maxBodyWidth = 14,
  upColor = seriesColor.positive,
  downColor = seriesColor.critical,
}: CandlestickSeriesProps<Datum>) {
  const { xScale, yScale, registerData, unregisterData } = useContext(
    DataContext,
  ) as XYChartDataContext<Datum>;

  // Resolved once per render, not once per candle: the direction is per-datum
  // but there are only ever these two colors, and a series can be hundreds of
  // candles long.
  const upFill = resolveChartColor(upColor);
  const downFill = resolveChartColor(downColor);

  useEffect(() => {
    if (!registerData) return;
    const highKey = `${dataKey}-high`;
    const lowKey = `${dataKey}-low`;
    registerData([
      { key: highKey, data, xAccessor, yAccessor: highAccessor },
      { key: lowKey, data, xAccessor, yAccessor: lowAccessor },
    ]);
    return () => unregisterData?.([highKey, lowKey]);
    // Re-register only when the identity of the series inputs changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataKey, data, registerData, unregisterData]);

  if (!xScale || !yScale) return null;

  const bandwidth =
    typeof xScale.bandwidth === 'function'
      ? xScale.bandwidth()
      : maxBodyWidth * 2;
  const bodyWidth = Math.max(2, Math.min(bandwidth * 0.6, maxBodyWidth));

  return (
    <g data-part="candlestick-series">
      {data.map((d, i) => {
        const cxRaw = xScale(xAccessor(d));
        if (cxRaw === undefined) return null;
        const cx = cxRaw + bandwidth / 2;
        const open = openAccessor(d);
        const close = closeAccessor(d);
        const high = highAccessor(d);
        const low = lowAccessor(d);
        const yHigh = yScale(high);
        const yLow = yScale(low);
        const yOpen = yScale(open);
        const yClose = yScale(close);
        if (
          yHigh === undefined ||
          yLow === undefined ||
          yOpen === undefined ||
          yClose === undefined
        ) {
          return null;
        }
        const up = close >= open;
        const color = up ? upFill : downFill;
        const bodyTop = Math.min(yOpen, yClose);
        const bodyHeight = Math.max(1, Math.abs(yClose - yOpen));

        return (
          <g key={`${dataKey}-${i}`} data-part="candle">
            <ShapeLine
              from={{ x: cx, y: yHigh }}
              to={{ x: cx, y: yLow }}
              stroke={color}
              strokeWidth={1}
            />
            <Bar
              x={cx - bodyWidth / 2}
              y={bodyTop}
              width={bodyWidth}
              height={bodyHeight}
              fill={color}
            />
          </g>
        );
      })}
    </g>
  );
}
