import { defineSlotRecipe } from '@pandacss/dev';

/**
 * Centered empty-state block: recessed surface frame with a round icon badge,
 * title, description, and optional action row. `size` scales spacing + type
 * ramp; `stretch` toggles between a centered max-width column and a full-width
 * fill. All colors are semantic tokens so a consumer `className` composed last
 * overrides via the utilities layer.
 */
export const emptyStateRecipe = defineSlotRecipe({
  className: 'emptyState',
  description:
    'Centered empty-state: recessed frame, round icon badge, title, description, and action row. Size scales spacing/type; stretch toggles full-width vs centered column.',
  slots: ['root', 'icon', 'body', 'title', 'description', 'actions'],
  base: {
    root: {
      display: 'grid',
      justifyItems: 'center',
      textAlign: 'center',
      borderRadius: 'md',
      borderWidth: 'hairline',
      borderStyle: 'solid',
      borderColor: 'border.subtle',
      bg: 'surface.subtle',
    },
    icon: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 'full',
      bg: 'surface.default',
      color: 'text.muted',
    },
    body: {
      display: 'grid',
      gap: '2',
    },
    title: {
      m: '0',
      color: 'text.strong',
      fontWeight: 'semibold',
    },
    description: {
      m: '0',
      color: 'text.muted',
      lineHeight: 'relaxed',
    },
    actions: {
      mt: '2',
    },
  },
  variants: {
    size: {
      default: {
        root: { gap: '3', p: '8' },
        icon: { w: '12', h: '12', fontSize: 'lg' },
        title: { fontSize: 'lg' },
        description: { fontSize: 'sm' },
      },
      compact: {
        root: { gap: '2.5', p: '5' },
        icon: { w: '10', h: '10', fontSize: 'md' },
        title: { fontSize: 'md' },
        description: { fontSize: 'xs' },
      },
    },
    stretch: {
      true: {
        root: { width: 'full' },
      },
      false: {
        root: { maxWidth: 'lg', marginInline: 'auto' },
      },
    },
  },
  defaultVariants: {
    size: 'default',
    stretch: false,
  },
});
