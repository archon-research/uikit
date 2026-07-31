import { defineSlotRecipe } from '@pandacss/dev';

/**
 * Transport bar for the live/replay playback engine (`usePlayback` +
 * `PlaybackBar`, `src/playback/`): the chrome around the transport buttons,
 * scrubber, speed control, and current-tick clock. The buttons themselves
 * reuse the `button` recipe (via the `Button` component) and the
 * connection/mode state reuses the `indicator` recipe (via `Indicator`) — this
 * recipe only owns the bar's own layout slots.
 *
 * Uses semantic tokens only (surface/text/border) plus spacing and font-size
 * scale steps, matching the rest of the package's slot recipes.
 */
export const playbackBarRecipe = defineSlotRecipe({
  className: 'playbackBar',
  description:
    'Transport bar chrome for the live/replay playback engine: transport-button cluster, scrubber, speed group, and current-tick clock.',
  slots: [
    'root',
    'transport',
    'scrubberWrap',
    'scrubber',
    'speedGroup',
    'clock',
  ],
  base: {
    root: {
      display: 'flex',
      alignItems: 'center',
      gap: '3',
      p: '2',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: 'border.subtle',
      borderRadius: 'md',
      bg: 'surface.subtle',
    },
    transport: {
      display: 'flex',
      alignItems: 'center',
      gap: '1',
      flexShrink: '0',
    },
    scrubberWrap: {
      flex: '1',
      minWidth: '0',
      display: 'flex',
      alignItems: 'center',
    },
    scrubber: {
      width: '100%',
      cursor: 'pointer',
    },
    speedGroup: {
      display: 'flex',
      alignItems: 'center',
      gap: '1',
      flexShrink: '0',
    },
    clock: {
      fontFamily: 'mono',
      fontSize: 'xs',
      color: 'text.muted',
      whiteSpace: 'nowrap',
      minWidth: '11ch',
      textAlign: 'right',
      flexShrink: '0',
    },
  },
  variants: {
    density: {
      normal: {},
      compact: { root: { p: '1.5', gap: '2' } },
    },
  },
  defaultVariants: {
    density: 'normal',
  },
});
