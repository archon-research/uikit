import { defineRecipe } from '@pandacss/dev';

/**
 * Badge on the `variant × colorPalette` model.
 *
 * - `variant` selects the fill style (solid | subtle | surface | outline).
 * - `colorPalette` selects the hue via dark-aware ROLE tokens; the variant
 *   styles reference `colorPalette.<role>.bg/fg/border` and NEVER a raw palette
 *   var, so a badge is structurally dark-aware (each role carries `_dark`).
 * - `size` sets density (`md` preserves the previous 12px badge).
 *
 * The design-system builds with `tsc` and ships no generated `styled-system`,
 * so the component applies this recipe by its stable class names
 * (`badge`, `badge--variant_x`, `badge--colorPalette_x`, `badge--size_x`). The
 * recipe is registered in the preset and listed in `staticCss` (`['*']`) so all
 * variant classes are generated.
 */
export const badgeRecipe = defineRecipe({
  className: 'badge',
  description:
    'Status/label badge on the variant × colorPalette model. variant selects the fill style; colorPalette selects the hue via dark-aware role tokens; size sets density.',
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: 'md',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'transparent',
    fontWeight: 'semibold',
    lineHeight: '1',
    whiteSpace: 'nowrap',
  },
  variants: {
    variant: {
      solid: {
        bg: 'colorPalette.solid.bg',
        color: 'colorPalette.solid.fg',
        borderColor: 'colorPalette.solid.border',
      },
      subtle: {
        bg: 'colorPalette.subtle.bg',
        color: 'colorPalette.subtle.fg',
        borderColor: 'transparent',
      },
      surface: {
        bg: 'colorPalette.surface.bg',
        color: 'colorPalette.surface.fg',
        borderColor: 'colorPalette.surface.border',
      },
      outline: {
        bg: 'transparent',
        color: 'colorPalette.outline.fg',
        borderColor: 'colorPalette.outline.border',
      },
    },
    colorPalette: {
      neutral: { colorPalette: 'neutral' },
      gray: { colorPalette: 'gray' },
      green: { colorPalette: 'green' },
      red: { colorPalette: 'red' },
      amber: { colorPalette: 'amber' },
      blue: { colorPalette: 'blue' },
    },
    size: {
      sm: {
        fontSize: '2xs',
        px: '2',
        py: '0.5',
        gap: '1',
      },
      md: {
        fontSize: 'xs',
        px: '2.5',
        py: '1.5',
        gap: '1',
      },
    },
  },
  defaultVariants: {
    variant: 'subtle',
    colorPalette: 'neutral',
    size: 'md',
  },
});
