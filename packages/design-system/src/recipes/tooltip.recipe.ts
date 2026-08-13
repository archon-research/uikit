import { defineRecipe, defineSlotRecipe } from '@pandacss/dev';

/**
 * Surface styling for a tooltip bubble — apply to Ark `Tooltip.Content` via
 * `className="tooltip"` so consumers stop re-deriving surface/border/shadow/
 * z-index/max-width. Uses the always-dark `overlay.tooltip` fill with
 * theme-invariant `text.inverse` and the `tooltip` z-index step. Registered in
 * the preset + staticCss.
 */
export const tooltipRecipe = defineRecipe({
  className: 'tooltip',
  description:
    'Tooltip bubble surface: overlay fill, hairline border, radius, overlay shadow, tooltip z-index, capped width. Apply to Ark Tooltip.Content.',
  base: {
    bg: 'overlay.tooltip',
    color: 'text.inverse',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'border.subtle',
    borderRadius: 'md',
    boxShadow: 'overlay',
    zIndex: 'tooltip',
    maxWidth: 'min(26rem, calc(100vw - 2rem))',
    px: '3',
    py: '2',
    fontSize: 'sm',
    lineHeight: 'relaxed',
  },
});

/**
 * `infoTip` slot recipe: a CSS-only hover-and-focus help bubble. The bubble is
 * `display: none` while closed (so it takes NO layout — twenty `max-content`
 * bubbles laid out invisibly pushed a 320px page into horizontal scroll), and
 * is revealed by a parent `:hover`/`:focus-within` selector rather than JS
 * state, so it works without hydration. It is positioned `absolute` (never
 * `fixed`) and capped against the viewport. The bubble element carries the copy
 * once and is the `aria-describedby` target the component wires up.
 *
 * The design-system ships no generated `styled-system`, so the component
 * applies this by stable slot class names (`infoTip__root`, `infoTip__trigger`,
 * `infoTip__bubble`, variant `infoTip__bubble--align_x`). Registered in the
 * preset + staticCss.
 */
export const infoTipRecipe = defineSlotRecipe({
  className: 'infoTip',
  description:
    'CSS-only help-tip: an info trigger and a hover/focus bubble that takes no layout while closed, is positioned absolute, capped against the viewport, and is the aria-describedby target.',
  slots: ['root', 'trigger', 'bubble'],
  base: {
    root: {
      position: 'relative',
      display: 'inline-flex',
      alignItems: 'center',
      verticalAlign: 'middle',
    },
    trigger: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '4',
      height: '4',
      borderRadius: 'full',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: 'border.default',
      color: 'text.muted',
      bg: 'transparent',
      cursor: 'help',
      fontSize: '3xs',
      fontWeight: 'bold',
      lineHeight: '1',
      p: '0',
      _hover: { color: 'text.strong', borderColor: 'border.strong' },
      _focusVisible: {
        outline: '2px solid',
        outlineColor: 'text.interactive',
        outlineOffset: '1px',
      },
    },
    bubble: {
      display: 'none',
      position: 'absolute',
      top: 'calc(100% + 6px)',
      width: 'max-content',
      maxWidth: 'min(20rem, calc(100vw - 2rem))',
      bg: 'overlay.tooltip',
      color: 'text.inverse',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: 'border.subtle',
      borderRadius: 'md',
      boxShadow: 'overlay',
      zIndex: 'tooltip',
      px: '3',
      py: '2',
      fontSize: 'sm',
      fontWeight: 'normal',
      lineHeight: 'relaxed',
      textAlign: 'start',
      whiteSpace: 'normal',
      // Revealed by parent hover/focus — CSS only, no JS open state. `&` is the
      // bubble's own generated class; the prefix is the InfoTip root.
      '[data-scope=info-tip][data-part=root]:hover &': { display: 'block' },
      '[data-scope=info-tip][data-part=root]:focus-within &': {
        display: 'block',
      },
    },
  },
  variants: {
    // Horizontal anchoring of the bubble relative to the trigger.
    align: {
      start: { bubble: { insetInlineStart: '0' } },
      center: {
        bubble: { insetInlineStart: '50%', transform: 'translateX(-50%)' },
      },
      end: { bubble: { insetInlineEnd: '0' } },
    },
  },
  defaultVariants: {
    align: 'start',
  },
});
