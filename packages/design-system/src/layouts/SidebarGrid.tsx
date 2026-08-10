import { type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';

/**
 * Class names emitted by the `sidebarGrid` slot recipe (registered in the
 * preset + staticCss). The design-system package builds with `tsc` and ships
 * no generated `styled-system`, so styling is applied by stable Panda slot
 * class names (`${className}__${slot}`, variant
 * `${className}__${slot}--${key}_${value}`). Runtime values Panda cannot
 * statically extract — the rail width and the sticky offset — are passed
 * through the `--sidebar-rail-width` / `--sidebar-sticky-top` custom properties
 * the recipe reads (each with a fallback).
 */
const cx = (...classes: Array<string | false | null | undefined>): string =>
  classes.filter(Boolean).join(' ');

/** Breakpoint token at which the rail sits beside the content. */
export type SidebarGridCollapseBelow = 'sm' | 'md' | 'lg' | 'xl';

export type SidebarGridProps = HTMLAttributes<HTMLDivElement> & {
  sidebar: ReactNode;
  main: ReactNode;
  /**
   * Optional rail width override (CSS length). The default 250px rail ships in
   * the recipe; a custom width is applied via the `--sidebar-rail-width`
   * custom property (Panda can't statically extract a runtime value).
   */
  sidebarWidth?: string;
  /**
   * Breakpoint below which the layout collapses to a single column. Defaults to
   * `md`, preserving the previous behaviour.
   */
  collapseBelow?: SidebarGridCollapseBelow;
  /**
   * Sticky offset for the rail (CSS length) — feeds both the rail's `top` and
   * its viewport-height calculation from one value, via the
   * `--sidebar-sticky-top` custom property. Defaults to `0`.
   */
  stickyTop?: string;
  /**
   * Runs the rail and the divider the full height of the viewport (honouring
   * `stickyTop`) instead of only as tall as its content. Off by default.
   */
  fillViewport?: boolean;
};

export function SidebarGrid({
  sidebar,
  main,
  sidebarWidth,
  collapseBelow = 'md',
  stickyTop,
  fillViewport = false,
  className,
  style,
  ...rest
}: SidebarGridProps) {
  const cssVars: Record<string, string> = {};
  if (sidebarWidth != null) cssVars['--sidebar-rail-width'] = sidebarWidth;
  if (stickyTop != null) cssVars['--sidebar-sticky-top'] = stickyTop;
  const mergedStyle =
    Object.keys(cssVars).length > 0
      ? ({ ...cssVars, ...style } as CSSProperties)
      : style;

  return (
    <div
      {...rest}
      className={cx(
        'sidebarGrid__root',
        `sidebarGrid__root--collapseBelow_${collapseBelow}`,
        fillViewport && 'sidebarGrid__root--fillViewport_true',
        className,
      )}
      style={mergedStyle}
      data-scope="sidebar-grid"
      data-part="root"
      data-collapse-below={collapseBelow}
    >
      <aside
        className={cx(
          'sidebarGrid__sidebar',
          `sidebarGrid__sidebar--collapseBelow_${collapseBelow}`,
        )}
        data-part="sidebar"
      >
        {sidebar}
      </aside>
      <div className="sidebarGrid__main" data-part="main">
        {main}
      </div>
    </div>
  );
}
