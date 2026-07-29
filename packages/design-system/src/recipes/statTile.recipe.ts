import { defineRecipe, defineSlotRecipe } from '@pandacss/dev';

/**
 * KPI/stat tile slot recipe. `tone` recolors the value + sub caption via
 * semantic text tokens only; the tile frame stays a raised surface.
 */
export const statTileRecipe = defineSlotRecipe({
  className: 'statTile',
  description:
    'Compact KPI tile: raised surface frame with label, value, and optional sub caption. Tone recolors value + sub via semantic text tokens.',
  slots: ['root', 'label', 'value', 'sub'],
  base: {
    root: {
      display: 'grid',
      gap: '1',
      p: '3',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: 'border.subtle',
      borderRadius: 'md',
      bg: 'surface.default',
      minWidth: '0',
    },
    label: {
      textStyle: 'sectionLabel',
      color: 'text.muted',
    },
    value: {
      textStyle: 'panelTitle',
      color: 'text.strong',
      fontVariantNumeric: 'tabular-nums',
    },
    sub: {
      textStyle: 'bodySm',
      color: 'text.muted',
    },
  },
  variants: {
    tone: {
      default: {},
      success: {
        value: { color: 'text.success' },
        sub: { color: 'text.success' },
      },
      critical: {
        value: { color: 'text.critical' },
        sub: { color: 'text.critical' },
      },
    },
    labelCase: {
      none: {},
      upper: {
        label: {
          textTransform: 'uppercase',
          letterSpacing: 'wider',
        },
      },
    },
  },
  defaultVariants: {
    tone: 'default',
    labelCase: 'none',
  },
});

/**
 * Responsive 2 -> 4 column grid that lays out {@link statTileRecipe} tiles.
 * Kept as its own single-part recipe (not a slot) since it is a standalone
 * layout container.
 */
export const statRowRecipe = defineRecipe({
  className: 'statRow',
  description: 'Responsive 2 -> 4 column grid container for stat tiles.',
  base: {
    display: 'grid',
    gap: '3',
    gridTemplateColumns: {
      base: 'repeat(2, minmax(0, 1fr))',
      md: 'repeat(4, minmax(0, 1fr))',
    },
  },
});
