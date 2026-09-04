import { defineSlotRecipe } from '@pandacss/dev';

/**
 * The `SurfaceMessage` component applies these slots by their stable Panda class
 * names. It previously duplicated them as inline `style` objects, which is where
 * the one value below that is not this recipe's original comes from: the shipped
 * component rendered an 8px frame (`radii.lg`), because an inline
 * `border-radius: 8px` outranks any class. `radii.md` (6px) was declared here
 * but never reached a pixel. Kept as `lg` so removing the inline styles changes
 * nothing visually; a consumer applying the recipe class on its own bare markup
 * now gets the same 8px the component always drew.
 */
export const surfaceMessageRecipe = defineSlotRecipe({
  className: 'surfaceMessage',
  description:
    'Semantic surface message contract with tokenized root, title, body, and actions slots.',
  slots: ['root', 'title', 'body', 'actions'],
  base: {
    root: {
      borderRadius: 'lg',
      borderWidth: 'hairline',
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
      // The 8px separates the body from the title above it, so it only applies
      // when there IS something above it. A body-only message (no `title`, or
      // Root + Body composed directly) would otherwise sit 8px low inside the
      // 16px frame padding — visibly off-centre for a one-line message.
      mt: '2',
      _first: { mt: '0' },
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
      critical: {
        root: {
          bg: 'bg.critical',
          borderColor: 'text.critical',
        },
        title: {
          color: 'text.critical',
        },
      },
    },
  },
  defaultVariants: {
    tone: 'default',
  },
});
