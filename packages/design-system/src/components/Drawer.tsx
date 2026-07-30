import { Drawer as ArkDrawer } from '@ark-ui/react/drawer';
import { Portal } from '@ark-ui/react/portal';
import type { ComponentPropsWithoutRef } from 'react';

/**
 * Class names emitted by the `drawer` slot recipe (registered in the preset).
 * The design-system package builds with `tsc` and ships no generated
 * `styled-system`, so the recipe is applied by its stable slot class names
 * (Panda convention: `${className}__${slot}`). The recipe must be added to
 * `staticCss` so these classes are always generated. Behavior (Esc handling,
 * scrim, scroll-lock, focus trap) comes from Ark; this file only skins it.
 */
const slots = {
  backdrop: 'drawer__backdrop',
  positioner: 'drawer__positioner',
  content: 'drawer__content',
  title: 'drawer__title',
  description: 'drawer__description',
  closeTrigger: 'drawer__closeTrigger',
} as const;

const cx = (...classes: Array<string | false | null | undefined>): string =>
  classes.filter(Boolean).join(' ');

function DrawerBackdrop({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof ArkDrawer.Backdrop>) {
  return (
    <ArkDrawer.Backdrop {...props} className={cx(slots.backdrop, className)} />
  );
}

function DrawerPositioner({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof ArkDrawer.Positioner>) {
  return (
    <ArkDrawer.Positioner
      {...props}
      className={cx(slots.positioner, className)}
    />
  );
}

function DrawerContent({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof ArkDrawer.Content>) {
  return (
    <ArkDrawer.Content {...props} className={cx(slots.content, className)} />
  );
}

function DrawerTitle({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof ArkDrawer.Title>) {
  return <ArkDrawer.Title {...props} className={cx(slots.title, className)} />;
}

function DrawerDescription({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof ArkDrawer.Description>) {
  return (
    <ArkDrawer.Description
      {...props}
      className={cx(slots.description, className)}
    />
  );
}

function DrawerCloseTrigger({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof ArkDrawer.CloseTrigger>) {
  return (
    <ArkDrawer.CloseTrigger
      {...props}
      className={cx(slots.closeTrigger, className)}
    />
  );
}

/**
 * Right-anchored Drawer skinned with the `drawer` slot recipe. Composition
 * mirrors Ark: wrap `Backdrop` + `Positioner` in `Drawer.Portal` for correct
 * stacking. Structural parts (`Root`, `Trigger`, `Context`) pass through Ark
 * unchanged so all behavior is preserved.
 */
export const Drawer = {
  Root: ArkDrawer.Root,
  Trigger: ArkDrawer.Trigger,
  Portal,
  Backdrop: DrawerBackdrop,
  Positioner: DrawerPositioner,
  Content: DrawerContent,
  Title: DrawerTitle,
  Description: DrawerDescription,
  CloseTrigger: DrawerCloseTrigger,
  Context: ArkDrawer.Context,
};
