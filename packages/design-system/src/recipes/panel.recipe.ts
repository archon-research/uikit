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
      borderWidth: 'hairline',
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
      // A header must never force its container wider than the viewport; letting
      // the meta slot shrink lets the header wrap instead of overflowing.
      minWidth: '0',
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
    // Padding only — the meta line has its own `metaSize` control so a roomy
    // panel can still carry a small meta line (and vice versa).
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
    // Meta line size, independent of density (like titleSize vs titleTransform).
    metaSize: {
      md: {},
      sm: { meta: { textStyle: 'metaText' } },
    },
    // Leading-edge state stripe, mirroring `StatTile`'s `accent`. A thicker
    // colored left border that carries state as a few pixels of color. A runtime
    // hue is applied by the component as an inline `borderLeftColor` (which wins
    // over these token colors), so an instrument's own color can drive the
    // stripe without a build-time class. An accent never carries state alone —
    // the panel's title or body must still state it.
    accent: {
      none: {},
      neutral: {
        root: { borderLeftWidth: 'accent', borderLeftColor: 'border.strong' },
      },
      success: {
        root: { borderLeftWidth: 'accent', borderLeftColor: 'text.success' },
      },
      warning: {
        root: { borderLeftWidth: 'accent', borderLeftColor: 'text.warning' },
      },
      critical: {
        root: { borderLeftWidth: 'accent', borderLeftColor: 'text.critical' },
      },
    },
    // Corner radius from a token. Defaults to `md` (the previous fixed value);
    // `none` squares the frame, `sm`/`lg` step it.
    radius: {
      // `'0'`, not `'none'`: there is no `none` radii token, so `'none'` reached
      // the browser as the invalid `border-radius: none`, was dropped, and the
      // frame kept the base `md` radius — the one thing this variant exists to
      // remove.
      none: { root: { borderRadius: '0' } },
      sm: { root: { borderRadius: 'sm' } },
      md: { root: { borderRadius: 'md' } },
      lg: { root: { borderRadius: 'lg' } },
    },
    // Let the header wrap when the title and trailing block can't share a line,
    // instead of overflowing. Pairs with the `min-width: 0` on the meta slot.
    headerWrap: {
      false: {},
      true: { header: { flexWrap: 'wrap' } },
    },
  },
  defaultVariants: {
    surface: 'raised',
    density: 'normal',
    titleTransform: 'none',
    titleSize: 'md',
    metaSize: 'md',
    accent: 'none',
    radius: 'md',
    headerWrap: false,
  },
});
