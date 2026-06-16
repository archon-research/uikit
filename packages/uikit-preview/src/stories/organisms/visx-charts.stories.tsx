import {
  AreaSeries,
  Axis,
  BarGroup,
  BarSeries,
  ChartContainer,
  Grid,
  LineSeries,
  Tooltip,
  XYChart,
  chartTheme,
  chartTokens,
} from '@archon-research/charting';
import { ThemeProvider } from '@archon-research/design-system';

import { css } from '../../../styled-system/css';

export default {
  title: 'Organisms/Visx Charts',
};

type Point = { label: string; value: number };

const portfolio: Point[] = [
  { label: 'Mon', value: 124 },
  { label: 'Tue', value: 160 },
  { label: 'Wed', value: 142 },
  { label: 'Thu', value: 182 },
  { label: 'Fri', value: 176 },
  { label: 'Sat', value: 214 },
  { label: 'Sun', value: 205 },
];

const benchmark: Point[] = portfolio.map((p, i) => ({
  label: p.label,
  value: 120 + i * 12,
}));

const allocations: Point[] = [
  { label: 'ETH', value: 46 },
  { label: 'ARB', value: 24 },
  { label: 'OP', value: 18 },
  { label: 'POL', value: 12 },
];

const xAccessor = (d: Point) => d.label;
const yAccessor = (d: Point) => d.value;

const pageClassName = css({
  p: '6',
  display: 'grid',
  gap: '5',
  maxWidth: '6xl',
  marginInline: 'auto',
});

const gridClassName = css({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '5',
  '@media (max-width: 980px)': { gridTemplateColumns: '1fr' },
});

const legendClassName = css({
  display: 'flex',
  gap: '4',
  alignItems: 'center',
  fontSize: 'sm',
  color: 'text.muted',
  pt: '2',
});

const swatchClassName = css({
  display: 'inline-block',
  width: '12px',
  height: '12px',
  borderRadius: '2px',
  marginRight: '2',
  verticalAlign: 'middle',
});

const tooltipPreviewClassName = css({
  borderColor: 'border.subtle',
  borderStyle: 'solid',
  borderWidth: '1px',
  borderRadius: 'md',
  background: 'surface.default',
  boxShadow: 'sm',
  p: '3',
  fontSize: 'sm',
  width: 'fit-content',
});

const Legend = ({
  items,
}: {
  items: Array<{ label: string; color: string }>;
}) => (
  <div className={legendClassName}>
    {items.map((item) => (
      <span key={item.label}>
        <span
          className={swatchClassName}
          style={{ background: item.color }}
          aria-hidden="true"
        />
        {item.label}
      </span>
    ))}
  </div>
);

export const Default = () => (
  <ThemeProvider>
    <div className={pageClassName}>
      <ChartContainer
        title="Portfolio vs Benchmark"
        subtitle="visx XYChart: dual line series, axes, grid, interactive tooltip"
        footer="Hover a point to inspect values; colors are theme tokens."
      >
        <XYChart
          theme={chartTheme}
          width={1040}
          height={280}
          xScale={{ type: 'band', paddingInner: 0.3 }}
          yScale={{ type: 'linear', nice: true }}
        >
          <Grid columns={false} numTicks={4} />
          <LineSeries
            dataKey="Portfolio"
            data={portfolio}
            xAccessor={xAccessor}
            yAccessor={yAccessor}
          />
          <LineSeries
            dataKey="Benchmark"
            data={benchmark}
            xAccessor={xAccessor}
            yAccessor={yAccessor}
          />
          <Axis orientation="bottom" />
          <Axis orientation="left" numTicks={4} />
          <Tooltip
            snapTooltipToDatumX
            snapTooltipToDatumY
            showVerticalCrosshair
            showSeriesGlyphs
            renderTooltip={({ tooltipData }) => (
              <div>
                {tooltipData?.nearestDatum
                  ? `${tooltipData.nearestDatum.key}: ${yAccessor(
                      tooltipData.nearestDatum.datum as Point,
                    )}`
                  : null}
              </div>
            )}
          />
        </XYChart>
        <Legend
          items={[
            { label: 'Portfolio', color: chartTokens.series[0] },
            { label: 'Benchmark', color: chartTokens.series[1] },
          ]}
        />
      </ChartContainer>

      <div className={gridClassName}>
        <ChartContainer
          title="Inflows"
          subtitle="visx AreaSeries with token area fill"
        >
          <XYChart
            theme={chartTheme}
            width={500}
            height={240}
            xScale={{ type: 'band', paddingInner: 0.3 }}
            yScale={{ type: 'linear', nice: true }}
          >
            <Grid columns={false} numTicks={4} />
            <AreaSeries
              dataKey="Inflows"
              data={portfolio}
              xAccessor={xAccessor}
              yAccessor={yAccessor}
              fillOpacity={0.18}
            />
            <Axis orientation="bottom" />
            <Axis orientation="left" numTicks={4} />
          </XYChart>
        </ChartContainer>

        <ChartContainer
          title="Allocation by Chain"
          subtitle="visx BarGroup, part-to-whole"
        >
          <XYChart
            theme={chartTheme}
            width={500}
            height={240}
            xScale={{ type: 'band', paddingInner: 0.3, paddingOuter: 0.2 }}
            yScale={{ type: 'linear', nice: true }}
          >
            <Grid columns={false} numTicks={4} />
            <BarGroup>
              <BarSeries
                dataKey="Allocation"
                data={allocations}
                xAccessor={xAccessor}
                yAccessor={yAccessor}
              />
            </BarGroup>
            <Axis orientation="bottom" />
            <Axis orientation="left" numTicks={4} />
          </XYChart>
        </ChartContainer>
      </div>

      <ChartContainer
        title="Tooltip style"
        subtitle="Static preview of the token-themed tooltip surface"
      >
        <div className={tooltipPreviewClassName}>
          <strong>Thu</strong>
          <div style={{ color: chartTokens.series[0] }}>Portfolio: 182</div>
          <div style={{ color: chartTokens.series[1] }}>Benchmark: 156</div>
        </div>
      </ChartContainer>
    </div>
  </ThemeProvider>
);
