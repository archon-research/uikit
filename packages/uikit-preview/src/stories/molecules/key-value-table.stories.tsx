import { KeyValueTable } from '@archon-research/design-system';

import { css } from '../../../styled-system/css';

export default {
  title: 'Molecules/KeyValueTable',
};

const frameClassName = css({
  display: 'grid',
  gap: '6',
  p: '6',
  maxWidth: '420px',
  backgroundColor: 'surface.canvas',
  fontFamily: 'sans',
  color: 'text.default',
});

// A small summary table: labels on the left, figure-styled values on the right.
export const Summary = () => (
  <div className={frameClassName}>
    <KeyValueTable
      caption="Risk summary"
      rows={[
        { key: 'var', label: 'VaR (95%)', value: '$1.24M' },
        { key: 'es', label: 'Expected shortfall', value: '$1.81M' },
        { key: 'beta', label: 'Portfolio beta', value: '0.87' },
        {
          key: 'status',
          label: 'Status',
          value: 'Within limits',
          mono: false,
          align: 'start',
        },
      ]}
    />
  </div>
);

// `density="compact"` tightens the rows.
export const Compact = () => (
  <div className={frameClassName}>
    <KeyValueTable
      density="compact"
      rows={[
        { key: 'aum', label: 'Total AUM', value: '$10.68M' },
        { key: 'positions', label: 'Positions', value: '18' },
        { key: 'apy', label: 'Avg APY', value: '4.2%' },
      ]}
    />
  </div>
);
