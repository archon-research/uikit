import { defineSlotRecipe } from '@pandacss/dev';

/**
 * Data-bound two-thumb range slider over Ark UI's `Slider`. Ark supplies
 * behaviour (drag, keyboard, thumb collision) via `data-state`/aria attributes;
 * this recipe only skins the parts. `_focusVisible`/`data-dragging` key off
 * Ark's own state, not hand-managed state.
 */
export const rangeSliderRecipe = defineSlotRecipe({
  className: 'rangeSlider',
  description:
    'Two-thumb numeric range slider over Ark UI Slider. Skins root/label/valueText/control/track/range/thumb; behaviour stays entirely Ark-owned.',
  slots: ['root', 'label', 'valueText', 'control', 'track', 'range', 'thumb'],
  base: {
    root: {
      display: 'grid',
      gap: '2',
      width: 'full',
    },
    label: {
      fontSize: 'xs',
      fontWeight: 'medium',
      letterSpacing: 'wide',
      color: 'text.muted',
    },
    valueText: {
      fontSize: 'sm',
      fontFamily: 'mono',
      color: 'text.default',
    },
    control: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      height: '5',
      width: 'full',
    },
    track: {
      position: 'relative',
      height: '1.5',
      width: 'full',
      borderRadius: 'full',
      bg: 'surface.subtle',
    },
    range: {
      position: 'absolute',
      height: 'full',
      borderRadius: 'full',
      bg: 'interactive.accent',
    },
    thumb: {
      width: '4',
      height: '4',
      borderRadius: 'full',
      borderWidth: '2px',
      borderStyle: 'solid',
      borderColor: 'interactive.accent',
      bg: 'surface.default',
      boxShadow: 'xs',
      cursor: 'grab',
      transitionProperty: 'box-shadow, border-color',
      transitionDuration: 'fast',
      '&[data-dragging]': {
        cursor: 'grabbing',
        boxShadow: 'sm',
      },
      _focusVisible: {
        outline: '2px solid',
        outlineColor: 'interactive.accent',
        outlineOffset: '2px',
      },
    },
  },
});
