import {
  Axis,
  BarSeries,
  CandlestickSeries,
  ChartCursorLayer,
  ChartDataTable,
  ChartLegend,
  DirectLabels,
  Grid,
  LineSeries,
  ReferenceBand,
  ResponsiveChart,
  SyncedChartGroup,
  TimeRangeBrush,
  XYChart,
  ZoomPanOverlay,
  chartTheme,
  seriesColor,
  useHoveredTimestamp,
  useSyncedCursorHandlers,
} from '@archon-research/charting';
import { ThemeProvider } from '@archon-research/design-system';
import { useState } from 'react';

import { css } from '../../../styled-system/css';

export default {
  title: 'Organisms/Charting Primitives',
};

// Abstract, deterministic mock series (no external product data).
type Point = { index: number; value: number };

const SERIES: Point[] = Array.from({ length: 40 }, (_, index) => ({
  index,
  value: 100 + 20 * Math.sin(index / 6) + (index % 5) * 2,
}));

const xAccessor = (d: Point) => d.index;
const yAccessor = (d: Point) => d.value;

type Band = { index: number; center: number; lower: number; upper: number };

const CONFIDENCE_SERIES: Band[] = SERIES.slice(0, 24).map((d) => ({
  index: d.index,
  center: d.value,
  lower: d.value - 8,
  upper: d.value + 8,
}));

