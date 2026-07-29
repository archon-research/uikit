import { Button } from '@archon-research/design-system';
import { Plus, Settings2, X } from 'lucide-react';

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

const inlineRowClassName = css({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: '3',
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

export const Sizes = () => (
  <div className={frameClassName}>
    <div className={inlineRowClassName}>
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  </div>
);

// `emphasis="solid"` + a `colorPalette` produces CTA / destructive fills from
// dark-aware role tokens (no one-off variants).
export const Emphasis = () => (
  <div className={frameClassName}>
    <div className={inlineRowClassName}>
      <Button emphasis="solid" colorPalette="blue">
        Primary CTA
      </Button>
      <Button emphasis="solid" colorPalette="green">
        Confirm
      </Button>
      <Button emphasis="solid" colorPalette="red">
        Delete
      </Button>
      <Button emphasis="solid" colorPalette="neutral">
        Neutral solid
      </Button>
    </div>
    <div className={inlineRowClassName}>
      <Button emphasis="solid" colorPalette="blue" disabled>
        Disabled CTA
      </Button>
    </div>
  </div>
);

// `density="compact"` now visibly compacts the panel variant.
export const Density = () => (
  <div className={frameClassName}>
    <div className={inlineRowClassName}>
      <Button density="comfortable">Comfortable panel</Button>
      <Button density="compact">Compact panel</Button>
      <Button density="compact" emphasis="solid" colorPalette="blue">
        Compact CTA
      </Button>
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
        <Button iconOnly size="sm" title="Settings">
          <Settings2 size={14} strokeWidth={1.9} />
        </Button>
        <Button iconOnly title="Settings">
          <Settings2 size={16} strokeWidth={1.9} />
        </Button>
        <Button iconOnly size="lg" title="Add">
          <Plus size={18} strokeWidth={1.9} />
        </Button>
        <Button iconOnly disabled title="Disabled">
          <X size={16} strokeWidth={1.9} />
        </Button>
      </div>
    </div>
  </div>
);
