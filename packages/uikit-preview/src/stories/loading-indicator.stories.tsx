import { LoadingIndicator } from '@archon-research/design-system';

import { css } from '../../styled-system/css';

export default {
  title: 'Components/Loading Indicator',
};

const frameClassName = css({
  display: 'grid',
  gap: '4',
  p: '6',
  maxWidth: 'md',
  fontFamily: 'sans',
});

const rowClassName = css({
  alignItems: 'center',
  display: 'flex',
  gap: '3',
});

export const Default = () => (
  <div className={frameClassName}>
    <LoadingIndicator message="Loading preview data..." />
  </div>
);

export const InContext = () => (
  <div className={frameClassName}>
    <div className={rowClassName}>
      <LoadingIndicator message="Fetching design tokens" />
    </div>
    <div className={rowClassName}>
      <LoadingIndicator message="Syncing component metadata" />
    </div>
  </div>
);
