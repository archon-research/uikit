import { defineSlotRecipe } from '@pandacss/dev';

/**
 * Theme mode control with two forms selected by `variant`:
 *  - `segmented` (default): a full-width, bordered radiogroup of 3 options
 *    (Auto / Light / Dark). The active option is keyed off a `data-active`
 *    attribute (runtime state), not a variant class — mirroring the
 *    `segmentedControl` recipe's `data-state` approach.
 *  - `icon`: a single compact icon button that cycles auto -> light -> dark.
 *    Its `appearance` chooses the chrome: `chip` (default) is the bordered,
 *    filled chip; `bare` drops border/background/radius so it inherits an
 *    enclosing toolbar or pill surface.
 *
 * `input` is the visually-hidden native radio (segmented form). All colors are
 * semantic tokens so a consumer `className` composed last overrides via the
 * utilities layer.
 */
export const themeToggleRecipe = defineSlotRecipe({
  className: 'themeToggle',
  description:
    'Theme mode control: a default 3-segment radiogroup (Auto/Light/Dark) or a compact single icon button that cycles modes. Active segment keyed off data-active.',
  slots: ['root', 'option', 'input', 'iconButton'],
  base: {
    option: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flex: '1',
      minWidth: '0',
      gap: '1.5',
      borderWidth: '0',
      borderRadius: 'md',
      px: '2.5',
      py: '1.5',
      fontSize: 'xs',
      lineHeight: 'tight',
      cursor: 'pointer',
      bg: 'transparent',
      color: 'text.muted',
      transitionDuration: 'fast',
      transitionProperty: 'background-color, color, box-shadow',
      '&[data-active]': {
        bg: 'surface.default',
        color: 'text.default',
        boxShadow: 'xs',
      },
    },
    input: {
      position: 'absolute',
      width: '1px',
      height: '1px',
      margin: '-1px',
      padding: '0',
      border: '0',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      clipPath: 'inset(100%)',
    },
    iconButton: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      w: '9',
      h: '9',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: 'border.subtle',
      borderRadius: 'md',
      bg: 'surface.default',
      color: 'text.muted',
      cursor: 'pointer',
      transitionDuration: 'fast',
      transitionProperty: 'background-color, color, border-color',
      _hover: {
        bg: 'surface.hover',
        color: 'text.default',
      },
      _focusVisible: {
        outlineWidth: '2px',
        outlineStyle: 'solid',
        outlineColor: 'border.strong',
        outlineOffset: '1px',
      },
    },
  },
  variants: {
    variant: {
      segmented: {
        root: {
          display: 'flex',
          alignItems: 'center',
          gap: '1.5',
          width: 'full',
          boxSizing: 'border-box',
          p: '1',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: 'border.subtle',
          borderRadius: 'lg',
          bg: 'surface.subtle',
        },
      },
      icon: {
        root: {
          display: 'inline-flex',
        },
      },
    },
    // Chrome for the `icon` form. `chip` (default) keeps the bordered, filled
    // 36px chip; `bare` strips border, background, and radius so the button
    // inherits an enclosing toolbar or pill surface instead of double-drawing
    // one of its own.
    appearance: {
      chip: {},
      bare: {
        iconButton: {
          borderWidth: '0',
          borderColor: 'transparent',
          bg: 'transparent',
          // There is no `none` radii token; the literal 0 is what squares the button.
          borderRadius: '0',
          _hover: {
            bg: 'transparent',
            color: 'text.default',
          },
        },
      },
    },
  },
  defaultVariants: {
    variant: 'segmented',
    appearance: 'chip',
  },
});
