import { defineSlotRecipe } from '@pandacss/dev';

/**
 * The "rail beside content" layout, applied at a chosen breakpoint. Below the
 * breakpoint the recipe base leaves the grid a single `1fr` column. The sticky
 * offset reads the `--sidebar-sticky-top` custom property (a runtime length
 * Panda cannot statically extract) with a `0px` fallback, so both `top` and the
 * viewport-height calculation stay in lock-step from one value.
 */
const besideAt = (breakpoint: 'sm' | 'md' | 'lg' | 'xl') => ({
  root: {
    gridTemplateColumns: {
      [breakpoint]: 'var(--sidebar-rail-width, 250px) minmax(0, 1fr)',
    },
  },
  sidebar: {
    [breakpoint]: {
      position: 'sticky',
      top: 'var(--sidebar-sticky-top, 0px)',
      alignSelf: 'start',
      maxHeight: 'calc(100vh - var(--sidebar-sticky-top, 0px))',
      overflowY: 'auto',
      borderRightWidth: 'hairline',
      borderRightStyle: 'solid',
      borderRightColor: 'border.subtle',
      pr: '4',
    },
  },
});

/**
 * Two-column sidebar + main layout. Collapses to a single column below the
 * `collapseBelow` breakpoint (default `md`, preserving the previous behaviour).
 * The default 250px rail ships as a static class; a caller-supplied width is
 * passed as the `--sidebar-rail-width` custom property (a runtime value Panda
 * cannot statically extract) which the grid template reads with a fallback.
 * A sticky offset is supplied the same way via `--sidebar-sticky-top`.
 */
export const sidebarGridRecipe = defineSlotRecipe({
  className: 'sidebarGrid',
  description:
    'Sticky-rail sidebar + main grid; single column below the collapseBelow breakpoint (default md). Rail width and sticky offset overridable at runtime via the --sidebar-rail-width / --sidebar-sticky-top custom properties.',
  slots: ['root', 'sidebar', 'main'],
  base: {
    root: {
      display: 'grid',
      gap: '6',
      alignItems: 'start',
      gridTemplateColumns: '1fr',
    },
    sidebar: {
      minWidth: '0',
    },
    main: {
      minWidth: '0',
    },
  },
  variants: {
    // Breakpoint at which the rail sits beside the content. Below it, the base
    // single-column grid applies. `md` reproduces the historical layout.
    collapseBelow: {
      sm: besideAt('sm'),
      md: besideAt('md'),
      lg: besideAt('lg'),
      xl: besideAt('xl'),
    },
    // Runs the rail (and the divider between it and the content) the full height
    // of the viewport without the consumer computing `calc(100vh - X)`; honours
    // the same sticky offset.
    fillViewport: {
      false: {},
      true: {
        root: {
          minHeight: 'calc(100vh - var(--sidebar-sticky-top, 0px))',
        },
      },
    },
  },
  defaultVariants: {
    collapseBelow: 'md',
    fillViewport: false,
  },
});
