import { type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';

/**
 * Class names emitted by the `sidebarGrid` slot recipe (registered in the
 * preset + staticCss). The design-system package builds with `tsc` and ships
 * no generated `styled-system`, so styling is applied by stable Panda slot
 * class names (`${className}__${slot}`). A caller-supplied `sidebarWidth` is a
 * runtime value Panda cannot statically extract, so it is passed through the
 * `--sidebar-rail-width` custom property that the grid template reads; the rail
 * still collapses to a single column below `md`.
 */
const cx = (...classes: Array<string | false | null | undefined>): string =>
  classes.filter(Boolean).join(' ');

export type SidebarGridProps = HTMLAttributes<HTMLDivElement> & {
  sidebar: ReactNode;
  main: ReactNode;
  /**
   * Optional rail width override (CSS length). The default 250px rail ships in
   * the recipe; a custom width is applied via the `--sidebar-rail-width`
   * custom property (Panda can't statically extract a runtime value).
   */
  sidebarWidth?: string;
};

export function SidebarGrid({
  sidebar,
  main,
  sidebarWidth,
  className,
  style,
  ...rest
}: SidebarGridProps) {
  const mergedStyle =
    sidebarWidth != null
      ? ({ '--sidebar-rail-width': sidebarWidth, ...style } as CSSProperties)
      : style;

  return (
    <div
      {...rest}
      className={cx('sidebarGrid__root', className)}
      style={mergedStyle}
      data-scope="sidebar-grid"
      data-part="root"
    >
      <aside className="sidebarGrid__sidebar" data-part="sidebar">
        {sidebar}
      </aside>
      <div className="sidebarGrid__main" data-part="main">
        {main}
      </div>
    </div>
  );
}
