import { type HTMLAttributes, type ReactNode } from 'react';

/**
 * Class names emitted by the `surfaceMessage` slot recipe (registered in the
 * preset + staticCss). The design-system package builds with `tsc` and ships no
 * generated `styled-system`, so styling is applied by stable Panda class names.
 * Conventions: slot base = `${className}__${slot}`; a slot variant =
 * `${className}__${slot}--${key}_${value}`.
 *
 * These parts used to carry inline `style` objects instead, which beat any
 * consumer `className` (inline styles outrank classes at every specificity), so
 * a message could not be restyled from the outside. All of it now lives in the
 * recipe and a consumer `className` composes LAST.
 */
const cx = (...classes: Array<string | false | null | undefined>): string =>
  classes.filter(Boolean).join(' ');

export type SurfaceMessageTone = 'default' | 'muted' | 'dashed' | 'critical';

/**
 * Per-slot `className` escape hatch for {@link SurfaceMessage}. No `actions`
 * key: the compound renders actions as `children`, so that slot is styled by
 * passing `className` to {@link SurfaceMessageActions} directly.
 */
export type SurfaceMessageSlotClassNames = {
  root?: string;
  title?: string;
  body?: string;
};

export type SurfaceMessageProps = HTMLAttributes<HTMLDivElement> & {
  /** Omitted: the message renders body-only (a plain note). */
  title?: string;
  body: string;
  tone?: SurfaceMessageTone;
  /**
   * Per-slot `className` escape hatch, merged onto each slot's classes — so a
   * consumer can style the title or body without reaching in through a Panda
   * class-name substring selector. `className` targets the root.
   */
  classNames?: SurfaceMessageSlotClassNames;
  children?: ReactNode;
};

export type SurfaceMessageRootProps = HTMLAttributes<HTMLDivElement> & {
  tone?: SurfaceMessageTone;
};

export type SurfaceMessageTitleProps = HTMLAttributes<HTMLParagraphElement> & {
  /** Must match the root's tone: `critical` recolors the title. */
  tone?: SurfaceMessageTone;
};
export type SurfaceMessageBodyProps = HTMLAttributes<HTMLParagraphElement>;
export type SurfaceMessageActionsProps = HTMLAttributes<HTMLDivElement>;

/** A tone with no styles of its own emits no class, so skip it. */
const toneSuffix = (tone: SurfaceMessageTone) =>
  tone === 'default' ? false : `--tone_${tone}`;

export function SurfaceMessageRoot({
  tone = 'default',
  className,
  children,
  ...props
}: SurfaceMessageRootProps) {
  const suffix = toneSuffix(tone);

  return (
    <div
      {...props}
      className={cx(
        'surfaceMessage__root',
        suffix && `surfaceMessage__root${suffix}`,
        className,
      )}
      data-scope="surface-message"
      data-part="root"
      data-tone={tone}
    >
      {children}
    </div>
  );
}

export function SurfaceMessageTitle({
  tone = 'default',
  className,
  children,
  ...props
}: SurfaceMessageTitleProps) {
  const suffix = toneSuffix(tone);

  return (
    <p
      {...props}
      className={cx(
        'surfaceMessage__title',
        suffix && `surfaceMessage__title${suffix}`,
        className,
      )}
      data-scope="surface-message"
      data-part="title"
    >
      {children}
    </p>
  );
}

export function SurfaceMessageBody({
  className,
  children,
  ...props
}: SurfaceMessageBodyProps) {
  return (
    <p
      {...props}
      className={cx('surfaceMessage__body', className)}
      data-scope="surface-message"
      data-part="body"
    >
      {children}
    </p>
  );
}

export function SurfaceMessageActions({
  className,
  children,
  ...props
}: SurfaceMessageActionsProps) {
  return (
    <div
      {...props}
      className={cx('surfaceMessage__actions', className)}
      data-scope="surface-message"
      data-part="actions"
    >
      {children}
    </div>
  );
}

export function SurfaceMessage({
  title,
  body,
  tone = 'default',
  classNames,
  className,
  children,
  ...rest
}: SurfaceMessageProps) {
  return (
    <SurfaceMessageRoot
      {...rest}
      tone={tone}
      className={cx(className, classNames?.root)}
    >
      {title === undefined ? null : (
        <SurfaceMessageTitle tone={tone} className={classNames?.title}>
          {title}
        </SurfaceMessageTitle>
      )}
      <SurfaceMessageBody className={classNames?.body}>
        {body}
      </SurfaceMessageBody>
      {children}
    </SurfaceMessageRoot>
  );
}
