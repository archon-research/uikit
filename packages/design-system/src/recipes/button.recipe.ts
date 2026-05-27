import { defineRecipe } from '@pandacss/dev';

export const buttonRecipe = defineRecipe({
  className: 'button',
  description:
    'Semantic button contract used for panel actions, icon buttons, and item rows.',
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '1.5',
    borderRadius: 'md',
    borderWidth: '1px',
    borderStyle: 'solid',
    transitionDuration: 'fast',
    transitionProperty: 'background-color, color, border-color, box-shadow',
    _disabled: {
      opacity: '0.5',
      cursor: 'not-allowed',
    },
  },
  variants: {
    variant: {
      panel: {
        bg: 'surface.default',
        borderColor: 'border.subtle',
        color: 'text.default',
        textDecoration: 'none',
        cursor: 'pointer',
        textStyle: 'bodySm',
        lineHeight: '1.3',
        _hover: {
          borderColor: 'border.default',
        },
      },
      item: {
        display: 'flex',
        width: 'full',
        alignItems: 'baseline',
        textAlign: 'left',
        borderColor: 'transparent',
        bg: 'transparent',
        color: 'text.default',
        cursor: 'pointer',
        _hover: {
          bg: 'interactive.hover',
          borderColor: 'border.default',
        },
      },
    },
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
    density: {
      comfortable: {
        px: '2',
        py: '1.5',
        fontSize: 'sm',
      },
      compact: {
        px: '2',
        py: '1',
        fontSize: 'xs',
      },
    },
    selected: {
      true: {
        bg: 'interactive.selected',
      },
      false: {},
    },
    tone: {
      default: {},
      subdued: {
        color: 'text.muted',
      },
    },
    iconOnly: {
      true: {
        justifyContent: 'center',
        gap: '0',
        px: '0',
      },
      false: {},
    },
  },
  compoundVariants: [
    {
      variant: 'panel',
      size: 'md',
      iconOnly: true,
      css: {
        w: '8',
      },
    },
    {
      variant: 'panel',
      size: 'lg',
      iconOnly: true,
      css: {
        w: '9',
      },
    },
  ],
  defaultVariants: {
    variant: 'panel',
    size: 'md',
    density: 'comfortable',
    selected: false,
    tone: 'default',
    iconOnly: false,
  },
});
