import { SkeletonStack } from '@archon-research/design-system';

import { css } from '../../../styled-system/css';

export default {
  title: 'Molecules/Skeleton Stack',
};

const stackClassName = css({
  display: 'grid',
  gap: '6',
  p: '6',
  maxWidth: 'lg',
  fontFamily: 'sans',
});

const cardClassName = css({
  borderColor: 'border.subtle',
  borderRadius: 'md',
  borderStyle: 'solid',
  borderWidth: '1px',
  p: '4',
  bg: 'surface.default',
});

export const Default = () => (
  <div className={stackClassName}>
    <div className={cardClassName}>
      <SkeletonStack />
    </div>
  </div>
);

export const Dense = () => (
  <div className={stackClassName}>
    <div className={cardClassName}>
      <SkeletonStack count={8} itemHeight={40} />
    </div>
  </div>
);
