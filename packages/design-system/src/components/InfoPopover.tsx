import { type ReactNode } from 'react';

import { Popover } from './Popover.js';

/**
 * The click-triggered counterpart to {@link InfoTip}. Where `InfoTip` is a
 * CSS-only hover/focus bubble for a pure-text definition, `InfoPopover` opens on
 * click and its content is focusable and selectable — so it can carry a
 * deeplink (`href`/`linkText`), selectable copy, or other interactive content
 * that a hover bubble (which closes when the pointer leaves) cannot host.
 *
 * The trigger reuses the `infoTip__trigger` look so the two help affordances are
 * visually identical and differ only in hover-vs-click behavior.
 */
const cx = (...classes: Array<string | false | null | undefined>): string =>
  classes.filter(Boolean).join(' ');

export type InfoPopoverPlacement =
  | 'bottom-start'
  | 'bottom'
  | 'bottom-end'
  | 'top-start'
  | 'top'
  | 'top-end';

export type InfoPopoverProps = {
  /** The help content — focusable and selectable, unlike a hover tooltip. */
  children: ReactNode;
  /** Accessible name for the trigger. Defaults to "More information". */
  label?: string;
  /** Optional heading rendered at the top of the bubble. */
  title?: ReactNode;
  /** Optional deeplink (e.g. `#glossary/term`) rendered as a trailing link. */
  href?: string;
  /** Text for the deeplink. Defaults to "Learn more →". */
  linkText?: string;
  /** Trigger content. Defaults to an info glyph. */
  trigger?: ReactNode;
  /** Placement of the bubble relative to the trigger. Defaults to `bottom-start`. */
  placement?: InfoPopoverPlacement;
  /** Class applied to the trigger button. */
  className?: string;
  /** Controlled open state (passthrough to the underlying popover). */
  open?: boolean;
  /** Initial open state when uncontrolled. */
  defaultOpen?: boolean;
  /** Fires when the open state changes. */
  onOpenChange?: (details: { open: boolean }) => void;
};

const LINK_STYLE = {
  color: 'var(--colors-text-link)',
  fontWeight: 600,
  textDecoration: 'none',
  alignSelf: 'start',
};

export function InfoPopover({
  children,
  label = 'More information',
  title,
  href,
  linkText = 'Learn more →',
  trigger,
  placement = 'bottom-start',
  className,
  open,
  defaultOpen,
  onOpenChange,
}: InfoPopoverProps) {
  return (
    <Popover.Root
      positioning={{ placement, gutter: 6 }}
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
    >
      <Popover.Trigger
        type="button"
        aria-label={label}
        className={cx('infoTip__trigger', className)}
        data-scope="info-popover"
        data-part="trigger"
      >
        {trigger ?? <span aria-hidden="true">i</span>}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner>
          <Popover.Content data-scope="info-popover" data-part="content">
            {title != null ? <Popover.Title>{title}</Popover.Title> : null}
            <Popover.Description>{children}</Popover.Description>
            {href != null ? (
              <a href={href} style={LINK_STYLE} data-part="link">
                {linkText}
              </a>
            ) : null}
          </Popover.Content>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
