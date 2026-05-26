import { Badge } from '@archon-research/design-system';

import { css } from '../../../styled-system/css';

export default {
  title: 'Atoms/Badge',
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
  gap: '3',
});

const labelClassName = css({
  color: 'text.muted',
  fontSize: 'sm',
  fontWeight: 'medium',
  lineHeight: '1.4',
  mb: '2',
});

export const Tones = () => (
  <div className={frameClassName}>
    <div>
      <p className={labelClassName}>Badge tones</p>
      <div className={rowClassName}>
        <Badge tone="neutral">Neutral</Badge>
        <Badge tone="success">Success</Badge>
        <Badge tone="warning">Warning</Badge>
        <Badge tone="danger">Danger</Badge>
      </div>
    </div>
  </div>
);

export const InContext = () => (
  <div className={frameClassName}>
    <div className={rowClassName}>
      <span>Build pipeline</span>
      <Badge tone="success">Healthy</Badge>
    </div>
    <div className={rowClassName}>
      <span>Incident response</span>
      <Badge tone="warning">Needs attention</Badge>
    </div>
  </div>
);
