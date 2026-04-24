import { Button } from '@archon-research/design-system';

import { css } from '../../styled-system/css';

export default {
  title: 'Components/Button',
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

const labelClassName = css({
  color: 'text.muted',
  fontSize: 'sm',
  fontWeight: 'medium',
  lineHeight: '1.4',
  mb: '2',
});

export const Panel = () => (
  <div className={frameClassName}>
    <div>
      <p className={labelClassName}>Panel variant (default)</p>
      <div className={rowClassName}>
        <Button>Default</Button>
        <Button disabled>Disabled</Button>
      </div>
    </div>
    <div>
      <p className={labelClassName}>Panel - Large</p>
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
      <p className={labelClassName}>Item variant (comfortable)</p>
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
      <p className={labelClassName}>Item variant (compact)</p>
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
      <p className={labelClassName}>Icon-only button</p>
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
