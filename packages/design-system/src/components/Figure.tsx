import { type HTMLAttributes, type ReactNode } from 'react';

/**
 * Class names emitted by the `figure` recipe (registered in the preset +
 * staticCss). The design-system builds with `tsc` and ships no generated
 * `styled-system`, so the recipe is applied by its stable class names (base
 * `figure`, variant `figure--${key}_${value}`). Consumer `className` composes
 * LAST.
 */
const cx = (...classes: Array<string | false | null | undefined>): string =>
  classes.filter(Boolean).join(' ');

export type FigureTone =
  | 'default'
  | 'muted'
  | 'strong'
  | 'success'
  | 'warning'
  | 'critical';
export type FigureSize = 'sm' | 'md' | 'lg';

export type FigureProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
  /** The formatted numeric string (this atom does not format). */
  value: ReactNode;
  /** Semantic recoloring via text tokens. Defaults to inheriting the context. */
  tone?: FigureTone;
  /** Type-size step. Defaults to `md` (inherits the surrounding size). */
  size?: FigureSize;
  /**
   * Allow the figure to wrap between characters. Defaults to `false` so a
   * number never breaks across its own digits.
   */
  wrap?: boolean;
};

/**
 * A single formatted number rendered in the figure type role. Use inside a
 * `StatTile` value, a table cell, or any headline so a headline and the row
 * beneath it cannot render as different kinds of value.
 */
export function Figure({
  value,
  tone = 'default',
  size = 'md',
  wrap = false,
  className,
  ...rest
}: FigureProps) {
  return (
    <span
      {...rest}
      className={cx(
        'figure',
        tone !== 'default' && `figure--tone_${tone}`,
        size !== 'md' && `figure--size_${size}`,
        wrap && 'figure--wrap_true',
        className,
      )}
      data-scope="figure"
      data-part="root"
      data-tone={tone}
    >
      {value}
    </span>
  );
}
