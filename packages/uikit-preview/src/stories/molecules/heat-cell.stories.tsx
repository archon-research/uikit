import { HeatCell } from '@archon-research/design-system';

import { css } from '../../../styled-system/css';

export default {
  title: 'Molecules/Heat Cell',
};

const wrapperClassName = css({
  p: '6',
  display: 'grid',
  gap: '6',
  maxWidth: '4xl',
});

const gridClassName = css({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 1fr))',
  gap: '2',
});

const noteClassName = css({ fontSize: 'sm', color: 'text.muted' });

type Sector = { label: string; value: number; sub?: string };

const sectors: Sector[] = [
  { label: 'Energy', value: -4.2, sub: '−4.20%' },
  { label: 'Materials', value: -1.1, sub: '−1.10%' },
  { label: 'Industrials', value: 0.05, sub: '+0.05%' },
  { label: 'Financials', value: 1.8, sub: '+1.80%' },
  { label: 'Health Care', value: -2.6, sub: '−2.60%' },
  { label: 'Technology', value: 3.4, sub: '+3.40%' },
  { label: 'Consumer', value: 0.9, sub: '+0.90%' },
];

// HeatCell renders one tile — laying several out into a grid, and computing
// the shared domain they saturate against, is the consumer's job.
export const SectorHeatmap = () => {
  const domain = Math.max(0.0001, ...sectors.map((s) => Math.abs(s.value)));

  return (
    <div className={wrapperClassName}>
      <p className={noteClassName}>
        Seven fixed steps (green ↔ grey ↔ red), domain = the largest magnitude
        in this set (±{domain.toFixed(2)}%).
      </p>
      <div className={gridClassName}>
        {sectors.map((sector) => (
          <HeatCell
            key={sector.label}
            label={sector.label}
            value={sector.value}
            sub={sector.sub}
            domain={domain}
            format="percent"
          />
        ))}
      </div>
    </div>
  );
};

// All seven steps at a fixed domain, doubling as the scale's legend.
export const AllSteps = () => {
  const domain = 10;
  const values = [-10, -6.7, -3.3, 0, 3.3, 6.7, 10];

  return (
    <div className={wrapperClassName}>
      <p className={noteClassName}>
        The seven buckets a value can fall into, at domain = {domain}. Grey
        stays the flat centre — never a third hue.
      </p>
      <div className={gridClassName}>
        {values.map((value) => (
          <HeatCell
            key={value}
            label={value === 0 ? 'Flat' : value > 0 ? 'Positive' : 'Negative'}
            value={value}
            domain={domain}
            format="number"
          />
        ))}
      </div>
    </div>
  );
};
