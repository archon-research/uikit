import { TreeRow } from '@archon-research/design-system';

import { css } from '../../../styled-system/css';

export default {
  title: 'Atoms/Tree Row',
};

const frameClassName = css({
  display: 'grid',
  gap: '4',
  p: '6',
  fontFamily: 'sans',
});

const stackClassName = css({
  display: 'grid',
  gap: '2',
  width: '72',
});

const connectorClassName = css({
  position: 'absolute',
  top: '50%',
  left: '0.45rem',
  width: '0.45rem',
  height: '1px',
  bg: 'border.subtle',
  transform: 'translateY(-50%)',
  pointerEvents: 'none',
});

const mutedCopyClassName = css({
  color: 'text.muted',
  fontSize: 'sm',
});

const chevronClassName = css({
  fontSize: 'md',
  lineHeight: '1',
  fontWeight: 'semibold',
});

export const BranchRows = () => (
  <div className={frameClassName}>
    <div className={stackClassName}>
      <TreeRow
        label="Collateral checks"
        leading={<span className={chevronClassName}>v</span>}
        selected
      />
      <TreeRow
        label="Eligibility rules"
        leading={<span className={chevronClassName}>{'>'}</span>}
      />
      <TreeRow
        label="Pending migration"
        leading={<span className={chevronClassName}>{'>'}</span>}
        tone="subdued"
      />
    </div>
  </div>
);

export const NestedRows = () => (
  <div className={frameClassName}>
    <div className={stackClassName}>
      <TreeRow
        label="Parent node"
        leading={<span className={chevronClassName}>v</span>}
        selected
      />
      <TreeRow
        label="Nested child node"
        reserveLeadingSpace
        beforeLabel={<span aria-hidden className={connectorClassName} />}
        style={{ marginLeft: '1.1rem', width: 'calc(100% - 1.1rem)' }}
      />
      <TreeRow
        label="Deeply nested child with a long label that truncates cleanly"
        reserveLeadingSpace
        beforeLabel={<span aria-hidden className={connectorClassName} />}
        style={{ marginLeft: '2.2rem', width: 'calc(100% - 2.2rem)' }}
      />
    </div>
    <p className={mutedCopyClassName}>
      TreeRow keeps the disclosure slot and label truncation consistent while
      consumers own indentation and rails.
    </p>
  </div>
);
