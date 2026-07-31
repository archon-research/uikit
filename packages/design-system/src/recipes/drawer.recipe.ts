import { defineSlotRecipe } from '@pandacss/dev';

export const drawerRecipe = defineSlotRecipe({
  className: 'drawer',
  description:
    'Right-anchored drawer skin over Ark Drawer: fixed scrim, edge-aligned panel, and a slide/fade transition keyed off Ark data-state, all tokenized.',
  slots: [
    'backdrop',
    'positioner',
    'content',
    'title',
    'description',
    'closeTrigger',
  ],
  base: {
    backdrop: {
      position: 'fixed',
      inset: '0',
      zIndex: '50',
      bg: 'overlay.backdrop',
      opacity: '0',
      transitionProperty: 'opacity',
      transitionDuration: 'normal',
      transitionTimingFunction: 'out',
      '&[data-state="open"]': {
        opacity: '1',
      },
      '&[data-state="closed"]': {
        opacity: '0',
      },
    },
    positioner: {
      position: 'fixed',
      insetBlock: '0',
      insetInlineEnd: '0',
      zIndex: '50',
      display: 'flex',
    },
    content: {
      display: 'flex',
      flexDirection: 'column',
      gap: '4',
      maxWidth: '100vw',
      height: '100%',
      p: '5',
      bg: 'surface.default',
      color: 'text.default',
      borderInlineStartWidth: '1px',
      borderInlineStartStyle: 'solid',
      borderColor: 'border.subtle',
      boxShadow: '-8px 0 24px rgba(15, 23, 42, 0.16)',
      willChange: 'transform',
      transform: 'translateX(100%)',
      transitionProperty: 'transform',
      transitionDuration: 'normal',
      transitionTimingFunction: 'out',
      '&[data-state="open"]': {
        transform: 'translateX(0)',
      },
      '&[data-state="closed"]': {
        transform: 'translateX(100%)',
      },
      _focusVisible: {
        outline: 'none',
      },
    },
    title: {
      m: '0',
      textStyle: 'panelTitle',
      color: 'text.strong',
    },
    description: {
      m: '0',
      textStyle: 'bodySm',
      color: 'text.muted',
    },
    closeTrigger: {
      position: 'absolute',
      top: '4',
      insetInlineEnd: '4',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      w: '8',
      h: '8',
      borderRadius: 'sm',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: 'transparent',
      bg: 'transparent',
      color: 'text.muted',
      cursor: 'pointer',
      transitionDuration: 'fast',
      transitionProperty: 'background-color, color, border-color',
      _hover: {
        bg: 'interactive.hover',
        color: 'text.default',
      },
      _focusVisible: {
        outlineWidth: '2px',
        outlineStyle: 'solid',
        outlineColor: 'border.strong',
        outlineOffset: '1px',
      },
    },
  },
  variants: {
    // Panel width. `md` preserves the previous fixed width; `sm`/`lg` give
    // consumers a wider/narrower drawer without a hardcoded override.
    size: {
      sm: { content: { width: 'min(22rem, 100vw)' } },
      md: { content: { width: 'min(28rem, 100vw)' } },
      lg: { content: { width: 'min(40rem, 100vw)' } },
    },
  },
  defaultVariants: {
    size: 'md',
  },
});
