import { defineSlotRecipe } from '@pandacss/dev';

/**
 * Skin for the Ark Splitter-backed SidebarLayout. Carries the structural frame
 * (flex tracks, min-size resets, overflow) plus the tokenized surfaces, borders,
 * and resize-handle indicators that previously lived as inline `var(--colors-*)`
 * styles. Runtime sizing (panel sizes) still comes from Ark props; this recipe
 * only styles. Semantic tokens throughout so a consumer `className` composed last
 * overrides via the utilities layer.
 */
export const sidebarLayoutRecipe = defineSlotRecipe({
  className: 'sidebarLayout',
  description:
    'Resizable sidebar + main layout over Ark Splitter: structural flex tracks plus tokenized surfaces, borders, and resize-handle indicators.',
  slots: [
    'root',
    'horizontalSplitter',
    'sidebar',
    'main',
    'topBar',
    'mainColumn',
    'content',
    'verticalSplitter',
    'contentPanel',
    'bottomPanel',
    'verticalResizeTrigger',
    'horizontalResizeTrigger',
    'verticalResizeIndicator',
    'horizontalResizeIndicator',
  ],
  base: {
    root: {
      width: 'full',
      height: '100vh',
      minWidth: '0',
      overflow: 'hidden',
    },
    horizontalSplitter: {
      width: 'full',
      height: 'full',
      display: 'flex',
      minWidth: '0',
      minHeight: '0',
    },
    sidebar: {
      minWidth: '0',
      minHeight: '0',
      overflow: 'auto',
      borderInlineEndWidth: '1px',
      borderInlineEndStyle: 'solid',
      borderColor: 'border.subtle',
      bg: 'surface.default',
    },
    main: {
      minWidth: '0',
      minHeight: '0',
      height: 'full',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      bg: 'surface.default',
    },
    topBar: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      px: '4',
      py: '3',
      minHeight: '16',
      borderBottomWidth: '1px',
      borderBottomStyle: 'solid',
      borderColor: 'border.subtle',
      bg: 'surface.default',
    },
    mainColumn: {
      display: 'flex',
      flexDirection: 'column',
      minWidth: '0',
      minHeight: '0',
      height: 'full',
      flex: '1',
      overflow: 'hidden',
      bg: 'surface.default',
    },
    content: {
      minWidth: '0',
      minHeight: '0',
      flex: '1',
      overflow: 'auto',
      bg: 'surface.default',
    },
    verticalSplitter: {
      width: 'full',
      height: 'full',
      display: 'flex',
      flexDirection: 'column',
      minWidth: '0',
      minHeight: '0',
    },
    contentPanel: {
      minWidth: '0',
      minHeight: '0',
      height: 'full',
      overflow: 'hidden',
    },
    bottomPanel: {
      minHeight: '0',
      overflow: 'auto',
      borderTopWidth: '1px',
      borderTopStyle: 'solid',
      borderColor: 'border.subtle',
      bg: 'surface.default',
    },
    verticalResizeTrigger: {
      position: 'relative',
      width: '2',
      mx: '-1',
      p: '0',
      border: 'none',
      outline: 'none',
      bg: 'transparent',
      cursor: 'col-resize',
      zIndex: '1',
      transitionProperty: 'background-color',
      transitionDuration: 'fast',
      '&:hover, &[data-focus]': { bg: 'interactive.accent' },
      '&[data-dragging]': { bg: 'interactive.accent' },
    },
    horizontalResizeTrigger: {
      position: 'relative',
      height: '2',
      my: '-1',
      p: '0',
      border: 'none',
      outline: 'none',
      bg: 'transparent',
      cursor: 'row-resize',
      zIndex: '1',
      transitionProperty: 'background-color',
      transitionDuration: 'fast',
      '&:hover, &[data-focus]': { bg: 'interactive.accent' },
      '&[data-dragging]': { bg: 'interactive.accent' },
    },
    verticalResizeIndicator: {
      position: 'absolute',
      top: '0',
      bottom: '0',
      insetInlineStart: '50%',
      width: '1px',
      transform: 'translateX(-50%)',
      bg: 'border.subtle',
    },
    horizontalResizeIndicator: {
      position: 'absolute',
      insetInlineStart: '0',
      insetInlineEnd: '0',
      top: '50%',
      height: '1px',
      transform: 'translateY(-50%)',
      bg: 'border.subtle',
    },
  },
  variants: {
    // `split` (default) is the resizable Ark Splitter layout. `stacked` is the
    // narrow-width fallback the component swaps to below its `collapseBelow`
    // breakpoint: sidebar and main become a single scrolling column (no
    // Splitter, so no inline flex-basis to fight), the sidebar spans full width
    // with a bottom rule instead of an inline-end one, and the root scrolls
    // instead of clipping.
    layout: {
      split: {},
      stacked: {
        root: { height: '100vh', overflowX: 'hidden', overflowY: 'auto' },
        horizontalSplitter: {
          flexDirection: 'column',
          height: 'auto',
          minHeight: 'full',
        },
        sidebar: {
          width: 'full',
          height: 'auto',
          overflow: 'visible',
          borderInlineEndWidth: '0',
          borderBottomWidth: '1px',
          borderBottomStyle: 'solid',
          borderColor: 'border.subtle',
        },
        main: { width: 'full', height: 'auto' },
        mainColumn: { height: 'auto' },
        content: { flex: 'none' },
      },
    },
  },
  defaultVariants: {
    layout: 'split',
  },
});
