import { defineSlotRecipe } from '@pandacss/dev';

export const switchRecipe = defineSlotRecipe({
  className: 'toggleSwitch',
  description: 'Toggle switch built on Base UI Switch.',
  slots: ['root', 'thumb'],
  base: {
    root: {
      position: 'relative',
      display: 'inline-flex',
      alignItems: 'center',
      width: '9',
      height: '5',
      borderRadius: 'full',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: 'border.default',
      bg: 'surface.subtle',
      cursor: 'pointer',
      flexShrink: '0',
      transitionDuration: 'fast',
      transitionProperty: 'background-color, border-color',
      '&[data-checked]': {
        bg: 'gray.800',
        borderColor: 'gray.700',
        _dark: {
          bg: 'gray.600',
          borderColor: 'gray.500',
        },
      },
      _focusVisible: {
        outline: '2px solid',
        outlineColor: 'gray.500',
        outlineOffset: '2px',
      },
    },
    thumb: {
      display: 'block',
      width: '3.5',
      height: '3.5',
      borderRadius: 'full',
      bg: 'gray.400',
      transitionDuration: 'fast',
      transitionProperty: 'transform, background-color',
      transform: 'translateX(2px)',
      '[data-checked] &': {
        transform: 'translateX(calc(2.25rem - 100% - 2px))',
        bg: 'white',
        _dark: {
          bg: 'gray.100',
        },
      },
    },
  },
});
