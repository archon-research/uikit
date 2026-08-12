import { defineSlotRecipe } from '@pandacss/dev';

/**
 * `expandableDataTable` slot recipe: a virtualized table with a per-row
 * expandable detail panel (master/detail). Distinct from `dataTable` because
 * each logical row renders as its own `<tbody>` (the main `<tr>` plus, when
 * expanded, a full-width detail `<tr>`) so the virtualizer can measure the
 * combined height as one unit — the reason it's a sibling rather than a flag on
 * `dataTable`.
 *
 * The design-system builds with `tsc` and ships no generated `styled-system`,
 * so the component applies this by stable slot class names
 * (`expandableDataTable__${slot}`, variant `…--${key}_${value}`). Registered in
 * the preset + staticCss.
 */
export const expandableDataTableRecipe = defineSlotRecipe({
  className: 'expandableDataTable',
  description:
    'Virtualized master/detail table: an expandable detail row per record, each row a <tbody> so its expanded height is measured as one unit.',
  slots: [
    'root',
    'scroll',
    'table',
    'header',
    'headerRow',
    'headerCell',
    'sortButton',
    'rowGroup',
    'row',
    'cell',
    'expanderCell',
    'expander',
    'detailRow',
    'detailCell',
    'empty',
  ],
  base: {
    root: {
      position: 'relative',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: 'border.subtle',
      borderRadius: 'md',
      overflow: 'hidden',
      bg: 'surface.default',
      color: 'text.default',
    },
    scroll: {
      overflow: 'auto',
    },
    table: {
      width: 'full',
      borderCollapse: 'collapse',
      fontSize: 'sm',
    },
    header: {
      bg: 'surface.subtle',
    },
    headerRow: {},
    headerCell: {
      textAlign: 'start',
      px: '3',
      py: '2',
      fontSize: 'xs',
      fontWeight: 'semibold',
      letterSpacing: 'wide',
      color: 'text.muted',
      whiteSpace: 'nowrap',
      borderBottomWidth: '1px',
      borderBottomStyle: 'solid',
      borderBottomColor: 'border.subtle',
    },
    sortButton: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '1',
      cursor: 'pointer',
      bg: 'transparent',
      border: 'none',
      font: 'inherit',
      color: 'inherit',
      p: '0',
      _hover: { color: 'text.default' },
    },
    rowGroup: {},
    row: {
      borderBottomWidth: '1px',
      borderBottomStyle: 'solid',
      borderBottomColor: 'border.hairline',
    },
    cell: {
      px: '3',
      py: '2',
      color: 'text.default',
      verticalAlign: 'top',
    },
    expanderCell: {
      width: '1%',
      px: '2',
      verticalAlign: 'top',
    },
    expander: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '5',
      height: '5',
      borderRadius: 'sm',
      border: 'none',
      bg: 'transparent',
      color: 'text.muted',
      cursor: 'pointer',
      lineHeight: '1',
      transition: 'transform 120ms ease',
      _hover: { color: 'text.strong', bg: 'interactive.hover' },
      _focusVisible: {
        outline: '2px solid',
        outlineColor: 'text.interactive',
        outlineOffset: '1px',
      },
      // Rotate the glyph when the row is open (the component sets data-expanded).
      '&[data-expanded="true"]': { transform: 'rotate(90deg)' },
    },
    detailRow: {},
    detailCell: {
      px: '3',
      py: '3',
      bg: 'surface.subtle',
      borderBottomWidth: '1px',
      borderBottomStyle: 'solid',
      borderBottomColor: 'border.subtle',
    },
    empty: {
      px: '3',
      py: '8',
      textAlign: 'center',
      color: 'text.muted',
    },
  },
  variants: {
    // Numeric cells: mono font + tabular figures so values align down a column
    // (the component sets this per cell from the column's `meta.mono`).
    mono: {
      true: {
        cell: {
          fontFamily: 'mono',
          fontVariantNumeric: 'tabular-nums',
        },
      },
      false: {},
    },
    density: {
      comfortable: {},
      compact: {
        headerCell: { py: '1' },
        cell: { py: '1' },
        detailCell: { py: '2' },
      },
    },
    stickyHeader: {
      false: {},
      true: {
        header: {
          position: 'sticky',
          top: '0',
          zIndex: '1',
        },
      },
    },
  },
  defaultVariants: {
    mono: false,
    density: 'comfortable',
    stickyHeader: false,
  },
});
