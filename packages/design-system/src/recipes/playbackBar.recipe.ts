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
    'Transport bar chrome for the live/replay playback engine: transport-button cluster, scrubber (with optional marks and secondary track rows), speed group, readout clock, and trailing controls.',
  slots: [
    'root',
    'transport',
    'scrubberWrap',
    'scrubber',
    'marks',
    'mark',
    'secondaryTrack',
    'speedGroup',
    'clock',
    'trailing',
  ],
  base: {
    root: {
      display: 'flex',
      alignItems: 'center',
      gap: '3',
      p: '2',
      borderWidth: 'hairline',
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
    // A column so optional rows (marks, secondaryTrack) stack under the
    // range input; with the input alone it renders exactly as the old
    // row-centered wrap did.
    scrubberWrap: {
      flex: '1',
      minWidth: '0',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      gap: '1',
    },
    scrubber: {
      width: '100%',
      cursor: 'pointer',
    },
    // Positioning context for `mark` ticks; sized by its own height rather
    // than overlaying the input so marks never collide with the thumb.
    marks: {
      position: 'relative',
      width: '100%',
      height: '1.5',
      flexShrink: '0',
    },
    mark: {
      position: 'absolute',
      top: '0',
      bottom: '0',
      width: '2px',
      transform: 'translateX(-50%)',
      borderRadius: 'full',
      bg: 'border.strong',
    },
    secondaryTrack: {
      width: '100%',
      flexShrink: '0',
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
    trailing: {
      display: 'flex',
      alignItems: 'center',
      gap: '2',
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
