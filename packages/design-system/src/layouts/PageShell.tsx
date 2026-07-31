import { type CSSProperties, type HTMLAttributes } from 'react';

/**
 * Class name emitted by the `pageShell` recipe (registered in the preset +
 * staticCss). The design-system package builds with `tsc` and ships no
 * generated `styled-system`, so styling is applied by the stable Panda class
 * name `pageShell`. A caller-supplied `maxWidth` is a runtime value Panda
 * cannot statically extract, so it is passed through the `--page-max-width`
 * custom property that the recipe reads.
 */
const cx = (...classes: Array<string | false | null | undefined>): string =>
  classes.filter(Boolean).join(' ');

export type PageShellProps = HTMLAttributes<HTMLDivElement> & {
  /**
   * Optional max-width override (token or CSS length). Applied via the
   * `--page-max-width` custom property so consumers can widen/narrow without a
   * new static class; the default ~1160px width ships in the recipe.
   */
  maxWidth?: string;
};

export function PageShell({
  maxWidth,
  className,
  children,
  style,
  ...rest
}: PageShellProps) {
  const mergedStyle =
    maxWidth != null
      ? ({ '--page-max-width': maxWidth, ...style } as CSSProperties)
      : style;

  return (
    <div
      {...rest}
      className={cx('pageShell', className)}
      style={mergedStyle}
      data-scope="page-shell"
      data-part="root"
    >
      {children}
    </div>
  );
}
