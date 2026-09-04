import { defineSlotRecipe } from '@pandacss/dev';

/**
 * `keyValueTable` slot recipe: a small static label/value (or summary) table —
 * the "I only needed a few rows so I hand-rolled a `<table>` with a stack of css
 * consts" case. Values default to the figure treatment (mono, tabular figures,
 * end-aligned) so numbers line up without re-declaring it per cell.
 *
 * Applied by stable slot class names (`keyValueTable__root`, `…__label`,
 * `…__value`, variant `…__value--mono_true`). Registered in the preset +
 * staticCss.
 */
export const keyValueTableRecipe = defineSlotRecipe({
  className: 'keyValueTable',
  description:
    'A small label/value summary table. Values default to figure styling (mono, tabular-nums, end-aligned); per-row align/mono overrides are applied by the component.',
  slots: ['root', 'caption', 'row', 'label', 'value'],
  base: {
    root: {
      width: 'full',
      borderCollapse: 'collapse',
      fontSize: 'sm',
    },
    caption: {
      captionSide: 'top',
      textAlign: 'start',
      textStyle: 'sectionLabel',
      color: 'text.muted',
      mb: '2',
    },
    row: {
      borderBottomWidth: 'hairline',
      borderBottomStyle: 'solid',
      borderBottomColor: 'border.subtle',
      _last: { borderBottomWidth: 'none' },
    },
    label: {
      textAlign: 'start',
      fontWeight: 'normal',
      color: 'text.muted',
      py: '1.5',
      pr: '4',
      whiteSpace: 'nowrap',
    },
    value: {
      textAlign: 'end',
      color: 'text.strong',
      py: '1.5',
    },
  },
  variants: {
    // The component sets this per cell (default mono) so a text value can opt
    // out of tabular figures.
    mono: {
      true: { value: { textStyle: 'figure' } },
      false: {},
    },
    density: {
      comfortable: {},
      compact: {
        label: { py: '1' },
        value: { py: '1' },
      },
    },
  },
  defaultVariants: {
    mono: true,
    density: 'comfortable',
  },
});
