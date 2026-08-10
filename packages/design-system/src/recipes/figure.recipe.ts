import { defineRecipe } from '@pandacss/dev';

/**
 * Numeric/figure display recipe: the mono family with tabular figures and
 * slightly tightened tracking, so a headline number and the cells beneath it
 * render as the same kind of value. `nowrap` (the default) keeps a figure from
 * breaking between its own digits — a wrapped `$1,234` reads as two numbers.
 *
 * The design-system builds with `tsc` and ships no generated `styled-system`,
 * so the component applies this recipe by its stable class names (base
 * `figure`, variant `figure--${key}_${value}`). Registered in the preset +
 * staticCss.
 */
export const figureRecipe = defineRecipe({
  className: 'figure',
  description:
    'Tabular-figures numeric display: mono family, tabular-nums, tightened tracking. tone recolors via semantic text tokens; size steps the type; wrap toggles mid-number wrapping (off by default).',
  base: {
    fontFamily: 'mono',
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '-0.02em',
    whiteSpace: 'nowrap',
  },
  variants: {
    tone: {
      // Inherit the surrounding text color — a figure drops into any context.
      default: {},
      muted: { color: 'text.muted' },
      strong: { color: 'text.strong' },
      success: { color: 'text.success' },
      warning: { color: 'text.warning' },
      critical: { color: 'text.critical' },
    },
    size: {
      sm: { fontSize: 'sm' },
      md: {},
      lg: { fontSize: 'lg' },
    },
    wrap: {
      false: { whiteSpace: 'nowrap' },
      true: { whiteSpace: 'normal' },
    },
  },
  defaultVariants: {
    tone: 'default',
    size: 'md',
    wrap: false,
  },
});
