import { defineSlotRecipe } from '@pandacss/dev';

/**
 * Class-driven data table slot recipe. Owns the whole table surface: the
 * bordered scroll frame (`root`), the table element, the muted uppercase header
 * row, and body rows with selectable/clickable states. The inline magnitude
 * value bar (value text + progress track/range) is styled through its own
 * slots so the table no longer needs any inline style objects.
 *
 * Variants:
 *   - `density` sets header + body cell padding. `comfortable` (the default,
 *     in the slot base) stays roomy; `compact` is genuinely dense (~6px
 *     vertical) for information-heavy tables.
 *   - `align` sets the horizontal text alignment on both the header and body
 *     cells of a column; applied per column via the emitted slot-variant class.
 *   - `mono` renders a body column in the mono font with tabular figures so
 *     numeric values align down the column.
 *   - `sortable` / `selected` / `clickable` reflect per-cell/per-row state.
 *
 * Uses semantic tokens only (surface / text / border / interactive), the mono
 * font token, and the spacing / font-size / radius / duration scales.
 */
export const dataTableRecipe = defineSlotRecipe({
  className: 'dataTable',
  description:
    'Class-driven data table: bordered scroll frame, muted uppercase header, and body rows with selectable/clickable states. density sets cell padding (compact is genuinely dense), align sets per-column text alignment, mono renders a column in the mono font with tabular figures. Magnitude slots style the inline value bar.',
  slots: [
    'root',
    'table',
    'headerRow',
    'headerCell',
    'headerButton',
    'bodyRow',
    'bodyCell',
    'magnitudeCell',
    'magnitudeValue',
    'magnitudeProgressRoot',
    'magnitudeProgressTrack',
    'magnitudeProgressRange',
    'magnitudeValueText',
  ],
  base: {
    root: {
      overflowX: 'auto',
      borderRadius: 'md',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: 'border.subtle',
    },
    table: {
      width: 'full',
      borderCollapse: 'collapse',
      bg: 'surface.default',
    },
    headerRow: {
      bg: 'surface.subtle',
    },
    headerCell: {
      // Comfortable padding lives in the base; the compact density variant
      // tightens it. Header type is a muted, uppercase micro-label.
      py: '3',
      px: '4',
      textAlign: 'left',
      fontSize: 'xs',
      fontWeight: 'semibold',
      letterSpacing: 'wider',
      textTransform: 'uppercase',
      color: 'text.muted',
      cursor: 'default',
    },
    headerButton: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '1.5',
      borderWidth: '0',
      bg: 'transparent',
      p: '0',
      font: 'inherit',
      color: 'inherit',
      // `font: inherit` does not carry text-transform/letter-spacing, and the UA
      // resets them on <button>, so a sortable header would drop the cell's
      // uppercase micro-label styling. Inherit them explicitly.
      textTransform: 'inherit',
      letterSpacing: 'inherit',
      cursor: 'pointer',
    },
    bodyRow: {
      cursor: 'default',
      bg: 'surface.default',
      transitionProperty: 'background-color',
      transitionDuration: 'fast',
    },
    bodyCell: {
      borderBottomWidth: '1px',
      borderBottomStyle: 'solid',
      borderBottomColor: 'border.subtle',
      py: '3.5',
      px: '4',
      textAlign: 'left',
    },
    magnitudeCell: {
      display: 'grid',
      gap: '2',
    },
    magnitudeValue: {
      color: 'text.default',
      fontSize: 'sm',
      lineHeight: 'snug',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    magnitudeProgressRoot: {
      display: 'grid',
      width: 'full',
      maxWidth: '64',
      gridTemplateColumns: '1fr',
      gap: '1',
    },
    magnitudeProgressTrack: {
      position: 'relative',
      width: 'full',
      height: '1.5',
      overflow: 'hidden',
      borderRadius: 'full',
      bg: 'surface.subtle',
    },
    magnitudeProgressRange: {
      height: 'full',
      borderRadius: 'full',
      bg: 'chart.series.primary',
      transitionProperty: 'width',
      transitionDuration: 'fast',
    },
    magnitudeValueText: {
      color: 'text.muted',
      fontSize: 'xs',
      fontVariantNumeric: 'tabular-nums',
      justifySelf: 'end',
    },
  },
  variants: {
    density: {
      comfortable: {},
      compact: {
        headerCell: { py: '1.5', px: '3' },
        bodyCell: { py: '1.5', px: '3' },
      },
    },
    align: {
      left: {},
      center: {
        headerCell: { textAlign: 'center' },
        bodyCell: { textAlign: 'center' },
      },
      right: {
        headerCell: { textAlign: 'right' },
        bodyCell: { textAlign: 'right' },
      },
    },
    sortable: {
      true: { headerCell: { cursor: 'pointer' } },
      false: {},
    },
    selected: {
      true: { bodyRow: { bg: 'interactive.selected' } },
      false: {},
    },
    clickable: {
      true: { bodyRow: { cursor: 'pointer' } },
      false: {},
    },
    mono: {
      true: {
        bodyCell: {
          fontFamily: 'mono',
          fontVariantNumeric: 'tabular-nums',
        },
      },
      false: {},
    },
  },
  defaultVariants: {
    density: 'comfortable',
    align: 'left',
    sortable: false,
    selected: false,
    clickable: false,
    mono: false,
  },
});
