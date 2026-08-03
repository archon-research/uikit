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
 *
 * Column resize / reorder / pin + row-selection slots (added alongside
 * `useDataTable`'s `columnSizing`/`columnOrder`/`columnPinning`/
 * `rowSelection` config surface):
 *   - `resizeHandle` is the drag grip `DataTable` renders in the right edge
 *     of a resizable header cell; `&[data-resizing="true"]` highlights it
 *     while the drag is live.
 *   - `pinToggle` is the pin/unpin button `DataTable` renders in a header
 *     cell when `enableColumnPinning` is on; `&[data-pinned="true"]` tints it
 *     once the column is actually pinned.
 *   - `headerCell`/`bodyCell` gain a `pinned` variant (`left`/`right`) for
 *     the sticky-positioned, opaque-backed pinned column; the actual pixel
 *     offset (`column.getStart()`/`getAfter()`) is a runtime value `DataTable`
 *     sets inline, same convention as `minWidth`/`maxHeight`. `headerCell`
 *     also gains `&[data-dragging="true"]`/`&[data-drop-target="true"]`
 *     states for `DataTable`'s drag-to-reorder header affordance
 *     (`enableColumnReordering`).
 *   - `selectCell` is the narrow checkbox column `DataTable` renders (header
 *     select-all + one per row) whenever the table's `rowSelection` feature
 *     is on.
 *   - `fixedLayout` switches `table` to `tableLayout: fixed` — required for
 *     column widths (resizing) and sticky offsets (pinning) to mean anything;
 *     `DataTable` turns it on whenever resizing or pinning is in play.
 */
