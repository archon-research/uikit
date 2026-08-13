import { type HTMLAttributes, type ReactNode } from 'react';

/**
 * Class names emitted by the `statusPill` slot recipe and the `statusPillRow`
 * recipe (registered in the preset + staticCss). The design-system ships no
 * generated `styled-system`, so styling is applied by stable class names
 * (`statusPill__${slot}`, variant `statusPill__${slot}--tone_x`;
 * `statusPillRow`).
 */
const cx = (...classes: Array<string | false | null | undefined>): string =>
  classes.filter(Boolean).join(' ');

export type StatusPillTone = 'neutral' | 'success' | 'warning' | 'critical';

export type StatusPillProps = Omit<
  HTMLAttributes<HTMLSpanElement>,
  'children'
> & {
  /** The fact this pill reports (e.g. "chain", "data", "session"). */
  name: ReactNode;
  /** The current value of that fact. */
  value: ReactNode;
  /** Tone for the value text and the optional leading dot. */
  tone?: StatusPillTone;
  /** Show a leading tone-colored dot. Defaults to true. */
  indicator?: boolean;
};

export type StatusPillRowProps = HTMLAttributes<HTMLDivElement>;

/**
 * A two-part `name : value` status pill. Six of these across a shell (paper,
 * mode, cursor, session, data, chain) let a reader see which specific fact went
 * bad — so `name` and `value` stay distinct, and the tone renders on the value
 * (and dot), never as the only signal.
 */
export function StatusPill({
  name,
  value,
  tone = 'neutral',
  indicator = true,
  className,
  ...rest
}: StatusPillProps) {
  return (
    <span
      {...rest}
      className={cx(
        'statusPill__root',
        `statusPill__root--tone_${tone}`,
        className,
      )}
      data-scope="status-pill"
      data-part="root"
      data-tone={tone}
    >
      {indicator ? (
        <span className="statusPill__dot" data-part="dot" aria-hidden="true" />
      ) : null}
      <span className="statusPill__name" data-part="name">
        {name}
      </span>
      <span
        className={cx('statusPill__value', `statusPill__value--tone_${tone}`)}
        data-part="value"
      >
        {value}
      </span>
    </span>
  );
}

/** A wrapping row of {@link StatusPill}s. */
export function StatusPillRow({
  className,
  children,
  ...rest
}: StatusPillRowProps) {
  return (
    <div
      {...rest}
      className={cx('statusPillRow', className)}
      data-scope="status-pill-row"
    >
      {children}
    </div>
  );
}
