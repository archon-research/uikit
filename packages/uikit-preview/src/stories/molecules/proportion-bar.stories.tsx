import { ProportionBar } from '@archon-research/design-system';

import { css } from '../../../styled-system/css';

export default {
  title: 'Molecules/ProportionBar',
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

// A single stacked bar of labelled shares with a legend and (by default) a
// visually-hidden table mirror. Segment colors default to the chart-series ramp.
export const Allocation = () => (
  <div className={frameClassName}>
    <p className={captionClassName}>Portfolio allocation by venue.</p>
    <ProportionBar
      caption="Portfolio allocation by venue"
      rows={[
        { key: 'aave', label: 'Aave', value: 42 },
        { key: 'morpho', label: 'Morpho', value: 28 },
        { key: 'spark', label: 'SparkLend', value: 18 },
        { key: 'idle', label: 'Idle', value: 12 },
      ]}
    />
  </div>
);

// Per-row colors can be supplied explicitly (e.g. an identity hue).
export const CustomColors = () => (
  <div className={frameClassName}>
    <ProportionBar
      caption="Exposure by side"
      rows={[
        {
          key: 'long',
          label: 'Long',
          value: 64,
          color: 'var(--colors-chart-series-positive)',
        },
        {
          key: 'short',
          label: 'Short',
          value: 36,
          color: 'var(--colors-chart-series-critical)',
        },
      ]}
    />
  </div>
);
