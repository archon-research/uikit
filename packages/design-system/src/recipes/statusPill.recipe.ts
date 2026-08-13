import { defineRecipe, defineSlotRecipe } from '@pandacss/dev';

/**
 * `statusPill` slot recipe: a two-part `name : value` status chip — a labelled
 * fact plus its current value and a tone — kept deliberately separate so a
 * reader can see *which* fact went bad. `tone` colors the value text and the
 * optional leading dot (via `colorPalette` role tokens), so the state is never
 * carried by color alone.
 *
 * Applied by stable slot class names (`statusPill__root`, `statusPill__dot`,
 * `statusPill__name`, `statusPill__value`, variant `…--tone_x`). Registered in
 * the preset + staticCss.
 */
export const statusPillRecipe = defineSlotRecipe({
  className: 'statusPill',
  description:
    'Two-part name:value status pill with an optional leading dot. tone colors the value + dot via colorPalette role tokens.',
  slots: ['root', 'dot', 'name', 'value'],
  base: {
    root: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '1.5',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: 'border.subtle',
      borderRadius: 'md',
      bg: 'surface.default',
      px: '2',
      py: '1',
      whiteSpace: 'nowrap',
    },
    dot: {
      width: '1.5',
      height: '1.5',
      flexShrink: '0',
      borderRadius: 'full',
      bg: 'colorPalette.solid.bg',
    },
    name: {
      textStyle: 'microLabel',
      textTransform: 'uppercase',
      color: 'text.muted',
    },
    value: {
      fontSize: 'xs',
      fontWeight: 'semibold',
      color: 'text.strong',
    },
  },
  variants: {
    tone: {
      neutral: {
        root: { colorPalette: 'neutral' },
        value: { color: 'text.strong' },
      },
      success: {
        root: { colorPalette: 'green' },
        value: { color: 'text.success' },
      },
      warning: {
        root: { colorPalette: 'amber' },
        value: { color: 'text.warning' },
      },
      critical: {
        root: { colorPalette: 'red' },
        value: { color: 'text.critical' },
      },
    },
  },
  defaultVariants: {
    tone: 'neutral',
  },
});

/**
 * A wrapping row of {@link statusPillRecipe} pills. Kept as its own single-part
 * recipe so a cluster of pills wraps cleanly at narrow widths.
 */
export const statusPillRowRecipe = defineRecipe({
  className: 'statusPillRow',
  description: 'Flex-wrap container for a cluster of status pills.',
  base: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '2',
  },
});
