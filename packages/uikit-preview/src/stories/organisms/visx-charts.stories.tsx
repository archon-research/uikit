import {
  AreaSeries,
  Axis,
  BarGroup,
  BarSeries,
  Grid,
  LineSeries,
  Tooltip,
  XYChart,
  chartTheme,
  chartTokens,
} from '@archon-research/charting';
import { ThemeProvider } from '@archon-research/design-system';
import type { ReactNode } from 'react';

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

const panelClassName = css({
  borderColor: 'border.subtle',
  borderStyle: 'solid',
  borderWidth: '1px',
  borderRadius: 'xl',
  background: 'surface.default',
  overflow: 'hidden',
});

const panelHeaderClassName = css({
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '3',
  p: '4',
  borderBottomColor: 'border.subtle',
  borderBottomStyle: 'solid',
  borderBottomWidth: '1px',
});

const panelTitleClassName = css({
  fontSize: 'sm',
  fontWeight: 600,
  color: 'text.default',
});

const panelSubtitleClassName = css({
  fontSize: 'xs',
  color: 'text.muted',
  mt: '1',
});

const panelBodyClassName = css({ p: '4' });

const panelFooterClassName = css({
  px: '4',
  py: '3',
  borderTopColor: 'border.subtle',
  borderTopStyle: 'solid',
  borderTopWidth: '1px',
  fontSize: 'xs',
  color: 'text.muted',
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

const Panel = ({
  title,
  subtitle,
  footer,
  children,
}: {
  title: string;
  subtitle?: string;
  footer?: ReactNode;
  children: ReactNode;
}) => (
  <section className={panelClassName}>
    <header className={panelHeaderClassName}>
      <div>
        <h3 className={panelTitleClassName}>{title}</h3>
        {subtitle ? <p className={panelSubtitleClassName}>{subtitle}</p> : null}
      </div>
    </header>
    <div className={panelBodyClassName}>{children}</div>
    {footer ? <footer className={panelFooterClassName}>{footer}</footer> : null}
  </section>
);

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
      <Panel
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
      </Panel>

      <div className={gridClassName}>
        <Panel title="Inflows" subtitle="visx AreaSeries with token area fill">
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
        </Panel>

        <Panel
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
        </Panel>
      </div>

      <Panel
        title="Tooltip style"
        subtitle="Static preview of the token-themed tooltip surface"
      >
        <div className={tooltipPreviewClassName}>
          <strong>Thu</strong>
          <div style={{ color: chartTokens.series[0] }}>Portfolio: 182</div>
          <div style={{ color: chartTokens.series[1] }}>Benchmark: 156</div>
        </div>
      </Panel>
    </div>
  </ThemeProvider>
);
