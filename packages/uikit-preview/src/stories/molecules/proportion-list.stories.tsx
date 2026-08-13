import { ProportionList } from '@archon-research/design-system';

import { css } from '../../../styled-system/css';

export default {
  title: 'Molecules/ProportionList',
};

const frameClassName = css({
  display: 'grid',
  gap: '6',
  p: '6',
  maxWidth: '520px',
  backgroundColor: 'surface.canvas',
  fontFamily: 'sans',
  color: 'text.default',
});

const captionClassName = css({
  fontSize: 'sm',
  color: 'text.muted',
});

// N labelled bars on a common baseline (one track per row), distinct from the
// single stacked ProportionBar. By default each bar is measured against the
// largest value, so magnitudes are comparable at a glance.
export const Weights = () => (
  <div className={frameClassName}>
    <p className={captionClassName}>
      Strategy weights, relative to the largest.
    </p>
    <ProportionList
      caption="Strategy weights"
      rows={[
        { key: 'carry', label: 'Carry', value: 42, valueText: '42%' },
        { key: 'momentum', label: 'Momentum', value: 28, valueText: '28%' },
        {
          key: 'meanrev',
          label: 'Mean reversion',
          value: 18,
          valueText: '18%',
        },
        { key: 'cash', label: 'Cash', value: 12, valueText: '12%' },
      ]}
    />
  </div>
);

// Per-row colors and a fixed denominator (shares of a whole).
export const SharesOfTotal = () => (
  <div className={frameClassName}>
    <ProportionList
      caption="Exposure by venue"
      max={100}
      rows={[
        {
          key: 'aave',
          label: 'Aave',
          value: 42,
          valueText: '42%',
          color: 'var(--colors-chart-series-primary)',
        },
        {
          key: 'morpho',
          label: 'Morpho',
          value: 28,
          valueText: '28%',
          color: 'var(--colors-chart-series-secondary)',
        },
        {
          key: 'spark',
          label: 'SparkLend',
          value: 30,
          valueText: '30%',
          color: 'var(--colors-chart-series-tertiary)',
        },
      ]}
    />
  </div>
);
