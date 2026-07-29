import { Button, Drawer } from '@archon-research/design-system';
import { useState } from 'react';

import { css } from '../../../styled-system/css';

export default {
  title: 'Organisms/Drawer',
};

const frameClassName = css({
  display: 'grid',
  gap: '4',
  p: '6',
  backgroundColor: 'surface.canvas',
  fontFamily: 'sans',
  color: 'text.default',
});

const bodyClassName = css({
  display: 'grid',
  gap: '3',
  p: '5',
});

const paragraphClassName = css({
  fontSize: 'sm',
  lineHeight: 'relaxed',
  color: 'text.muted',
});

const footerClassName = css({
  display: 'flex',
  gap: '2',
  justifyContent: 'flex-end',
  p: '5',
  borderTopColor: 'border.subtle',
  borderTopStyle: 'solid',
  borderTopWidth: '1px',
});

// Ark owns the behavior (Esc, scrim, scroll-lock, focus trap); the design-system
// skin styles each slot. Here the Root is controlled so a design-system Button
// can open it and the footer Button can close it, alongside the built-in
// CloseTrigger for the header dismiss affordance.
export const Default = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className={frameClassName}>
      <Button onClick={() => setOpen(true)}>Open drawer</Button>

      <Drawer.Root
        open={open}
        onOpenChange={(details) => setOpen(details.open)}
      >
        <Drawer.Portal>
          <Drawer.Backdrop />
          <Drawer.Positioner>
            <Drawer.Content>
              <div className={bodyClassName}>
                <Drawer.Title>Position details</Drawer.Title>
                <Drawer.Description>
                  Lido · stETH — 45.6% of portfolio
                </Drawer.Description>
                <p className={paragraphClassName}>
                  The drawer slides in from the right and traps focus. Press
                  Escape, click the scrim, or use a button below to dismiss it.
                </p>
                <Drawer.CloseTrigger>Close</Drawer.CloseTrigger>
              </div>
              <div className={footerClassName}>
                <Button tone="subdued" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  emphasis="solid"
                  colorPalette="blue"
                  onClick={() => setOpen(false)}
                >
                  Save
                </Button>
              </div>
            </Drawer.Content>
          </Drawer.Positioner>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
};

// Rendered already-open so the open state is visible without interaction.
export const OpenByDefault = () => {
  const [open, setOpen] = useState(true);

  return (
    <div className={frameClassName}>
      <Button onClick={() => setOpen(true)}>Reopen drawer</Button>

      <Drawer.Root
        open={open}
        onOpenChange={(details) => setOpen(details.open)}
      >
        <Drawer.Portal>
          <Drawer.Backdrop />
          <Drawer.Positioner>
            <Drawer.Content>
              <div className={bodyClassName}>
                <Drawer.Title>Filters</Drawer.Title>
                <Drawer.Description>
                  Narrow the allocation list.
                </Drawer.Description>
                <p className={paragraphClassName}>
                  This story mounts with the drawer open to snapshot the
                  expanded state.
                </p>
              </div>
              <div className={footerClassName}>
                <Drawer.CloseTrigger>Done</Drawer.CloseTrigger>
              </div>
            </Drawer.Content>
          </Drawer.Positioner>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
};
