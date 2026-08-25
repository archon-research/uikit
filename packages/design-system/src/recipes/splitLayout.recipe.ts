import { defineSlotRecipe } from '@pandacss/dev';

/**
 * Skin for `SplitLayout`, the generic N-way resizable-panel primitive built
 * on Ark Splitter (the same primitive `SidebarLayout` uses for its fixed
 * two/three-pane shape). Where `SidebarLayout` hardcodes a sidebar + main +
 * optional bottom panel, `SplitLayout` renders however many panels it's
 * given in one orientation — nesting a `SplitLayout` inside another panel's
 * content is how a mixed row/column layout is built, so this recipe only
 * ever needs ONE resize-trigger/indicator pair (not four like
 * `sidebarLayout`'s), switched by Ark's own `data-orientation` attribute
 * rather than a second slot per axis.
 */
export const splitLayoutRecipe = defineSlotRecipe({
  className: 'splitLayout',
  description:
    'Generic N-way resizable-panel primitive over Ark Splitter: root/panel structure plus a single resize-trigger/indicator pair switched by data-orientation. Nest a SplitLayout inside a panel to mix row and column splits.',
  slots: ['root', 'panel', 'resizeTrigger', 'resizeTriggerIndicator'],
  base: {
    root: {
      display: 'flex',
      width: 'full',
      height: 'full',
      minWidth: '0',
      minHeight: '0',
      '&[data-orientation="vertical"]': { flexDirection: 'column' },
    },
    panel: {
      minWidth: '0',
      minHeight: '0',
      overflow: 'auto',
      bg: 'surface.default',
    },
    // The trigger IS the visible/graspable handle here (unlike
    // `sidebarLayout`'s invisible-track + separate 1px-indicator split) —
    // fewer moving parts, and it fills with the accent color on
    // hover/focus/drag for a bigger, more forgiving visual target. Matches
    // the resizable-split handle skin in the reference this was informed
    // by (`4ef50f5:app/src/declarative/renderer.tsx`).
    resizeTrigger: {
      position: 'relative',
      flexShrink: '0',
      p: '0',
      border: 'none',
      outline: 'none',
      bg: 'transparent',
      zIndex: '1',
      transitionProperty: 'background-color',
      transitionDuration: 'fast',
      '&[data-orientation="horizontal"]': {
        width: '2',
        mx: '-1',
        cursor: 'col-resize',
      },
      '&[data-orientation="vertical"]': {
        height: '2',
        my: '-1',
        cursor: 'row-resize',
      },
      '&:hover, &[data-focus]': {
        bg: 'interactive.accent',
        '& [data-part="indicator"]': { bg: 'transparent' },
      },
      '&[data-dragging]': {
        bg: 'interactive.accent',
        '& [data-part="indicator"]': { bg: 'transparent' },
      },
    },
    // A static separator line at rest; the trigger's own hover/focus/drag
    // tint (above) turns this transparent during interaction so its own
    // `border.subtle` fill doesn't show through as a seam in the accent fill.
    resizeTriggerIndicator: {
      position: 'absolute',
      bg: 'border.subtle',
      pointerEvents: 'none',
      '&[data-orientation="horizontal"]': {
        top: '0',
        bottom: '0',
        insetInlineStart: '50%',
        width: '1px',
        transform: 'translateX(-50%)',
      },
      '&[data-orientation="vertical"]': {
        insetInlineStart: '0',
        insetInlineEnd: '0',
        top: '50%',
        height: '1px',
        transform: 'translateY(-50%)',
      },
    },
  },
});
