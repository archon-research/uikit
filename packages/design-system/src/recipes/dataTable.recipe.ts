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
 *   - `scrollable` sets `overflowY` on `root` — applied whenever `DataTable`
 *     gets a `maxHeight` (bounded height is required for virtualization and is
 *     otherwise opt-in, so this stays off by default).
 *   - `stickyHeader` pins each header cell to the top of the scroll container
 *     with an opaque background, so scrolled body rows don't show through it.
 *     Defaults on whenever the table is height-bounded (`scrollable`).
 *   - `flash` is the transient delta-highlight applied to a body cell whose
 *     value changed since the previous render (`DataTable`'s `flashOnUpdate`).
 *     `positive`/`critical` fade from the success/critical background tokens
 *     for an inferred numeric increase/decrease; `neutral` (any other change)
 *     reuses the existing `feedRowFlash` selection-tint fade.
 *
 * Uses semantic tokens only (surface / text / border / interactive), the mono
 * font token, and the spacing / font-size / radius / duration scales.
 */
export const dataTableRecipe = defineSlotRecipe({
  className: 'dataTable',
  description:
    'Class-driven data table: bordered scroll frame, muted uppercase header, and body rows with selectable/clickable states. density sets cell padding (compact is genuinely dense), align sets per-column text alignment, mono renders a column in the mono font with tabular figures. scrollable + stickyHeader back a height-bounded/virtualized table; flash is the transient delta-highlight for streaming updates. Magnitude slots style the inline value bar.',
  slots: [
    'root',
    'table',
    'headerRow',
    'headerCell',
    'headerButton',
    'filterRow',
    'filterCell',
    'filterInput',
    'filterSelect',
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
      // Wide tables scroll horizontally here — which also clips any overlay
      // anchored to a header/body cell (a tooltip, a filter popover). Such
      // overlays must be rendered through the re-exported `Portal` to escape
      // this scroll container; the clipping is intrinsic to an overflow box.
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
    filterRow: {
      bg: 'surface.default',
    },
    filterCell: {
      px: '4',
      py: '1.5',
      borderBottomWidth: '1px',
      borderBottomStyle: 'solid',
      borderBottomColor: 'border.subtle',
    },
    filterInput: {
      width: 'full',
      minWidth: '0',
      fontSize: 'xs',
      lineHeight: 'snug',
      color: 'text.default',
      bg: 'surface.default',
      px: '2',
      py: '1',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: 'border.subtle',
      borderRadius: 'sm',
      _focusVisible: {
        outlineWidth: '2px',
        outlineStyle: 'solid',
        outlineColor: 'border.strong',
        outlineOffset: '1px',
      },
    },
    filterSelect: {
      width: 'full',
      minWidth: '0',
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
      // Match the focus-ring convention used by select/themeToggle so sortable
      // headers aren't the one interactive element with only the UA ring.
      _focusVisible: {
        outlineWidth: '2px',
        outlineStyle: 'solid',
        outlineColor: 'border.strong',
        outlineOffset: '1px',
        borderRadius: 'xs',
      },
    },
    bodyRow: {
      cursor: 'default',
      bg: 'surface.default',
      transitionProperty: 'background-color',
      transitionDuration: 'fast',
      // Rows are keyboard-focusable (tabIndex={0}); give them a designed ring
      // instead of leaving only the UA outline. Inset so it stays inside the
      // table's own border.
      _focusVisible: {
        outlineWidth: '2px',
        outlineStyle: 'solid',
        outlineColor: 'border.strong',
        outlineOffset: '-2px',
      },
    },
    bodyCell: {
      borderBottomWidth: '1px',
      borderBottomStyle: 'solid',
      borderBottomColor: 'border.subtle',
      py: '3.5',
      px: '4',
      // Set an explicit body size so cells don't inherit page body text; the
      // density variant steps it down for dense tables.
      fontSize: 'sm',
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
    // Density carries both padding and a type step: comfortable is the base
    // (header `xs`, body `sm`); compact tightens padding and drops header to
    // `2xs` / body to `xs` for dense tables. It also steps the inline magnitude
    // value/caption down so a dense table's money column shrinks with the rest.
    density: {
      comfortable: {},
      compact: {
        headerCell: { py: '1.5', px: '3', fontSize: '2xs' },
        filterCell: { py: '1', px: '3' },
        bodyCell: { py: '1.5', px: '3', fontSize: 'xs' },
        magnitudeValue: { fontSize: 'xs' },
        magnitudeValueText: { fontSize: '2xs' },
      },
    },
    // Alignment reaches the magnitude slots too, so a right-aligned money
    // column and its inline bar align together instead of being mutually
    // exclusive. Harmless on columns without a magnitude cell.
    align: {
      left: {},
      center: {
        headerCell: { textAlign: 'center' },
        bodyCell: { textAlign: 'center' },
        magnitudeCell: { justifyItems: 'center' },
        magnitudeValue: { textAlign: 'center' },
      },
      right: {
        headerCell: { textAlign: 'right' },
        bodyCell: { textAlign: 'right' },
        magnitudeCell: { justifyItems: 'end' },
        magnitudeValue: { textAlign: 'right' },
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
    // Height-bounded scroll container — required for `virtualized`, also
    // useful standalone (a tall-but-not-virtualized table with a fixed
    // viewport). Off by default so non-scrolling consumers are unaffected.
    scrollable: {
      true: { root: { overflowY: 'auto' } },
      false: {},
    },
    // Pins each header cell to the scroll container's top edge with an
    // opaque background (matching headerRow's) so it doesn't turn
    // transparent over scrolled body rows. `DataTable` defaults this on
    // whenever `scrollable` is on.
    stickyHeader: {
      true: {
        headerCell: {
          position: 'sticky',
          top: '0',
          zIndex: 'docked',
          bg: 'surface.subtle',
        },
      },
      false: {},
    },
    // Transient delta-highlight for a body cell whose value changed since the
    // previous render (`DataTable`'s `flashOnUpdate`). `positive`/`critical`
    // fade from the success/critical background tokens for an inferred
    // numeric increase/decrease; `neutral` covers any other change (reuses
    // the existing `feedRowFlash` selection-tint fade).
    flash: {
      none: {},
      positive: { bodyCell: { animation: 'dataTableFlashPositive' } },
      critical: { bodyCell: { animation: 'dataTableFlashCritical' } },
      neutral: { bodyCell: { animation: 'feedRowFlash' } },
    },
  },
  defaultVariants: {
    density: 'comfortable',
    align: 'left',
    sortable: false,
    selected: false,
    clickable: false,
    mono: false,
    scrollable: false,
    stickyHeader: false,
    flash: 'none',
  },
});
