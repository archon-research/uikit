import { InfoTip } from '@archon-research/design-system';

import { css } from '../../../styled-system/css';

export default {
  title: 'Atoms/InfoTip',
};

const frameClassName = css({
  display: 'grid',
  gap: '6',
  p: '6',
  backgroundColor: 'surface.canvas',
  fontFamily: 'sans',
  color: 'text.default',
});

const rowClassName = css({
  alignItems: 'center',
  display: 'flex',
  gap: '2',
});

const captionClassName = css({
  fontSize: 'sm',
  color: 'text.muted',
});

// The trigger is a real focusable button; the bubble opens on hover *and*
// focus, is the single `aria-describedby` target, and takes no layout while
// closed. (Snapshots capture the closed, resting state.)
export const InLabel = () => (
  <div className={frameClassName}>
    <p className={captionClassName}>
      A help-tip beside a column header or metric label.
    </p>
    <div className={rowClassName}>
      <span>Net exposure</span>
      <InfoTip label="About net exposure">
        Long minus short, marked to the latest recorded price.
      </InfoTip>
    </div>
    <div className={rowClassName}>
      <span>Sharpe ratio</span>
      <InfoTip label="About the Sharpe ratio">
        Excess return per unit of volatility, annualized.
      </InfoTip>
    </div>
  </div>
);

export const Alignments = () => (
  <div className={frameClassName}>
    <p className={captionClassName}>align="start" | "center" | "end"</p>
    <div className={css({ display: 'flex', gap: '8' })}>
      <InfoTip label="Start-aligned" align="start">
        Anchored to the start edge of the trigger.
      </InfoTip>
      <InfoTip label="Center-aligned" align="center">
        Centered on the trigger.
      </InfoTip>
      <InfoTip label="End-aligned" align="end">
        Anchored to the end edge of the trigger.
      </InfoTip>
    </div>
  </div>
);
