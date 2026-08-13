import { Button, Popover } from '@archon-research/design-system';

import { css } from '../../../styled-system/css';

export default {
  title: 'Molecules/Popover',
};

const frameClassName = css({
  display: 'grid',
  gap: '6',
  p: '6',
  minHeight: '220px',
  backgroundColor: 'surface.canvas',
  fontFamily: 'sans',
  color: 'text.default',
});

const bodyClassName = css({ fontSize: 'sm', color: 'text.muted' });

// A themed, click-triggered popover over Ark Popover. Rendered open here so the
// content surface is visible; in use it opens on trigger click.
export const Default = () => (
  <div className={frameClassName}>
    <Popover.Root defaultOpen positioning={{ placement: 'bottom-start' }}>
      <Popover.Trigger asChild>
        <Button>Filters</Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner>
          <Popover.Content>
            <Popover.Title>Filters</Popover.Title>
            <Popover.Description className={bodyClassName}>
              Refine the table by venue and status. Content is focusable and
              selectable, unlike a hover tooltip.
            </Popover.Description>
            <Popover.CloseTrigger aria-label="Close">×</Popover.CloseTrigger>
            <Popover.Arrow />
          </Popover.Content>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  </div>
);
