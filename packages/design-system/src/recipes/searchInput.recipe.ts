import { defineSlotRecipe } from '@pandacss/dev';

/**
 * Search field skin over Ark Combobox. The `control` slot mirrors the `input`
 * recipe's control (border, focus ring, disabled, surface) but reserves leading
 * room for the `icon` slot. `popup`/`item`/`status` skin the floating suggestion
 * list, keying the active row off Ark's `data-highlighted`. All tokenized so a
 * consumer `className` composed last can override via the utilities layer.
 */
export const searchInputRecipe = defineSlotRecipe({
  className: 'searchInput',
  description:
    'Search field over Ark Combobox: leading search icon, tokenized input matching the input recipe, and a floating suggestion popup with item/status slots.',
  slots: ['root', 'icon', 'control', 'popup', 'item', 'status'],
  base: {
    root: {
      position: 'relative',
      width: 'full',
    },
    icon: {
      position: 'absolute',
      top: '50%',
      insetInlineStart: '2.5',
      w: '4',
      h: '4',
      color: 'text.muted',
      pointerEvents: 'none',
      transform: 'translateY(-50%)',
    },
    control: {
      width: 'full',
      minWidth: '0',
      h: '9',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: 'border.subtle',
      borderRadius: 'md',
      bg: 'surface.default',
      color: 'text.default',
      pl: '9',
      pr: '3',
      fontFamily: 'inherit',
      textStyle: 'bodySm',
      outline: 'none',
      transitionDuration: 'fast',
      transitionProperty: 'border-color, box-shadow',
      transitionTimingFunction: 'out',
      '&::placeholder': {
        color: 'text.muted',
      },
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
    popup: {
      mt: '1.5',
      minWidth: 'var(--reference-width, var(--anchor-width))',
      maxHeight: '70',
      overflowY: 'auto',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: 'border.subtle',
      borderRadius: 'lg',
      bg: 'surface.default',
      boxShadow: 'sm',
      p: '1',
      zIndex: '60',
    },
    item: {
      borderRadius: 'md',
      px: '2.5',
      py: '2',
      textStyle: 'bodySm',
      color: 'text.default',
      cursor: 'pointer',
      '&[data-highlighted]': {
        bg: 'interactive.hover',
        color: 'text.default',
      },
    },
    status: {
      px: '2.5',
      py: '2',
      textStyle: 'bodySm',
      color: 'text.muted',
    },
  },
});