type Candle = {
  index: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

const CANDLES: Candle[] = Array.from({ length: 20 }, (_, index) => {
  const base = 100 + 6 * Math.sin(index / 4);
  const open = base + (index % 3) - 1;
  const close = base + Math.cos(index / 2) * 4;
  const high = Math.max(open, close) + 2 + (index % 2);
  const low = Math.min(open, close) - 2 - (index % 3);
  const volume = 40 + (index % 6) * 8;
  return { index, open, high, low, close, volume };
});

const SERIES_B: Point[] = SERIES.map((d) => ({
  index: d.index,
  value: 90 + 14 * Math.cos(d.index / 5),
}));

const pageClassName = css({
  p: '6',
  display: 'grid',
  gap: '6',
  maxWidth: '5xl',
  marginInline: 'auto',
});

const panelClassName = css({
  borderColor: 'border.subtle',
  borderStyle: 'solid',
  borderWidth: '1px',
  borderRadius: 'xl',
  background: 'surface.default',
  p: '4',
  display: 'grid',
  gap: '3',
});

const panelTitleClassName = css({
  fontSize: 'sm',
  fontWeight: 600,
  color: 'text.default',
});

const panelSubtitleClassName = css({
  fontSize: 'xs',
  color: 'text.muted',
});

const rowClassName = css({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '6',
  '@media (max-width: 900px)': { gridTemplateColumns: '1fr' },
});

const readoutClassName = css({
  fontSize: 'xs',
  color: 'text.muted',
});

/** Brush (mini area chart) + a zoom/pan overlay on the same main chart, sharing one domain window. */
function BrushAndZoomPanel() {
  const [domain, setDomain] = useState<[number, number]>([0, 39]);

  return (
    <section className={panelClassName}>
      <div>
        <h3 className={panelTitleClassName}>Time-range brush + zoom/pan</h3>
        <p className={panelSubtitleClassName}>
          Drag the brush below, or scroll/drag on the chart itself, to narrow
          the visible window.
        </p>
      </div>
      <ZoomPanOverlay
        width={640}
        height={220}
        domain={domain}
        onDomainChange={setDomain}
      >
        <XYChart
          theme={chartTheme}
          width={640}
          height={220}
          xScale={{ type: 'linear', domain }}
          yScale={{ type: 'linear', nice: true }}
        >
          <Grid columns={false} numTicks={4} />
          <LineSeries
            dataKey="series"
            data={SERIES}
            xAccessor={xAccessor}
            yAccessor={yAccessor}
          />
          <Axis orientation="bottom" numTicks={6} />
          <Axis orientation="left" numTicks={4} />
        </XYChart>
      </ZoomPanOverlay>
      <TimeRangeBrush
        data={SERIES.map((d) => ({ x: d.index, y: d.value }))}
        width={640}
        height={56}
        onChange={(next) => setDomain(next ?? [0, 39])}
      />
    </section>
  );
}

/** ReferenceBand in both configurations: a breach threshold and a confidence band. */
function ReferenceBandPanels() {
  return (
    <div className={rowClassName}>
      <section className={panelClassName}>
        <div>
          <h3 className={panelTitleClassName}>Threshold band</h3>
          <p className={panelSubtitleClassName}>
            Dashed line + one-sided breach fill below a limit value.
          </p>
        </div>
        <XYChart
          theme={chartTheme}
          width={480}
          height={220}
          xScale={{ type: 'linear' }}
          yScale={{ type: 'linear', nice: true }}
        >
          <Grid columns={false} numTicks={4} />
          <LineSeries
            dataKey="series"
            data={SERIES}
            xAccessor={xAccessor}
            yAccessor={yAccessor}
          />
          <ReferenceBand
            mode="threshold"
            value={95}
            breach="below"
            label="Limit"
          />
          <Axis orientation="bottom" numTicks={4} />
          <Axis orientation="left" numTicks={4} />
        </XYChart>
      </section>

      <section className={panelClassName}>
        <div>
          <h3 className={panelTitleClassName}>Confidence band</h3>
          <p className={panelSubtitleClassName}>
            Shaded interval around a center line.
          </p>
        </div>
        <XYChart
          theme={chartTheme}
          width={480}
          height={220}
          xScale={{ type: 'linear' }}
          yScale={{ type: 'linear', nice: true }}
        >
          <Grid columns={false} numTicks={4} />
          <LineSeries
            dataKey="center"
            data={CONFIDENCE_SERIES}
            xAccessor={(d: Band) => d.index}
            yAccessor={(d: Band) => d.center}
          />
          <ReferenceBand
            mode="band"
            data={CONFIDENCE_SERIES}
            xAccessor={(d: Band) => d.index}
            lowerAccessor={(d: Band) => d.lower}
            upperAccessor={(d: Band) => d.upper}
            centerAccessor={(d: Band) => d.center}
            label="Interval"
          />
          <Axis orientation="bottom" numTicks={4} />
          <Axis orientation="left" numTicks={4} />
        </XYChart>
      </section>
    </div>
  );
}

/** Candlestick + volume as two stacked panels sharing one x-domain. */
function CandlestickPanel() {
  return (
    <section className={panelClassName}>
      <div>
        <h3 className={panelTitleClassName}>Candlestick + volume</h3>
        <p className={panelSubtitleClassName}>
          An OHLC mark stacked over its volume series, sharing one x-domain
          across two panels.
        </p>
      </div>
      <XYChart
        theme={chartTheme}
        width={640}
        height={220}
        xScale={{ type: 'linear' }}
        yScale={{ type: 'linear', nice: true }}
      >
        <Grid columns={false} numTicks={4} />
        <CandlestickSeries
          dataKey="price"
          data={CANDLES}
          xAccessor={(d: Candle) => d.index}
          openAccessor={(d: Candle) => d.open}
          highAccessor={(d: Candle) => d.high}
          lowAccessor={(d: Candle) => d.low}
          closeAccessor={(d: Candle) => d.close}
        />
        <Axis orientation="left" numTicks={4} />
      </XYChart>
      <XYChart
        theme={chartTheme}
        width={640}
        height={90}
        xScale={{ type: 'linear' }}
        yScale={{ type: 'linear', nice: true }}
      >
        <BarSeries
          dataKey="volume"
          data={CANDLES}
          xAccessor={(d: Candle) => d.index}
          yAccessor={(d: Candle) => d.volume}
        />
        <Axis orientation="bottom" numTicks={4} />
      </XYChart>
    </section>
  );
}

function SyncedPanel({
  title,
  data,
  color,
}: {
  title: string;
  data: Point[];
  color: string;
}) {
  const { onPointerMove, onPointerOut } = useSyncedCursorHandlers<Point>(
    (d) => d.index,
  );

  return (
    <XYChart
      theme={chartTheme}
      width={640}
      height={160}
      xScale={{ type: 'linear' }}
      yScale={{ type: 'linear', nice: true }}
      onPointerMove={onPointerMove}
      onPointerOut={onPointerOut}
    >
      <Grid columns={false} numTicks={4} />
      <LineSeries
        dataKey={title}
        data={data}
        xAccessor={(d) => d.index}
        yAccessor={(d) => d.value}
        colorAccessor={() => color}
      />
      <Axis orientation="bottom" numTicks={4} />
      <Axis orientation="left" numTicks={4} />
    </XYChart>
  );
}

function HoveredReadout() {
  const [hoveredTimestamp] = useHoveredTimestamp();
  return (
    <p className={readoutClassName}>
      Synced position:{' '}
      {hoveredTimestamp === null ? 'none' : hoveredTimestamp.toFixed(1)}
    </p>
  );
}

/** Two independent charts sharing one hover cursor via SyncedChartGroup. */
function SyncedCursorPanel() {
  return (
    <section className={panelClassName}>
      <div>
        <h3 className={panelTitleClassName}>Synced-cursor group</h3>
        <p className={panelSubtitleClassName}>
          Hover either panel; both charts and the readout below share one cursor
          position via <code>SyncedChartGroup</code>.
        </p>
      </div>
      <SyncedChartGroup>
        <div className={css({ display: 'grid', gap: '3' })}>
          <SyncedPanel
            title="Series A"
            data={SERIES}
            color={seriesColor.primary}
          />
          <SyncedPanel
            title="Series B"
            data={SERIES_B}
            color={seriesColor.secondary}
          />
          <ChartLegend
            items={[
              { label: 'Series A', color: seriesColor.primary },
              { label: 'Series B', color: seriesColor.secondary },
            ]}
          />
          <HoveredReadout />
        </div>
      </SyncedChartGroup>
    </section>
  );
}

export const Default = () => (
  <ThemeProvider>
    <div className={pageClassName}>
      <BrushAndZoomPanel />
      <ReferenceBandPanels />
      <CandlestickPanel />
      <SyncedCursorPanel />
    </div>
  </ThemeProvider>
);

// `ResponsiveChart` measures its container and derives width/height from an
// aspect ratio + height floor, so a pixel-sized `XYChart` sizes to a fluid
// layout without the consumer wiring up a ResizeObserver and a fallback width.
export const Responsive = () => (
  <ThemeProvider>
    <div className={pageClassName}>
      <section className={panelClassName}>
        <div className={css({ mb: '3' })}>
          <p className={panelTitleClassName}>ResponsiveChart</p>
          <p className={panelSubtitleClassName}>
            The chart fills the container width; height follows{' '}
            <code>aspect</code> with a <code>minHeight</code> floor.
          </p>
        </div>
        <ResponsiveChart aspect={3} minHeight={180}>
          {({ width, height }) => (
            <XYChart
              width={width}
              height={height}
              theme={chartTheme}
              xScale={{ type: 'linear' }}
              yScale={{ type: 'linear' }}
            >
              <Grid columns={false} numTicks={4} />
              <Axis orientation="bottom" numTicks={6} />
              <Axis orientation="left" numTicks={4} />
              <LineSeries
                dataKey="A"
                data={SERIES}
                xAccessor={xAccessor}
                yAccessor={yAccessor}
                stroke={seriesColor.primary}
              />
            </XYChart>
          )}
        </ResponsiveChart>
      </section>
    </div>
  </ThemeProvider>
);

// The reader layer: an interactive legend (toggle/emphasis/note/badge), an
// on-plot snap crosshair with per-series dots + a positioned tooltip, direct
// end-labels with collision stacking, and an accessible data-table mirror.
const A_BY_INDEX = new Map(SERIES.map((d) => [d.index, d.value]));
const B_BY_INDEX = new Map(SERIES_B.map((d) => [d.index, d.value]));
const STOPS = SERIES.map((d) => d.index);

export const ReaderLayer = () => (
  <ThemeProvider>
    <div className={pageClassName}>
      <section className={panelClassName}>
        <div className={css({ mb: '3' })}>
          <h3 className={panelTitleClassName}>Reader layer</h3>
          <p className={panelSubtitleClassName}>
            Interactive legend, snap crosshair, direct labels, and a data-table
            mirror.
          </p>
        </div>
        <ChartLegend
          shape="line"
          interactive
          items={[
            {
              id: 'A',
              label: 'Account',
              color: seriesColor.primary,
              emphasis: true,
              badge: 'live',
            },
            {
              id: 'B',
              label: 'Benchmark',
              color: seriesColor.secondary,
              dash: true,
              note: 'counterfactual',
            },
            {
              id: 'C',
              label: 'Hidden series',
              color: seriesColor.tertiary,
              hidden: true,
            },
          ]}
        />
        <XYChart
          width={640}
          height={280}
          theme={chartTheme}
          xScale={{ type: 'linear' }}
          yScale={{ type: 'linear' }}
        >
          <Grid columns={false} numTicks={4} />
          <Axis orientation="bottom" numTicks={6} />
          <Axis orientation="left" numTicks={4} />
          <LineSeries
            dataKey="A"
            data={SERIES}
            xAccessor={xAccessor}
            yAccessor={yAccessor}
            stroke={seriesColor.primary}
          />
          <LineSeries
            dataKey="B"
            data={SERIES_B}
            xAccessor={xAccessor}
            yAccessor={yAccessor}
            stroke={seriesColor.secondary}
          />
          <DirectLabels
            labels={[
              {
                label: 'Account',
                value: SERIES[SERIES.length - 1].value,
                color: seriesColor.primary,
              },
              {
                label: 'Benchmark',
                value: SERIES_B[SERIES_B.length - 1].value,
                color: seriesColor.secondary,
              },
            ]}
          />
          <ChartCursorLayer
            stops={STOPS}
            cursor={20}
            series={[
              {
                id: 'A',
                color: seriesColor.primary,
                valueAt: (x) => A_BY_INDEX.get(x) ?? null,
              },
              {
                id: 'B',
                color: seriesColor.secondary,
                valueAt: (x) => B_BY_INDEX.get(x) ?? null,
              },
            ]}
          >
            {({ x, points }) => (
              <div
                className={css({
                  bg: 'overlay.tooltip',
                  color: 'text.inverse',
                  borderRadius: 'md',
                  px: '2',
                  py: '1',
                  fontSize: 'xs',
                  whiteSpace: 'nowrap',
                })}
              >
                #{x}
                {points.map((p) => (
                  <span key={p.id} className={css({ ml: '2' })}>
                    {p.id}: {p.value.toFixed(1)}
                  </span>
                ))}
              </div>
            )}
          </ChartCursorLayer>
        </XYChart>
        <ChartDataTable
          visuallyHidden={false}
          caption="Account vs Benchmark by heartbeat"
          columns={['#', 'Account', 'Benchmark']}
          rows={SERIES.slice(0, 5).map((d) => [
            d.index,
            d.value.toFixed(1),
            (B_BY_INDEX.get(d.index) ?? 0).toFixed(1),
          ])}
        />
      </section>
    </div>
  </ThemeProvider>
);

// `colorLabel` renders each legend label in its swatch color (a colored-label
// legend), and works with the interactive toggle form.
export const ColoredLegend = () => (
  <ThemeProvider>
    <div className={css({ p: '6', display: 'grid', gap: '4' })}>
      <ChartLegend
        shape="line"
        colorLabel
        items={[
          { label: 'Account', color: seriesColor.primary },
          { label: 'Benchmark', color: seriesColor.secondary, dash: true },
          { label: 'Peer median', color: seriesColor.tertiary },
        ]}
      />
      <ChartLegend
        shape="line"
        colorLabel
        interactive
        items={[
          {
            id: 'a',
            label: 'Account',
            color: seriesColor.primary,
            emphasis: true,
          },
          {
            id: 'b',
            label: 'Benchmark',
            color: seriesColor.secondary,
            dash: true,
          },
          {
            id: 'c',
            label: 'Hidden',
            color: seriesColor.tertiary,
            hidden: true,
          },
        ]}
      />
    </div>
  </ThemeProvider>
);
