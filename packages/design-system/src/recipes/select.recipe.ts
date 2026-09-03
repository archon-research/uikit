import { defineSlotRecipe } from '@pandacss/dev';

/**
 * Native `<select>` skin. Mirrors the `input` recipe's `control` token styling
 * (border, focus ring, disabled, surface) so a Select reads as the same family
 * as a TextInput, plus a non-interactive chevron `indicator`. No hard-locked
 * inline width: the control is `width: full` of `root`, and `root`'s width lives
 * in the recipes cascade layer so a consumer `className` (utilities layer, e.g.
 * `css({ width: '150px' })`) overrides it.
 */
export const selectRecipe = defineSlotRecipe({
  className: 'select',
  description:
    'Native <select> control skinned to match the input recipe: tokenized border, focus ring, disabled state, plus a non-interactive chevron indicator.',
  slots: ['root', 'control', 'indicator'],
  base: {
    root: {
      position: 'relative',
      display: 'inline-flex',
      alignItems: 'center',
      width: 'full',
    },
    control: {
      width: 'full',
      minWidth: '0',
      h: '9',
      borderWidth: 'hairline',
      borderStyle: 'solid',
      borderColor: 'border.subtle',
      borderRadius: 'md',
      bg: 'surface.default',
      color: 'text.default',
      pl: '3',
      pr: '10',
      fontFamily: 'inherit',
      textStyle: 'bodySm',
      lineHeight: 'normal',
      appearance: 'none',
      outline: 'none',
      cursor: 'pointer',
      transitionDuration: 'fast',
      transitionProperty: 'border-color, box-shadow',
      transitionTimingFunction: 'out',
      _hover: {
        borderColor: 'border.default',
      },
      _focusVisible: {
        borderColor: 'border.strong',
        outlineWidth: '2px',
        outlineStyle: 'solid',
        outlineColor: 'border.strong',
        outlineOffset: '1px',
      },
      '&:disabled, &[data-disabled]': {
        opacity: '0.65',
        cursor: 'not-allowed',
      },
    },
    indicator: {
      position: 'absolute',
      top: '50%',
      insetInlineEnd: '3',
      display: 'inline-flex',
      w: '4',
      h: '4',
      color: 'text.muted',
      pointerEvents: 'none',
      transform: 'translateY(-50%)',
    },
  },
});
