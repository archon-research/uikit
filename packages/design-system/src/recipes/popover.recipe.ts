import { defineSlotRecipe } from '@pandacss/dev';

/**
 * `popover` slot recipe: a themed skin over Ark Popover, so consumers stop
 * re-styling Ark's popover from scratch (trigger/positioner/content/close) and
 * drifting on padding/shadow/z-index. Unlike a hover `Tooltip`/`InfoTip`, a
 * popover is click-triggered and its content is focusable and selectable — the
 * right surface for a dismissible panel, a deeplinked help bubble, or a filter.
 *
 * Behavior (open/close, focus trap, dismiss, positioning) comes from Ark; this
 * recipe only skins it, applied by stable slot class names (`popover__content`,
 * …). Registered in the preset + staticCss.
 */
export const popoverRecipe = defineSlotRecipe({
  className: 'popover',
  description:
    'Themed skin over Ark Popover: surface content with a hairline border, overlay shadow, popover z-index, and a close affordance. Behavior comes from Ark.',
  slots: [
    'positioner',
    'content',
    'title',
    'description',
    'closeTrigger',
    'arrow',
    'arrowTip',
  ],
  base: {
    positioner: {
      zIndex: 'popover',
    },
    content: {
      display: 'flex',
      flexDirection: 'column',
      gap: '2',
      maxWidth: 'min(24rem, calc(100vw - 2rem))',
      p: '4',
      bg: 'surface.default',
      color: 'text.default',
      borderWidth: 'hairline',
      borderStyle: 'solid',
      borderColor: 'border.subtle',
      borderRadius: 'md',
      boxShadow: 'overlay',
      fontSize: 'sm',
      lineHeight: 'relaxed',
      _focusVisible: {
        outline: 'none',
      },
    },
    title: {
      m: '0',
      textStyle: 'sectionLabel',
      color: 'text.strong',
    },
    description: {
      m: '0',
      color: 'text.muted',
    },
    closeTrigger: {
      position: 'absolute',
      top: '2',
      insetInlineEnd: '2',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      w: '6',
      h: '6',
      borderRadius: 'sm',
      borderWidth: 'hairline',
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
    // Ark renders the arrow via CSS custom properties (`--arrow-size`,
    // `--arrow-background`); wire them to the content surface so the arrow
    // matches the panel and its hairline border.
    arrow: {
      '--arrow-size': '8px',
      '--arrow-background': 'colors.surface.default',
    },
    arrowTip: {
      borderTopWidth: 'hairline',
      borderInlineStartWidth: 'hairline',
      borderStyle: 'solid',
      borderColor: 'border.subtle',
    },
  },
});
