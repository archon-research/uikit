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

const fixedTableClassName = css({
  width: 'full',
  borderCollapse: 'collapse',
  bg: 'surface.default',
  tableLayout: 'fixed',
});

// Regression coverage for pairing DataTable's expandable rows with its
// loading skeleton: a ~32px leading expander-style column must still show a
// visible (proportionally inset) block instead of being swallowed by fixed
// cell padding.
export const NarrowLeadingColumn = () => (
  <div className={stackClassName}>
    <div>
      <div className={frameClassName}>
        <table className={fixedTableClassName}>
          <colgroup>
            <col style={{ width: 32 }} />
          </colgroup>
          <tbody>
            <SkeletonRows firstColumnTall={false} />
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

export const Static = () => (
  <div className={stackClassName}>
    <div>
      <div className={frameClassName}>
        <table className={tableClassName}>
          <tbody>
            <SkeletonRows animate={false} />
          </tbody>
        </table>
      </div>
    </div>
  </div>
);
