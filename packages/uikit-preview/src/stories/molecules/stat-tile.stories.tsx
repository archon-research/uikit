import { Badge, StatRow, StatTile } from '@archon-research/design-system';
import { TrendingDown, TrendingUp } from 'lucide-react';

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

// Narrow frame that forces the value row to wrap.
const narrowClassName = css({
  maxWidth: '48',
});

// A unit reads as supporting type next to the figure, not as part of it.
const unitClassName = css({
  fontSize: 'sm',
  fontWeight: 'medium',
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

// `density="compact"` renders the label + sub as tighter micro type.
export const Density = () => (
  <div className={frameClassName}>
    <p className={captionClassName}>
      density="comfortable" (default) vs "compact"
    </p>
    <StatRow>
      <StatTile
        label="Total AUM"
        value="$10.68M"
        sub="+2.4% 24h"
        density="comfortable"
      />
      <StatTile
        label="Total AUM"
        value="$10.68M"
        sub="+2.4% 24h"
        density="compact"
      />
    </StatRow>
  </div>
);

// The value and sub slots are inline rows, so an adornment (unit, delta badge,
// trend icon) sits beside the text with no consumer layout styles.
export const ValueAdornments = () => (
  <div className={frameClassName}>
    <StatRow>
      <StatTile
        label="Total AUM"
        value={
          <>
            <span>$10.68M</span>
            <Badge variant="subtle" colorPalette="green" size="sm">
              +2.4%
            </Badge>
          </>
        }
        sub={
          <>
            <TrendingUp size={12} aria-hidden="true" />
            <span>24h</span>
          </>
        }
      />
      <StatTile
        label="Avg APY"
        value={
          <>
            <span>4.2</span>
            <span className={unitClassName}>%</span>
          </>
        }
        sub="net of fees"
      />
      <StatTile
        label="Drawdown"
        value={
          <>
            <span>-$42.1K</span>
            <Badge variant="subtle" colorPalette="red" size="sm">
              -0.9%
            </Badge>
          </>
        }
        sub={
          <>
            <TrendingDown size={12} aria-hidden="true" />
            <span>peak to trough</span>
          </>
        }
        tone="critical"
      />
    </StatRow>
  </div>
);

// The spacing contract of a multi-child value, pinned in pixels: the slot's
// `gap` owns the space between children and literal whitespace between them is
// NOT rendered (flex layout drops a whitespace-only text run between two
// items). So the first two tiles render identically — the typed space in the
// first buys nothing, and neither would an explicit `{' '}`. Only a single text
// child keeps its own spaces (third tile), because there the space is inside
// one text run rather than a separator between two items.
export const ValueSpacing = () => (
  <div className={frameClassName}>
    <p className={captionClassName}>
      Tiles 1 and 2 render the same; only the one-text-child tile keeps a
      literal space.
    </p>
    <StatRow>
      <StatTile
        label="Two children, space between"
        value={
          <>
            <span>4.2</span> <span className={unitClassName}>%</span>
          </>
        }
        sub={
          <>
            <span>+0.3</span> <span className={unitClassName}>pp</span>
          </>
        }
      />
      <StatTile
        label="Two children, no space"
        value={
          <>
            <span>4.2</span>
            <span className={unitClassName}>%</span>
          </>
        }
        sub={
          <>
            <span>+0.3</span>
            <span className={unitClassName}>pp</span>
          </>
        }
      />
      <StatTile label="One text child" value="4.2 %" sub="+0.3 pp" />
    </StatRow>
  </div>
);

// In a narrow tile the row wraps instead of overflowing the frame.
export const ValueWrap = () => (
  <div className={frameClassName}>
    <p className={captionClassName}>
      A value that cannot share one line wraps within the tile.
    </p>
    <div className={narrowClassName}>
      <StatTile
        label="Settled notional"
        value={
          <>
            <span>1,284,930.44</span>
            <span className={unitClassName}>USDC</span>
          </>
        }
        sub="since 00:00 UTC"
      />
    </div>
  </div>
);

// A single tile without a sub caption.
export const Single = () => (
  <div className={frameClassName}>
    <StatTile label="Active alerts" value="3" tone="critical" />
  </div>
);
