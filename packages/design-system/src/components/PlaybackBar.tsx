import { Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import type { HTMLAttributes } from 'react';

import type { PlaybackBounds } from '../playback/types.js';
import type { PlaybackMode, PlaybackStatus } from '../playback/usePlayback.js';
import { Button } from './Button.js';
import { Indicator, type IndicatorStatus } from './Indicator.js';

/**
 * Class names emitted by the `playbackBar` slot recipe (registered in the
 * preset + staticCss). The design-system builds with `tsc` and ships no
 * generated `styled-system`, so the recipe is applied by its stable slot class
 * names (base `playbackBar__${slot}`, slot variant
 * `playbackBar__${slot}--${key}_${value}`), matching `Panel`/`Indicator`.
 * Consumer `className` composes LAST on `root`.
 */
const cx = (...classes: Array<string | false | null | undefined>): string =>
  classes.filter(Boolean).join(' ');

export type PlaybackBarDensity = 'normal' | 'compact';

export type PlaybackBarProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  'onSelect'
> & {
  /** Which transport is driving the shared rendering — flips the bar between "live monitor" and "replay transport" chrome. */
  mode: PlaybackMode;
  status: PlaybackStatus;
  /** Virtual clock, epoch ms — see `usePlayback`'s `clock`. */
  clock: number;
  /** Replay-only time bounds; omit/`null` for live sources (the scrubber renders disabled). */
  bounds?: PlaybackBounds | null;
  /** Replay-only speed multiplier; ignored (and hidden) for live sources. */
  speed?: number;
  /** Selectable speed multipliers. Defaults to `[1, 2, 4, 8]`. */
  speedOptions?: number[];
  onPlay: () => void;
  onPause: () => void;
  /** Omit to hide the speed control entirely even in replay mode. */
  onSpeedChange?: (multiplier: number) => void;
  /** Omit to render the scrubber disabled (e.g. bounds not yet known). */
  onSeek?: (timestamp: number) => void;
  /** Omit to disable the step-forward button. */
  onStepForward?: () => void;
  /** Omit to disable the step-backward button. */
  onStepBackward?: () => void;
  /** Formats `clock` for the trailing label. Defaults to `HH:MM:SS` (UTC). */
  formatClock?: (timestamp: number) => string;
  density?: PlaybackBarDensity;
};

const DEFAULT_SPEED_OPTIONS = [1, 2, 4, 8];

function defaultFormatClock(timestamp: number): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return '--:--:--';
  }
  return date.toISOString().slice(11, 19);
}

// Maps (mode, status) to the Indicator's semantic status + a short label.
// Kept as a lookup rather than inlined JSX so PlaybackBar's render stays
// readable despite live and replay having different status vocabularies.
function describeStatus(
  mode: PlaybackMode,
  status: PlaybackStatus,
): { indicator: IndicatorStatus; label: string } {
  if (mode === 'live') {
    switch (status) {
      case 'connecting':
        return { indicator: 'pending', label: 'Connecting' };
      case 'connected':
        return { indicator: 'active', label: 'Live' };
      case 'error':
        return { indicator: 'error', label: 'Error' };
      case 'paused':
        return { indicator: 'idle', label: 'Paused' };
      default:
        return { indicator: 'idle', label: 'Live' };
    }
  }

  switch (status) {
    case 'playing':
      return { indicator: 'active', label: 'Replaying' };
    case 'complete':
      return { indicator: 'idle', label: 'Complete' };
    case 'paused':
      return { indicator: 'ready', label: 'Paused' };
    default:
      return { indicator: 'idle', label: 'Replay' };
  }
}

const iconProps = {
  'aria-hidden': true,
  strokeWidth: 1.75,
  absoluteStrokeWidth: true,
  size: 14,
} as const;

/**
 * The playback transport bar: mode/connection `Indicator`, transport buttons
 * (step-back / play-pause / step-forward), a scrubber, a replay speed group,
 * and the current-tick clock. Purely presentational — pass it the output of
 * `usePlayback` (spread `mode`/`status`/`clock`/`bounds`/`speed`, wire
 * `onPlay`/`onPause`/`onSpeedChange`/`onSeek`/`onStepForward`/
 * `onStepBackward` to the hook's `play`/`pause`/`setSpeed`/`seekTo`/`step`) so
 * one bar serves both the live monitor and the replay transport.
 */
export function PlaybackBar({
  mode,
  status,
  clock,
  bounds = null,
  speed = 1,
  speedOptions = DEFAULT_SPEED_OPTIONS,
  onPlay,
  onPause,
  onSpeedChange,
  onSeek,
  onStepForward,
  onStepBackward,
  formatClock = defaultFormatClock,
  density = 'normal',
  className,
  ...rest
}: PlaybackBarProps) {
  const isPlaying =
    status === 'playing' || status === 'connected' || status === 'connecting';
  const canScrub = mode === 'replay' && bounds != null && onSeek != null;
  const { indicator, label } = describeStatus(mode, status);

  return (
    <div
      {...rest}
      className={cx(
        'playbackBar__root',
        density === 'compact' && 'playbackBar__root--density_compact',
        className,
      )}
      data-scope="playback-bar"
      data-part="root"
      data-mode={mode}
      data-status={status}
    >
      <Indicator status={indicator}>{label}</Indicator>

      <div className="playbackBar__transport" data-part="transport">
        <Button
          type="button"
          size="sm"
          iconOnly
          aria-label="Step backward"
          disabled={mode !== 'replay' || onStepBackward == null}
          onClick={onStepBackward}
        >
          <SkipBack {...iconProps} />
        </Button>
        <Button
          type="button"
          size="sm"
          iconOnly
          emphasis="solid"
          colorPalette="blue"
          aria-label={isPlaying ? 'Pause' : 'Play'}
          onClick={isPlaying ? onPause : onPlay}
          disabled={status === 'complete'}
        >
          {isPlaying ? <Pause {...iconProps} /> : <Play {...iconProps} />}
        </Button>
        <Button
          type="button"
          size="sm"
          iconOnly
          aria-label="Step forward"
          disabled={mode !== 'replay' || onStepForward == null}
          onClick={onStepForward}
        >
          <SkipForward {...iconProps} />
        </Button>
      </div>

      <div className="playbackBar__scrubberWrap" data-part="scrubber-wrap">
        <input
          type="range"
          className="playbackBar__scrubber"
          data-part="scrubber"
          aria-label="Replay position"
          min={bounds?.start ?? 0}
          max={bounds?.end ?? 0}
          value={canScrub ? clock : (bounds?.start ?? 0)}
          step="any"
          disabled={!canScrub}
          onChange={(event) => onSeek?.(Number(event.target.value))}
        />
      </div>

      {mode === 'replay' && onSpeedChange ? (
        <div className="playbackBar__speedGroup" data-part="speed-group">
          {speedOptions.map((option) => (
            <Button
              key={option}
              type="button"
              size="sm"
              density="compact"
              selected={speed === option}
              aria-pressed={speed === option}
              onClick={() => onSpeedChange(option)}
            >
              {option}x
            </Button>
          ))}
        </div>
      ) : null}

      <span className="playbackBar__clock" data-part="clock">
        {formatClock(clock)}
      </span>
    </div>
  );
}
