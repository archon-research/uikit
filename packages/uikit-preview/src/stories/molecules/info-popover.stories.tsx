import { InfoPopover } from '@archon-research/design-system';

import { css } from '../../../styled-system/css';

export default {
  title: 'Molecules/InfoPopover',
};

const frameClassName = css({
  display: 'grid',
  gap: '6',
  p: '6',
  minHeight: '220px',
  backgroundColor: 'surface.canvas',
  fontFamily: 'sans',
  color: 'text.default',
});

const rowClassName = css({
  display: 'flex',
  alignItems: 'center',
  gap: '2',
  fontSize: 'sm',
});

// The click-triggered, focusable counterpart to InfoTip: its bubble can carry a
// deeplink and selectable copy. Rendered open here to show the content.
export const WithDeeplink = () => (
  <div className={frameClassName}>
    <span className={rowClassName}>
      Net exposure
      <InfoPopover
        defaultOpen
        label="About net exposure"
        title="Net exposure"
        href="#glossary/net-exposure"
        linkText="Open in glossary →"
      >
        Long minus short, marked to the latest recorded price.
      </InfoPopover>
    </span>
  </div>
);

// Closed resting state (trigger only) — opens on click.
export const Trigger = () => (
  <div className={frameClassName}>
    <span className={rowClassName}>
      Sharpe ratio
      <InfoPopover label="About the Sharpe ratio">
        Excess return per unit of volatility, annualized.
      </InfoPopover>
    </span>
  </div>
);