export const dataTableRecipe = defineSlotRecipe({
  className: 'dataTable',
  description:
    'Class-driven data table: bordered scroll frame, muted uppercase header, and body rows with selectable/clickable states. density sets cell padding (compact is genuinely dense), align sets per-column text alignment, mono renders a column in the mono font with tabular figures. scrollable + stickyHeader back a height-bounded/virtualized table; flash is the transient delta-highlight for streaming updates. fixedLayout + pinned back column resize/pin; selectCell backs multi-row selection. Magnitude slots style the inline value bar.',
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
    'headerInner',
    'resizeHandle',
    'pinToggle',
    'selectCell',
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
      // Drag-to-reorder affordance (`DataTable`'s `enableColumnReordering`):
      // the dragged header dims, and the header under the pointer gets an
      // accent rule on its leading edge as a drop-target indicator.
      '&[data-dragging="true"]': { opacity: '0.5' },
      '&[data-drop-target="true"]': {
        boxShadow: 'inset 2px 0 0 0 var(--colors-interactive-accent)',
      },
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
      flex: '1',
      minWidth: '0',
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
    // Lays the (possibly draggable/sortable) header label and the pin
    // toggle button side by side as siblings — never nested inside one
    // interactive element, so a click on one never bubbles into the other.
    headerInner: {
      display: 'flex',
      alignItems: 'center',
      gap: '1.5',
      minWidth: '0',
    },
    // `touchAction: none` matters here — without it, a touch drag on the
    // handle scrolls the container instead of resizing the column.
    resizeHandle: {
      position: 'absolute',
      insetBlock: '0',
      insetInlineEnd: '0',
      width: '5px',
      cursor: 'col-resize',
      userSelect: 'none',
      touchAction: 'none',
      bg: 'transparent',
      '&:hover': { bg: 'border.strong' },
      '&[data-resizing="true"]': { bg: 'interactive.accent' },
    },
    pinToggle: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '4.5',
      height: '4.5',
      flexShrink: '0',
      borderRadius: 'xs',
      borderWidth: '0',
      p: '0',
      color: 'text.muted',
      bg: 'transparent',
      cursor: 'pointer',
      '&:hover': { color: 'text.default', bg: 'surface.hover' },
      '&[data-pinned="true"]': { color: 'interactive.accent' },
    },
    // Self-contained (not composed with `headerCell`/`bodyCell`) so it never
    // depends on cross-slot CSS source-order: it carries its own padding,
    // background, and border, switched on the `data-part` attribute
    // `DataTable` already sets on every header/body cell rather than a
    // second slot per context.
    selectCell: {
      width: '10',
      textAlign: 'center',
      verticalAlign: 'middle',
      '&[data-part="header-cell"]': {
        py: '3',
        px: '4',
        bg: 'surface.subtle',
      },
      '&[data-part="body-cell"]': {
        py: '3.5',
        px: '4',
        borderBottomWidth: '1px',
        borderBottomStyle: 'solid',
        borderBottomColor: 'border.subtle',
      },
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
        selectCell: {
          '&[data-part="header-cell"]': { py: '1.5', px: '3' },
          '&[data-part="body-cell"]': { py: '1.5', px: '3' },
        },
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
        // Only the header-context instance of `selectCell` should stick —
        // the body-context one (every row's checkbox cell) must not.
        selectCell: {
          '&[data-part="header-cell"]': {
            position: 'sticky',
            top: '0',
            zIndex: 'docked',
          },
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
    // Two-phase delta-highlight (`DataTable`'s `flashOnUpdate="two-phase"`):
    // hold ~400ms then an independently-timed fade ~900ms (the single
    // `dataTableFlashTwoPhase` animation token), tinted per direction by
    // setting the `--data-table-flash-color` custom property the `flashHold`/
    // `flashFade` keyframes read from. `up`/`down` are the inferred numeric
    // increase/decrease, alpha-tinted at 16% of the chart series
    // positive/critical hue; `neutral` covers any other change (an
    // "unchanged-refresh" — e.g. a re-render with the same computed display
    // value) at 12% of muted text, per the alpha-usage convention research
    // settled on for streaming-update tints. Independent of the single-phase
    // `flash` variant above — a consumer picks one or the other via
    // `flashOnUpdate`, never both at once.
    flashTwoPhase: {
      none: {},
      up: {
        bodyCell: {
          '--data-table-flash-color':
            'color-mix(in srgb, var(--colors-chart-series-positive) 16%, transparent)',
          animation: 'dataTableFlashTwoPhase',
          '@media (prefers-reduced-motion: reduce)': {
            animationDuration: '1ms, 1ms',
          },
        },
      },
      down: {
        bodyCell: {
          '--data-table-flash-color':
            'color-mix(in srgb, var(--colors-chart-series-critical) 16%, transparent)',
          animation: 'dataTableFlashTwoPhase',
          '@media (prefers-reduced-motion: reduce)': {
            animationDuration: '1ms, 1ms',
          },
        },
      },
      neutral: {
        bodyCell: {
          '--data-table-flash-color':
            'color-mix(in srgb, var(--colors-text-muted) 12%, transparent)',
          animation: 'dataTableFlashTwoPhase',
          '@media (prefers-reduced-motion: reduce)': {
            animationDuration: '1ms, 1ms',
          },
        },
      },
    },
    // `table-layout: fixed` is what makes a resize drag (or a pinned
    // column's sticky offset) mean anything — with `auto`, the browser
    // re-derives widths from content and ignores both. `DataTable` turns
    // this on whenever `enableColumnResizing` or `enableColumnPinning` is in
    // play; off by default so an ordinary table keeps its natural,
    // content-driven column widths. `headerCell` needs `position: relative`
    // as the resize handle's positioning context.
    fixedLayout: {
      true: {
        table: { tableLayout: 'fixed' },
        headerCell: { position: 'relative' },
      },
      false: {},
    },
    // Sticky-positioned, opaque-backed pinned column (`DataTable`'s
    // `enableColumnPinning`). The pixel offset itself
    // (`column.getStart()`/`getAfter()`) is a runtime value `DataTable` sets
    // inline — this variant only supplies the position/z-index/background/
    // separator-rule that don't depend on that offset.
    pinned: {
      none: {},
      left: {
        headerCell: {
          position: 'sticky',
          zIndex: 'docked',
          bg: 'surface.subtle',
          boxShadow: 'inset -1px 0 0 0 var(--colors-border-subtle)',
        },
        bodyCell: {
          position: 'sticky',
          zIndex: 'docked',
          bg: 'surface.default',
          boxShadow: 'inset -1px 0 0 0 var(--colors-border-subtle)',
        },
      },
      right: {
        headerCell: {
          position: 'sticky',
          zIndex: 'docked',
          bg: 'surface.subtle',
          boxShadow: 'inset 1px 0 0 0 var(--colors-border-subtle)',
        },
        bodyCell: {
          position: 'sticky',
          zIndex: 'docked',
          bg: 'surface.default',
          boxShadow: 'inset 1px 0 0 0 var(--colors-border-subtle)',
        },
      },
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
    flashTwoPhase: 'none',
    fixedLayout: false,
    pinned: 'none',
  },
});
