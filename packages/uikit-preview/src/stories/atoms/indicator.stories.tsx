import { Indicator } from '@archon-research/design-system';

import { css } from '../../../styled-system/css';

export default {
  title: 'Atoms/Indicator',
};

const frameClassName = css({
  display: 'grid',
  gap: '6',
  p: '6',
  fontFamily: 'sans',
});

const rowClassName = css({
  alignItems: 'center',
  display: 'flex',
  flexWrap: 'wrap',
  gap: '5',
});

const captionClassName = css({
  fontSize: 'sm',
  color: 'text.muted',
});

// Every status the Indicator can render. `pending` pulses to read as
// "in transition".
const STATUSES = ['idle', 'ready', 'active', 'pending', 'error'] as const;

export const Statuses = () => (
  <div className={frameClassName}>
    <p className={captionClassName}>
      The status dot drives colour and (for <code>pending</code>) a pulse.
    </p>
    <div className={rowClassName}>
      {STATUSES.map((status) => (
        <Indicator key={status} status={status}>
          {status}
        </Indicator>
      ))}
    </div>
  </div>
);

export const DotOnly = () => (
  <div className={frameClassName}>
    <p className={captionClassName}>Without a label, just the dot.</p>
    <div className={rowClassName}>
      {STATUSES.map((status) => (
        <Indicator key={status} status={status} aria-label={status} />
      ))}
    </div>
  </div>
);

export const Sizes = () => (
  <div className={frameClassName}>
    <p className={captionClassName}>The dot diameter is configurable.</p>
    <div className={rowClassName}>
      <Indicator status="active" size={6}>
        6px
      </Indicator>
      <Indicator status="active" size={8}>
        8px (default)
      </Indicator>
      <Indicator status="active" size={12}>
        12px
      </Indicator>
      <Indicator status="active" size={16}>
        16px
      </Indicator>
    </div>
  </div>
);

export const InContext = () => (
  <div className={frameClassName}>
    <div className={rowClassName}>
      <span>Relay back-channel</span>
      <Indicator status="active">Connected</Indicator>
    </div>
    <div className={rowClassName}>
      <span>Harness</span>
      <Indicator status="ready">Waiting</Indicator>
    </div>
    <div className={rowClassName}>
      <span>Reconnecting</span>
      <Indicator status="pending">Pending</Indicator>
    </div>
  </div>
);
