import { type ReactNode, useId } from 'react';

/**
 * Class names emitted by the `infoTip` slot recipe (registered in the preset +
 * staticCss). The design-system ships no generated `styled-system`, so styling
 * is applied by stable slot class names (`infoTip__${slot}`, variant
 * `infoTip__bubble--align_x`). Visibility is CSS-only (parent hover/focus) — no
 * open state here.
 */
const cx = (...classes: Array<string | false | null | undefined>): string =>
  classes.filter(Boolean).join(' ');

export type InfoTipAlign = 'start' | 'center' | 'end';

export type InfoTipProps = {
  /** The help text. Rendered once, and referenced by `aria-describedby`. */
  children: ReactNode;
  /** Accessible name for the trigger (e.g. "About net exposure"). */
  label?: string;
  /** Horizontal anchoring of the bubble. Defaults to `start`. */
  align?: InfoTipAlign;
  /** Trigger content. Defaults to an info glyph. */
  trigger?: ReactNode;
  /** Class applied to the root wrapper. */
  className?: string;
};

/**
 * A keyboard-reachable help-tip. The bubble opens on hover *and* focus, is the
 * single element `aria-describedby` points at (so the sentence exists once, not
 * twice), takes no layout while closed, and caps its width against the
 * viewport. The trigger is a real focusable `button`.
 */
export function InfoTip({
  children,
  label = 'More information',
  align = 'start',
  trigger,
  className,
}: InfoTipProps) {
  const bubbleId = useId();

  return (
    <span
      className={cx('infoTip__root', className)}
      data-scope="info-tip"
      data-part="root"
    >
      <button
        type="button"
        className="infoTip__trigger"
        data-part="trigger"
        aria-label={label}
        aria-describedby={bubbleId}
      >
        {trigger ?? <span aria-hidden="true">i</span>}
      </button>
      <span
        id={bubbleId}
        role="tooltip"
        className={cx('infoTip__bubble', `infoTip__bubble--align_${align}`)}
        data-part="bubble"
      >
        {children}
      </span>
    </span>
  );
}
