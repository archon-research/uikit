import { Popover as ArkPopover } from '@ark-ui/react/popover';
import { Portal } from '@ark-ui/react/portal';
import type { ComponentPropsWithoutRef } from 'react';

/**
 * Class names emitted by the `popover` slot recipe (registered in the preset +
 * staticCss). The design-system package builds with `tsc` and ships no
 * generated `styled-system`, so the recipe is applied by its stable slot class
 * names (`popover__${slot}`). Behavior (open/close, focus trap, dismiss,
 * positioning) comes from Ark; this file only skins it — the click-triggered,
 * focusable-content counterpart to the hover-only `Tooltip`/`InfoTip`.
 */
const slots = {
  positioner: 'popover__positioner',
  content: 'popover__content',
  title: 'popover__title',
  description: 'popover__description',
  closeTrigger: 'popover__closeTrigger',
  arrow: 'popover__arrow',
  arrowTip: 'popover__arrowTip',
} as const;

const cx = (...classes: Array<string | false | null | undefined>): string =>
  classes.filter(Boolean).join(' ');

function PopoverPositioner({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof ArkPopover.Positioner>) {
  return (
    <ArkPopover.Positioner
      {...props}
      className={cx(slots.positioner, className)}
    />
  );
}

function PopoverContent({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof ArkPopover.Content>) {
  return (
    <ArkPopover.Content {...props} className={cx(slots.content, className)} />
  );
}

function PopoverTitle({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof ArkPopover.Title>) {
  return <ArkPopover.Title {...props} className={cx(slots.title, className)} />;
}

function PopoverDescription({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof ArkPopover.Description>) {
  return (
    <ArkPopover.Description
      {...props}
      className={cx(slots.description, className)}
    />
  );
}

function PopoverCloseTrigger({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof ArkPopover.CloseTrigger>) {
  return (
    <ArkPopover.CloseTrigger
      {...props}
      className={cx(slots.closeTrigger, className)}
    />
  );
}

function PopoverArrow({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof ArkPopover.Arrow>) {
  return (
    <ArkPopover.Arrow {...props} className={cx(slots.arrow, className)}>
      {children ?? <ArkPopover.ArrowTip className={slots.arrowTip} />}
    </ArkPopover.Arrow>
  );
}

/**
 * Click-triggered popover skinned with the `popover` slot recipe. Composition
 * mirrors Ark: wrap `Positioner` (+ `Content`) in `Popover.Portal` for correct
 * stacking. Structural parts (`Root`, `Trigger`, `Anchor`, `Context`) pass
 * through Ark unchanged so all behavior is preserved.
 *
 * ```tsx
 * <Popover.Root>
 *   <Popover.Trigger asChild><Button>Filters</Button></Popover.Trigger>
 *   <Popover.Portal>
 *     <Popover.Positioner>
 *       <Popover.Content>…</Popover.Content>
 *     </Popover.Positioner>
 *   </Popover.Portal>
 * </Popover.Root>
 * ```
 */
export const Popover = {
  Root: ArkPopover.Root,
  Trigger: ArkPopover.Trigger,
  Anchor: ArkPopover.Anchor,
  Indicator: ArkPopover.Indicator,
  Portal,
  Positioner: PopoverPositioner,
  Content: PopoverContent,
  Title: PopoverTitle,
  Description: PopoverDescription,
  CloseTrigger: PopoverCloseTrigger,
  Arrow: PopoverArrow,
  Context: ArkPopover.Context,
};
