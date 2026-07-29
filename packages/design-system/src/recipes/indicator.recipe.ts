import { defineSlotRecipe } from '@pandacss/dev';

/**
 * Status indicator (dot + optional label) as a slot recipe.
 *
 * The dot colour is driven entirely by `colorPalette` ROLE tokens, not raw
 * palette vars: the dot fills with `colorPalette.solid.bg` and gets a soft halo
 * from `colorPalette.subtle.bg`, both dark-aware. `status` is the semantic API —
 * it maps each state to a `colorPalette` on the root (which cascades the
 * `--colors-color-palette-*` vars to the dot) and, for `pending`, drives the
 * `indicatorPulse` animation token on the dot. An explicit `colorPalette`
 * variant is declared AFTER `status`, so a consumer-supplied hue overrides the
 * status mapping in the cascade while `status` still controls the pulse.
 *
 * The design-system ships no generated `styled-system`; the component applies
 * this recipe by its stable slot class names (`indicator__root`,
 * `indicator__dot`, `indicator__root--status_x`, `indicator__dot--status_pending`,
 * `indicator__root--colorPalette_x`). Registered in the preset + `staticCss`.
 */
export const indicatorRecipe = defineSlotRecipe({
  className: 'indicator',
  description:
    'Status dot + optional label. status maps to a dark-aware colorPalette role token and (for pending) the indicatorPulse animation; colorPalette can override the hue.',
  slots: ['root', 'dot'],
  base: {
    root: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '1.5',
      fontSize: 'xs',
      fontWeight: 'semibold',
      lineHeight: '1',
      color: 'text.muted',
      whiteSpace: 'nowrap',
    },
    dot: {
      display: 'inline-block',
      width: '2',
      height: '2',
      flexShrink: '0',
      borderRadius: 'full',
      bg: 'colorPalette.solid.bg',
      boxShadow: '0 0 0 2px var(--colors-color-palette-subtle-bg)',
    },
  },
  variants: {
    status: {
      idle: { root: { colorPalette: 'neutral' } },
      ready: { root: { colorPalette: 'blue' } },
      active: { root: { colorPalette: 'green' } },
      pending: {
        root: { colorPalette: 'amber' },
        dot: { animation: 'indicatorPulse' },
      },
      error: { root: { colorPalette: 'red' } },
    },
    colorPalette: {
      neutral: { root: { colorPalette: 'neutral' } },
      gray: { root: { colorPalette: 'gray' } },
      green: { root: { colorPalette: 'green' } },
      red: { root: { colorPalette: 'red' } },
      amber: { root: { colorPalette: 'amber' } },
      blue: { root: { colorPalette: 'blue' } },
    },
  },
  defaultVariants: {
    status: 'idle',
  },
});
