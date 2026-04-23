import { defineRecipe } from '@pandacss/dev';

export const interactiveItemRecipe = defineRecipe({
  className: 'interactiveItem',
  description:
    'Row-style interactive button used in lists and relationship panels.',
  base: {
    display: 'flex',
    width: 'full',
    alignItems: 'baseline',
    gap: '2',
    textAlign: 'left',
    borderRadius: 'md',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'transparent',
    bg: 'transparent',
    color: 'text.default',
    cursor: 'pointer',
    transitionDuration: 'fast',
    transitionProperty: 'background-color, color, border-color, box-shadow',
    _hover: {
      bg: 'interactive.hover',
      borderColor: 'border.default',
    },
  },
  variants: {
    selected: {
      true: {
        bg: 'interactive.selected',
      },
      false: {
        fontWeight: 'normal',
      },
    },
    density: {
      compact: {
        px: '2',
        py: '1',
        fontSize: 'xs',
      },
      comfortable: {
        px: '2',
        py: '1.5',
        fontSize: 'sm',
      },
    },
    tone: {
      subdued: {
        color: 'text.muted',
      },
    },
    variant: {
      treeNode: {
        position: 'absolute',
        borderColor: 'border.default',
        bg: 'bg.canvas',
        boxShadow: 'xs',
        textAlign: 'left',
        _hover: {
          borderColor: 'border.strong',
        },
      },
    },
  },
  defaultVariants: {
    selected: false,
    density: 'comfortable',
  },
});
