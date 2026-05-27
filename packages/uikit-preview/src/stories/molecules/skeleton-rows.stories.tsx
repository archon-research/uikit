import { SkeletonRows } from '@archon-research/design-system';

import { css } from '../../../styled-system/css';

export default {
  title: 'Molecules/Skeleton Rows',
};

const frameClassName = css({
  borderColor: 'border.subtle',
  borderRadius: 'md',
  borderStyle: 'solid',
  borderWidth: '1px',
  overflow: 'hidden',
  width: 'full',
  maxWidth: '6xl',
});

const tableClassName = css({
  width: 'full',
  borderCollapse: 'collapse',
  bg: 'surface.default',
});

const stackClassName = css({
  display: 'grid',
  gap: '6',
  p: '6',
  fontFamily: 'sans',
});

export const Default = () => (
  <div className={stackClassName}>
    <div>
      <div className={frameClassName}>
        <table className={tableClassName}>
          <tbody>
            <SkeletonRows />
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

export const Compact = () => (
  <div className={stackClassName}>
    <div>
      <div className={frameClassName}>
        <table className={tableClassName}>
          <tbody>
            <SkeletonRows rows={4} columns={4} firstColumnTall={false} />
          </tbody>
        </table>
      </div>
    </div>
  </div>
);
