import { Brush } from '@visx/brush';
import { Group } from '@visx/group';
import { scaleLinear } from '@visx/scale';
import { AreaClosed } from '@visx/shape';
import { useMemo } from 'react';

import { chartTokens, seriesColor } from './theme.js';

export type TimeRangeBrushDatum = {
  /** Numeric x position: an epoch-ms timestamp or an ordinal index. */
  x: number;
  y: number;
};

export type TimeRangeBrushDomain = [number, number];

export type TimeRangeBrushProps = {
  data: TimeRangeBrushDatum[];
  width?: number;
  height?: number;
  /** Called with the selected domain, or `null` when the selection is cleared. */
  onChange: (domain: TimeRangeBrushDomain | null) => void;
  /** Initial selection; defaults to the full data domain. */
  initialDomain?: TimeRangeBrushDomain;
};

const MARGIN = { top: 4, left: 1, right: 1, bottom: 4 };

/**
 * A compact time-range brush: a mini area chart with a draggable selection
 * (`@visx/brush`) that reports the selected domain window. This is the
 * standard "brush below the main chart" pattern for dense time-series
 * charts — the brush and the main chart share one x-domain (numeric: epoch
 * ms or index), so pair it with `<XYChart xScale={{ type: 'linear', domain
 * }}>` (or filter the main chart's data to the window) rather than a second,
 * unrelated y-scale.
 */
export function TimeRangeBrush({
  data,
  width = 640,
  height = 64,
  onChange,
  initialDomain,
}: TimeRangeBrushProps) {
  const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const innerHeight = Math.max(0, height - MARGIN.top - MARGIN.bottom);

  const domain = useMemo<TimeRangeBrushDomain>(() => {
    if (data.length === 0) return [0, 1];
    const xs = data.map((d) => d.x);
    return [Math.min(...xs), Math.max(...xs)];
  }, [data]);

  const xScale = useMemo(
    () => scaleLinear({ range: [0, innerWidth], domain }),
    [innerWidth, domain],
  );

  const yScale = useMemo(() => {
    const ys = data.map((d) => d.y);
    const min = ys.length ? Math.min(0, ...ys) : 0;
    const max = ys.length ? Math.max(...ys) : 1;
    return scaleLinear({
      range: [innerHeight, 0],
      domain: [min, max],
      nice: true,
    });
  }, [data, innerHeight]);

  if (data.length === 0) return null;

  return (
    <svg width={width} height={height} role="img" aria-label="Time range brush">
      <Group left={MARGIN.left} top={MARGIN.top}>
        <AreaClosed
          data={data}
          x={(d) => xScale(d.x) ?? 0}
          y={(d) => yScale(d.y) ?? 0}
          yScale={yScale}
          fill={chartTokens.areaPrimary}
          stroke={seriesColor.primary}
          strokeWidth={1}
        />
        <Brush
          xScale={xScale}
          yScale={yScale}
          width={innerWidth}
          height={innerHeight}
          handleSize={6}
          resizeTriggerAreas={['left', 'right']}
          brushDirection="horizontal"
          initialBrushPosition={
            initialDomain
              ? {
                  start: { x: xScale(initialDomain[0]) },
                  end: { x: xScale(initialDomain[1]) },
                }
              : undefined
          }
          selectedBoxStyle={{
            fill: seriesColor.primary,
            fillOpacity: 0.15,
            stroke: seriesColor.primary,
            strokeWidth: 1,
          }}
          onChange={(bounds) => {
            if (!bounds) {
              onChange(null);
              return;
            }
            onChange([bounds.x0, bounds.x1]);
          }}
          useWindowMoveEvents
        />
      </Group>
    </svg>
  );
}
