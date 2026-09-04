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

export const Static = () => (
  <div className={stackClassName}>
    <div className={cardClassName}>
      <SkeletonStack animate={false} />
    </div>
  </div>
);

const subtleCardClassName = css({
  borderColor: 'border.subtle',
  borderRadius: 'md',
  borderStyle: 'solid',
  borderWidth: '1px',
  p: '4',
  bg: 'surface.subtle',
});

const cardLabelClassName = css({
  textStyle: 'sectionLabel',
  color: 'text.muted',
  mb: '3',
});

// Regression coverage for the skeleton fill: the same stack on both surface
// steps a card is normally built from. A surface-toned fill is invisible on
// whichever step it matches — the recessed card below rendered a blank area
// until the fill moved to `border.subtle`. Both panels must show bars.
export const OnCardSurfaces = () => (
  <div className={stackClassName}>
    <div className={cardClassName}>
      <div className={cardLabelClassName}>surface.default</div>
      <SkeletonStack count={3} itemHeight={40} />
    </div>
    <div className={subtleCardClassName}>
      <div className={cardLabelClassName}>surface.subtle</div>
      <SkeletonStack count={3} itemHeight={40} />
    </div>
  </div>
);
