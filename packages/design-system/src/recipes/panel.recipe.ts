import { defineSlotRecipe } from '@pandacss/dev';

/**
 * Self-contained panel slot recipe. Owns the whole panel: the bordered surface
 * frame, the header row (section-label title on the left, meta + actions
 * trailing on the right), and the body block for children. Replaces the earlier
 * composition of `panelSection` + `sectionHeading` + inline header styles, so a
 * panel is now fully class-driven with no inline style objects.
 *
 * Uses semantic tokens only (surface / text / border) plus spacing, font-size,
 * and text-style scale steps.
 */
export const panelRecipe = defineSlotRecipe({
  className: 'panel',
  description:
    'Bordered panel with a section-label header (title + trailing meta/actions) and a body block. Surface, density, title case, and title size are configurable.',
  slots: ['root', 'header', 'title', 'trailing', 'meta', 'actions', 'body'],
  base: {
    root: {
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: 'border.subtle',
      borderRadius: 'md',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '3',
      // Separates the header from the body. Living on the header (not the body)
      // means the gap collapses cleanly when a panel renders no header.
      mb: '2',
    },
    title: {
      fontSize: 'xs',
      fontWeight: 'medium',
      letterSpacing: 'wide',
      color: 'text.muted',
    },
    trailing: {
      display: 'flex',
      alignItems: 'center',
      gap: '3',
      flexShrink: 0,
    },
    meta: {
      fontSize: 'sm',
      lineHeight: 'relaxed',
      color: 'text.muted',
    },
    actions: {
      display: 'flex',
      alignItems: 'center',
      gap: '2',
      flexShrink: 0,
    },
    body: {
      display: 'block',
    },
  },
  variants: {
    // Elevation ramp: page-level canvas, raised panel, or recessed inset.
    surface: {
      canvas: { root: { bg: 'surface.canvas' } },
      raised: { root: { bg: 'surface.default' } },
      recessed: { root: { bg: 'surface.subtle' } },
    },
    density: {
      normal: { root: { p: '4' } },
      compact: { root: { p: '3' } },
    },
    titleTransform: {
      none: {},
      upper: {
        title: {
          textTransform: 'uppercase',
          letterSpacing: 'wider',
        },
      },
    },
    titleSize: {
      md: {},
      sm: { title: { fontSize: '2xs' } },
    },
  },
  defaultVariants: {
    surface: 'raised',
    density: 'normal',
    titleTransform: 'none',
    titleSize: 'md',
  },
});
