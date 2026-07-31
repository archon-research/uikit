import { defineSlotRecipe } from '@pandacss/dev';

/**
 * Two-column sidebar + main layout. Collapses to a single column below `md`.
 * The default 250px rail ships as a static class; a caller-supplied width is
 * passed as the `--sidebar-rail-width` custom property (a runtime value Panda
 * cannot statically extract) which the grid template reads with a fallback.
 */
export const sidebarGridRecipe = defineSlotRecipe({
  className: 'sidebarGrid',
  description:
    'Sticky-rail sidebar + main grid; single column below md. Rail width overridable at runtime via the --sidebar-rail-width custom property.',
  slots: ['root', 'sidebar', 'main'],
  base: {
    root: {
      display: 'grid',
      gap: '6',
      alignItems: 'start',
      gridTemplateColumns: {
        base: '1fr',
        md: 'var(--sidebar-rail-width, 250px) minmax(0, 1fr)',
      },
    },
    sidebar: {
      minWidth: '0',
      md: {
        position: 'sticky',
        top: '0',
        alignSelf: 'start',
        maxHeight: '100vh',
        overflowY: 'auto',
        borderRightWidth: '1px',
        borderRightStyle: 'solid',
        borderRightColor: 'border.subtle',
        pr: '4',
      },
    },
    main: {
      minWidth: '0',
    },
  },
});
