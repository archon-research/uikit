import { defineRecipe } from '@pandacss/dev';

export const panelActionRecipe = defineRecipe({
  className: 'panelAction',
  description: 'Compact action controls used in panel headers and tab bodies.',
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '1.5',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'border.subtle',
    borderRadius: 'md',
    bg: 'surface.default',
    textStyle: 'bodySm',
    color: 'text.default',
    textDecoration: 'none',
    cursor: 'pointer',
    _hover: {
      borderColor: 'border.default',
    },
    _disabled: {
      opacity: '0.5',
      cursor: 'not-allowed',
      _hover: {
        borderColor: 'border.subtle',
      },
    },
  },
  variants: {
    size: {
      md: {
        h: '8',
        px: '2.5',
      },
      lg: {
        h: '9',
        px: '3',
      },
    },
    iconOnly: {
      true: {
        w: '8',
        px: '0',
        justifyContent: 'center',
        gap: '0',
      },
      false: {},
    },
  },
  defaultVariants: {
    size: 'md',
    iconOnly: false,
  },
});
