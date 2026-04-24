import { SkeletonStack } from '@archon-research/design-system';

import '../../styled-system/styles.css';
import { css } from '../../styled-system/css';

export default {
  title: 'Components/Skeleton Stack',
};

const stackClassName = css({
  display: 'grid',
  gap: '6',
  p: '6',
  maxWidth: 'lg',
  fontFamily: 'sans',
});

const titleClassName = css({
  color: 'text.default',
  fontSize: 'sm',
  fontWeight: 'medium',
  lineHeight: '1.4',
  mb: '2',
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
      <p className={titleClassName}>Default list placeholder</p>
      <SkeletonStack />
    </div>
  </div>
);

export const Dense = () => (
  <div className={stackClassName}>
    <div className={cardClassName}>
      <p className={titleClassName}>Dense list placeholder</p>
      <SkeletonStack count={8} itemHeight={40} />
    </div>
  </div>
);
