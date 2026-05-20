import { defineSlotRecipe } from '@pandacss/dev';

export const surfaceMessageRecipe = defineSlotRecipe({
  className: 'surfaceMessage',
  description:
    'Semantic surface message contract with tokenized root, title, body, and actions slots.',
  slots: ['root', 'title', 'body', 'actions'],
  base: {
    root: {
      borderRadius: 'md',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: 'border.subtle',
      bg: 'surface.subtle',
      p: '4',
    },
    title: {
      m: '0',
      textStyle: 'bodySm',
      fontWeight: 'semibold',
      color: 'text.strong',
    },
    body: {
      m: '0',
      mt: '2',
      textStyle: 'bodySm',
      color: 'text.muted',
    },
    actions: {
      display: 'flex',
      gap: '2',
      mt: '3',
    },
  },
  variants: {
    tone: {
      default: {},
      muted: {
        root: {
          bg: 'surface.default',
        },
      },
      dashed: {
        root: {
          borderStyle: 'dashed',
        },
      },
    },
  },
  defaultVariants: {
    tone: 'default',
  },
});
