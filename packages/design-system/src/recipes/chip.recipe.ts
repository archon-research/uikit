import { defineSlotRecipe } from '@pandacss/dev';

/**
 * Removable filter chip/tag. Shares `Badge`'s variant × colorPalette model
 * (solid | subtle | outline hues via dark-aware role tokens) and adds a
 * `dismiss` slot for the optional × control. `label`/`dismiss` reference
 * `colorPalette.*` tokens directly rather than carrying their own variant
 * classes — the `colorPalette` CSS custom properties set on `root` cascade
 * down to them (same pattern as `indicator`'s dot).
 */
export const chipRecipe = defineSlotRecipe({
  className: 'chip',
  description:
    'Removable filter chip/tag on the variant × colorPalette model (mirrors Badge), with an optional dismiss control.',
  slots: ['root', 'label', 'dismiss'],
  base: {
    root: {
      display: 'inline-flex',
      alignItems: 'center',
      borderRadius: 'full',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: 'transparent',
      fontWeight: 'medium',
      lineHeight: '1',
      whiteSpace: 'nowrap',
    },
    label: {
      display: 'inline-flex',
      alignItems: 'center',
    },
    dismiss: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: '0',
      borderRadius: 'full',
      border: 'none',
      bg: 'transparent',
      color: 'inherit',
      cursor: 'pointer',
      padding: '0',
      opacity: '0.7',
      transitionProperty: 'opacity, background-color',
      transitionDuration: 'fast',
      _hover: {
        opacity: '1',
        bg: 'colorPalette.subtle.bgHover',
      },
      _focusVisible: {
        outline: '2px solid',
        outlineColor: 'colorPalette.outline.border',
        outlineOffset: '1px',
      },
    },
  },
  variants: {
    variant: {
      solid: {
        root: {
          bg: 'colorPalette.solid.bg',
          color: 'colorPalette.solid.fg',
          borderColor: 'colorPalette.solid.border',
        },
      },
      subtle: {
        root: {
          bg: 'colorPalette.subtle.bg',
          color: 'colorPalette.subtle.fg',
          borderColor: 'transparent',
        },
      },
      outline: {
        root: {
          bg: 'transparent',
          color: 'colorPalette.outline.fg',
          borderColor: 'colorPalette.outline.border',
        },
      },
    },
    colorPalette: {
      neutral: { root: { colorPalette: 'neutral' } },
      gray: { root: { colorPalette: 'gray' } },
      green: { root: { colorPalette: 'green' } },
      red: { root: { colorPalette: 'red' } },
      amber: { root: { colorPalette: 'amber' } },
      blue: { root: { colorPalette: 'blue' } },
    },
    size: {
      sm: {
        root: { fontSize: '2xs', pl: '2', pr: '1', py: '0.5', gap: '1' },
        dismiss: { width: '3.5', height: '3.5' },
      },
      md: {
        root: { fontSize: 'xs', pl: '2.5', pr: '1.5', py: '1', gap: '1.5' },
        dismiss: { width: '4', height: '4' },
      },
    },
  },
  defaultVariants: {
    variant: 'subtle',
    colorPalette: 'neutral',
    size: 'md',
  },
});
