import { Button } from '@archon-research/design-system';

import { css } from '../../../styled-system/css';

export default {
  title: 'Atoms/Button',
};

const frameClassName = css({
  display: 'grid',
  gap: '4',
  p: '6',
  fontFamily: 'sans',
});

const rowClassName = css({
  display: 'grid',
  gap: '3',
  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
});

export const Panel = () => (
  <div className={frameClassName}>
    <div>
      <div className={rowClassName}>
        <Button>Default</Button>
        <Button disabled>Disabled</Button>
      </div>
    </div>
    <div>
      <div className={rowClassName}>
        <Button size="lg">Large</Button>
        <Button size="lg" disabled>
          Disabled
        </Button>
      </div>
    </div>
  </div>
);

export const Item = () => (
  <div className={frameClassName}>
    <div>
      <div className={css({ display: 'grid', gap: '2' })}>
        <Button variant="item">Navigation item</Button>
        <Button variant="item" selected>
          Selected item
        </Button>
        <Button variant="item" tone="subdued">
          Subdued item
        </Button>
        <Button variant="item" disabled>
          Disabled item
        </Button>
      </div>
    </div>
    <div>
      <div className={css({ display: 'grid', gap: '2' })}>
        <Button variant="item" density="compact">
          Compact item
        </Button>
        <Button variant="item" density="compact" selected>
          Selected compact
        </Button>
      </div>
    </div>
  </div>
);

export const IconOnly = () => (
  <div className={frameClassName}>
    <div>
      <div className={rowClassName}>
        <Button iconOnly title="Settings">
          ⚙️
        </Button>
        <Button iconOnly size="lg" title="Add">
          ➕
        </Button>
        <Button iconOnly disabled title="Disabled">
          ❌
        </Button>
      </div>
    </div>
  </div>
);
