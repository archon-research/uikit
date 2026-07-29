import { StatRow, StatTile } from '@archon-research/design-system';

import { css } from '../../../styled-system/css';

export default {
  title: 'Molecules/StatTile',
};

const frameClassName = css({
  display: 'grid',
  gap: '6',
  p: '6',
  backgroundColor: 'surface.canvas',
  fontFamily: 'sans',
  color: 'text.default',
});

const captionClassName = css({
  fontSize: 'sm',
  color: 'text.muted',
});

// StatRow lays its tiles out on a responsive 2 -> 4 column grid.
export const Row = () => (
  <div className={frameClassName}>
    <StatRow>
      <StatTile label="Total AUM" value="$10.68M" sub="+2.4% 24h" />
      <StatTile label="Positions" value="18" sub="across 6 venues" />
      <StatTile label="Avg APY" value="4.2%" sub="net of fees" />
      <StatTile label="Idle cash" value="$412K" sub="3.9% of AUM" />
    </StatRow>
  </div>
);

// Tone colours the value + sub caption for semantic emphasis.
export const Tones = () => (
  <div className={frameClassName}>
    <StatRow>
      <StatTile label="Net flow" value="$1.24M" sub="last 24h" tone="default" />
      <StatTile
        label="Realized PnL"
        value="+$86.4K"
        sub="+1.8%"
        tone="success"
      />
      <StatTile label="Drawdown" value="-$42.1K" sub="-0.9%" tone="critical" />
    </StatRow>
  </div>
);

// `labelCase="upper"` renders the label as a wider-tracked micro-label.
export const LabelCase = () => (
  <div className={frameClassName}>
    <p className={captionClassName}>labelCase="none" (default) vs "upper"</p>
    <StatRow>
      <StatTile label="Sharpe ratio" value="1.84" labelCase="none" />
      <StatTile label="Sharpe ratio" value="1.84" labelCase="upper" />
    </StatRow>
  </div>
);

// A single tile without a sub caption.
export const Single = () => (
  <div className={frameClassName}>
    <StatTile label="Active alerts" value="3" tone="critical" />
  </div>
);
