import {
  BarChart,
  Button,
  ChartContainer,
  LineChart,
  Sparkline,
  ThemeProvider,
} from '@archon-research/design-system';

import { css } from '../../../styled-system/css';

export default {
  title: 'Organisms/Charts',
};

const lineData = [
  { label: 'Mon', value: 124 },
  { label: 'Tue', value: 160 },
  { label: 'Wed', value: 142 },
  { label: 'Thu', value: 182 },
  { label: 'Fri', value: 176 },
  { label: 'Sat', value: 214 },
  { label: 'Sun', value: 205 },
];

const barData = [
  { label: 'ETH', value: 46 },
  { label: 'ARB', value: 24 },
  { label: 'POL', value: 12 },
  { label: 'OP', value: 18 },
];

const sparklineData = [
  { label: '1', value: 12 },
  { label: '2', value: 14 },
  { label: '3', value: 13 },
  { label: '4', value: 17 },
  { label: '5', value: 20 },
  { label: '6', value: 19 },
  { label: '7', value: 21 },
  { label: '8', value: 22 },
];

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
  '@media (max-width: 980px)': {
    gridTemplateColumns: '1fr',
  },
});

const sparklineRowClassName = css({
  display: 'grid',
  gap: '3',
});

const metricClassName = css({
  borderColor: 'border.subtle',
  borderStyle: 'solid',
  borderWidth: '1px',
  borderRadius: 'md',
  p: '3',
  display: 'grid',
  gap: '2',
});

export const Default = () => (
  <ThemeProvider>
    <div className={pageClassName}>
      <ChartContainer
        title="Weekly Portfolio Trend"
        subtitle="Illustrates line chart primitive with optional area fill"
        actions={<Button>Export CSV</Button>}
        footer="Source: internal simulation data"
      >
        <LineChart data={lineData} />
      </ChartContainer>

      <div className={gridClassName}>
        <ChartContainer
          title="Allocation by Chain"
          subtitle="Bar chart primitive for part-to-whole snapshots"
        >
          <BarChart data={barData} />
        </ChartContainer>

        <ChartContainer
          title="Metric Rail Sparklines"
          subtitle="Compact trend lines for KPI cards"
        >
          <div className={sparklineRowClassName}>
            <div className={metricClassName}>
              <strong>Portfolio Value</strong>
              <Sparkline data={sparklineData} />
            </div>
            <div className={metricClassName}>
              <strong>Risk Score</strong>
              <Sparkline
                data={sparklineData.map((item) => ({
                  ...item,
                  value: 26 - item.value,
                }))}
                stroke="var(--colors-text-interactive, #155eef)"
              />
            </div>
          </div>
        </ChartContainer>
      </div>
    </div>
  </ThemeProvider>
);
