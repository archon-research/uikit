import { StatusPill, StatusPillRow } from '@archon-research/design-system';

import { css } from '../../../styled-system/css';

export default {
  title: 'Atoms/StatusPill',
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

// A two-part name:value pill; tone colors the value + dot so the state is never
// carried by color alone.
export const Tones = () => (
  <div className={frameClassName}>
    <StatusPillRow>
      <StatusPill name="paper" value="live" tone="success" />
      <StatusPill name="mode" value="replay" tone="neutral" />
      <StatusPill name="data" value="stale" tone="warning" />
      <StatusPill name="chain" value="reorg" tone="critical" />
    </StatusPillRow>
  </div>
);

// A cluster wraps at narrow widths via StatusPillRow.
export const Row = () => (
  <div className={frameClassName}>
    <p className={captionClassName}>Six shell status pills.</p>
    <StatusPillRow>
      <StatusPill
        name="paper"
        value="acct-01"
        tone="neutral"
        indicator={false}
      />
      <StatusPill name="mode" value="live" tone="success" />
      <StatusPill name="cursor" value="#124" tone="neutral" />
      <StatusPill name="session" value="active" tone="success" />
      <StatusPill name="data" value="delayed" tone="warning" />
      <StatusPill name="chain" value="synced" tone="success" />
    </StatusPillRow>
  </div>
);
