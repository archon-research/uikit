import { defineRecipe, defineSlotRecipe } from '@pandacss/dev';

/**
 * KPI/stat tile slot recipe. `tone` recolors the value + sub caption via
 * semantic text tokens only; the tile frame stays a raised surface.
 */
export const statTileRecipe = defineSlotRecipe({
  className: 'statTile',
  description:
    'Compact KPI tile: raised surface frame with label, value, and optional sub caption. Value and sub are wrap-friendly inline rows, so either can carry an adornment (unit, badge, icon) beside its text. Tone recolors value + sub via semantic text tokens.',
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
    // A value is a ROW, not a single text node: it routinely carries an
    // adornment beside the number (unit, delta badge, trend icon) and long
    // values must wrap rather than overflow the tile. Text-only styling here
    // forced consumers to inject their own flex layout, so the slot owns it.
    // Plain text renders unchanged: a lone text child becomes one anonymous
    // flex item whose line box is the same height as the block box it
    // replaces, and `gap` has no effect with a single item.
    //
    // The contract that follows from being a flex row: `gap` OWNS inter-child
    // spacing, and literal whitespace between children is not rendered. A
    // whitespace-only text run between two flex items is dropped by flex
    // layout (CSS Flexible Box Layout Level 1 § 4 "Flex Items": a sequence of
    // child text runs containing only white space "is not rendered", as if the
    // text nodes were `display: none`), so `value={<>{n} <span>%</span></>}`
    // loses its space and
    // shows the 8px gap instead. No styling can bring that space back — it
    // never reaches layout. Write multi-child values with no separator and let
    // `gap` space them; when a figure must read as one uninterrupted string
    // ("4.2 %", "1.2 / 3.0"), pass it as a SINGLE text child, where ordinary
    // white-space handling applies.
    value: {
      display: 'inline-flex',
      alignItems: 'baseline',
      flexWrap: 'wrap',
      gap: '2',
      minWidth: '0',
      // A figure has no break opportunities, so flexWrap alone cannot save a
      // long unspaced value in a narrow tile.
      overflowWrap: 'anywhere',
      textStyle: 'panelTitle',
      color: 'text.strong',
      fontVariantNumeric: 'tabular-nums',
    },
    // Same treatment for the caption (a delta chip or icon next to "+2.4% 24h"),
    // one gap step tighter to match its smaller type — and the same whitespace
    // contract as `value`: the 4px gap owns the spacing, literal whitespace
    // between children is dropped.
    sub: {
      display: 'inline-flex',
      alignItems: 'baseline',
      flexWrap: 'wrap',
      gap: '1',
      minWidth: '0',
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
    density: {
      comfortable: {},
      compact: {
        label: {
          textStyle: 'microLabel',
        },
        sub: {
          textStyle: 'metaText',
        },
      },
    },
    // Leading-edge state stripe: a thicker colored left border that carries the
    // tile's state as a few pixels of color, independent of `tone` (which
    // recolors the value). A runtime hue is applied by the component as an
    // inline `borderLeftColor` (which wins over these token colors), so an
    // instrument's own color can drive the stripe without a build-time class.
    // The discipline the value must still keep: an accent never carries state
    // alone — the value or sub caption states it too.
    accent: {
      none: {},
      neutral: {
        root: { borderLeftWidth: '3px', borderLeftColor: 'border.strong' },
      },
      success: {
        root: { borderLeftWidth: '3px', borderLeftColor: 'text.success' },
      },
      warning: {
        root: { borderLeftWidth: '3px', borderLeftColor: 'text.warning' },
      },
      critical: {
        root: { borderLeftWidth: '3px', borderLeftColor: 'text.critical' },
      },
    },
  },
  defaultVariants: {
    tone: 'default',
    labelCase: 'none',
    density: 'comfortable',
    accent: 'none',
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
