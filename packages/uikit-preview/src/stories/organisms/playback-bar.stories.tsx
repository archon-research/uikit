import {
  createLiveSource,
  createReplaySource,
  Indicator,
  Button,
  PlaybackBar,
  TRANSPORT_HOTKEYS,
  useTransportHotkeys,
  usePlayback,
  type LivePlaybackSource,
  type PlaybackBarMark,
  type PlaybackEvent,
  type TransportHotkeyAction,
} from '@archon-research/design-system';
import { useEffect, useMemo, useRef, useState } from 'react';

import { css } from '../../../styled-system/css';

type EventPayload = { message: string };

const COMPONENTS = ['ingestion', 'worker.a', 'pipeline'] as const;
const TYPES = ['log', 'state-change', 'heartbeat'] as const;

function buildReplayLog(count: number): PlaybackEvent<EventPayload>[] {
  const start = Date.now() - count * 4_000;
  return Array.from({ length: count }, (_, index) => ({
    seq: index,
    timestamp: start + index * 4_000,
    // The modulo keeps these in range; `[0]` is a typed fallback because the
    // tuples above are non-empty.
    component: COMPONENTS[index % COMPONENTS.length] ?? COMPONENTS[0],
    type: TYPES[index % TYPES.length] ?? TYPES[0],
    payload: { message: `event ${index + 1}` },
  }));
}

const replayLog = buildReplayLog(40);

function EventList({ events }: { events: PlaybackEvent<EventPayload>[] }) {
  const latest = events.slice(-8).reverse();
  return (
    <ul
      className={css({
        display: 'grid',
        gap: '1',
        fontSize: 'xs',
        fontFamily: 'mono',
        color: 'text.muted',
        listStyle: 'none',
        margin: '0',
        padding: '0',
      })}
    >
      {latest.map((event) => (
        <li key={event.seq}>
          {new Date(event.timestamp).toISOString().slice(11, 19)} ·{' '}
          {event.component} · {event.type} · {event.payload.message}
        </li>
      ))}
      {latest.length === 0 ? <li>No events yet.</li> : null}
    </ul>
  );
}

function ReplayDemo() {
  const source = useMemo(() => createReplaySource(replayLog), []);
  const playback = usePlayback({ source, initialSpeed: 4 });

  return (
    <div className={css({ display: 'grid', gap: '4' })}>
      <PlaybackBar
        mode={playback.mode}
        status={playback.status}
        clock={playback.clock}
        bounds={playback.bounds}
        speed={playback.speed}
        onPlay={playback.play}
        onPause={playback.pause}
        onSpeedChange={playback.setSpeed}
        onSeek={playback.seekTo}
        onStepForward={() => playback.step('forward')}
        onStepBackward={() => playback.step('backward')}
      />
      <EventList events={playback.events} />
    </div>
  );
}

function useFakeLiveSource(): LivePlaybackSource<EventPayload> {
  const listenersRef = useRef(
    new Set<(event: PlaybackEvent<EventPayload>) => void>(),
  );
  const seqRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const event: PlaybackEvent<EventPayload> = {
        seq: seqRef.current++,
        timestamp: Date.now(),
        component:
          COMPONENTS[seqRef.current % COMPONENTS.length] ?? COMPONENTS[0],
        type: TYPES[seqRef.current % TYPES.length] ?? TYPES[0],
        payload: { message: `event ${seqRef.current}` },
      };
      for (const listener of listenersRef.current) listener(event);
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  return useMemo(
    () =>
      createLiveSource<EventPayload>((onEvent) => {
        listenersRef.current.add(onEvent);
        return () => listenersRef.current.delete(onEvent);
      }),
    [],
  );
}

function LiveDemo() {
  const source = useFakeLiveSource();
  const playback = usePlayback({ source });

  return (
    <div className={css({ display: 'grid', gap: '4' })}>
      <PlaybackBar
        mode={playback.mode}
        status={playback.status}
        clock={playback.clock}
        bounds={playback.bounds}
        speed={playback.speed}
        onPlay={playback.play}
        onPause={playback.pause}
      />
      <EventList events={playback.events} />
    </div>
  );
}

export default {
  title: 'Organisms/Playback Bar',
};

export const LiveVsReplay = () => {
  const [mode, setMode] = useState<'live' | 'replay'>('replay');

  return (
    <div
      className={css({
        p: '6',
        display: 'grid',
        gap: '4',
        maxWidth: '3xl',
      })}
    >
      <div className={css({ display: 'flex', gap: '2' })}>
        <button
          type="button"
          onClick={() => setMode('replay')}
          className={css({
            fontSize: 'sm',
            px: '3',
            py: '1.5',
            borderRadius: 'md',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'border.subtle',
            bg: mode === 'replay' ? 'interactive.selected' : 'surface.default',
            cursor: 'pointer',
          })}
        >
          Replay
        </button>
        <button
          type="button"
          onClick={() => setMode('live')}
          className={css({
            fontSize: 'sm',
            px: '3',
            py: '1.5',
            borderRadius: 'md',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'border.subtle',
            bg: mode === 'live' ? 'interactive.selected' : 'surface.default',
            cursor: 'pointer',
          })}
        >
          Live
        </button>
      </div>

      {mode === 'replay' ? <ReplayDemo /> : <LiveDemo />}
    </div>
  );
};

// An ordinal cursor domain: 12 market days keyed 0..11. The bar is
// presentational and domain-agnostic, so index-space bounds + step={1} + a
// readout drive it directly — no timestamps, no synthetic clock, no
// usePlayback. Marks flag the days with settlement events; the secondary
// track is a consumer-drawn fill-density strip.
const MARKET_DAYS = 12;
const SETTLEMENT_DAYS: PlaybackBarMark[] = [
  { value: 2, label: 'Settlement · day 3' },
  { value: 5, label: 'Settlement · day 6' },
  { value: 9, label: 'Settlement · day 10' },
];
const FILLS_PER_DAY = [3, 0, 8, 2, 0, 12, 4, 1, 0, 9, 2, 5];
const maxFills = Math.max(...FILLS_PER_DAY);

export const OrdinalCursor = () => {
  const [day, setDay] = useState(5);
  const [playing, setPlaying] = useState(false);

  return (
    <div
      className={css({ p: '6', display: 'grid', gap: '4', maxWidth: '3xl' })}
    >
      <PlaybackBar
        mode="replay"
        status={playing ? 'playing' : 'paused'}
        clock={day}
        bounds={{ start: 0, end: MARKET_DAYS - 1 }}
        step={1}
        marks={SETTLEMENT_DAYS}
        readout={`Day ${day + 1} / ${MARKET_DAYS}`}
        secondaryTrack={
          <div className={css({ display: 'flex', gap: '2px' })}>
            {FILLS_PER_DAY.map((fills, index) => (
              <div
                key={index}
                title={`${fills} fills`}
                className={css({
                  flex: '1',
                  height: '1',
                  borderRadius: 'full',
                  bg: 'blue.500',
                })}
                style={{
                  opacity: fills === 0 ? 0.15 : 0.3 + (fills / maxFills) * 0.7,
                }}
              />
            ))}
          </div>
        }
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onSeek={(value) => setDay(Math.round(value))}
        onStepForward={() => setDay((d) => Math.min(d + 1, MARKET_DAYS - 1))}
        onStepBackward={() => setDay((d) => Math.max(d - 1, 0))}
      />
      <div className={css({ fontSize: 'sm', color: 'text.muted' })}>
        Index-space bounds ({`{start: 0, end: ${MARKET_DAYS - 1}}`}),{' '}
        <code>step=1</code>, an ordinal <code>readout</code>, settlement{' '}
        <code>marks</code>, and a fill-density <code>secondaryTrack</code> — no
        timestamps anywhere.
      </div>
    </div>
  );
};

// The status Indicator relocated into a trailing toggle button (the shape the
// HATT control bar needed): `indicator={null}` removes the leading status so
// the transport buttons keep a fixed x-position across status changes, and
// `trailing` carries a dot+label button that flips live↔replay. `readout`
// swaps the HH:MM:SS clock for a full datetime.
export const StatusInTrailing = () => {
  const [mode, setMode] = useState<'live' | 'replay'>('live');
  const isLive = mode === 'live';

  return (
    <div
      className={css({ p: '6', display: 'grid', gap: '4', maxWidth: '3xl' })}
    >
      <PlaybackBar
        mode={mode}
        status={isLive ? 'connected' : 'paused'}
        clock={0}
        bounds={isLive ? null : { start: 0, end: 100 }}
        indicator={null}
        readout={<span>2026-08-13 14:00:00</span>}
        trailing={
          <Button
            variant="panel"
            onClick={() => setMode(isLive ? 'replay' : 'live')}
            aria-label={isLive ? 'Switch to replay' : 'Go live'}
          >
            <Indicator status={isLive ? 'active' : 'idle'}>
              {isLive ? 'Live' : 'Go live'}
            </Indicator>
          </Button>
        }
        onPlay={() => {}}
        onPause={() => {}}
        onSeek={isLive ? undefined : () => {}}
      />
      <div className={css({ fontSize: 'sm', color: 'text.muted' })}>
        <code>indicator={'{null}'}</code> hides the leading status;{' '}
        <code>trailing</code> hosts it inside a mode-toggle button instead, so
        the transport cluster never reflows when the status label changes width.
      </div>
    </div>
  );
};

function describeAction(action: TransportHotkeyAction): string {
  switch (action.kind) {
    case 'play':
      return 'play';
    case 'pause':
      return 'pause';
    case 'step':
      return `step ${action.direction}`;
    case 'speed':
      return `speed ×${action.speed}`;
  }
}

export const WithTransportHotkeys = () => {
  const source = useMemo(() => createReplaySource(replayLog), []);
  const playback = usePlayback({ source, initialSpeed: 2 });
  const [lastAction, setLastAction] = useState<string | null>(null);

  useTransportHotkeys(playback, {
    onAction: (action) => setLastAction(describeAction(action)),
  });

  return (
    <div
      className={css({ p: '6', display: 'grid', gap: '4', maxWidth: '3xl' })}
    >
      <div className={css({ fontSize: 'sm', color: 'text.muted' })}>
        Click anywhere outside the inputs, then try the transport hotkeys — they
        bind to <code>window</code>, so no element needs focus:
        <ul className={css({ mt: '2', pl: '4' })}>
          {TRANSPORT_HOTKEYS.map((hotkey) => (
            <li key={hotkey.keys}>
              <code>{hotkey.keys}</code> — {hotkey.does}
            </li>
          ))}
        </ul>
      </div>
      <PlaybackBar
        mode={playback.mode}
        status={playback.status}
        clock={playback.clock}
        bounds={playback.bounds}
        speed={playback.speed}
        onPlay={playback.play}
        onPause={playback.pause}
        onSpeedChange={playback.setSpeed}
        onSeek={playback.seekTo}
        onStepForward={() => playback.step('forward')}
        onStepBackward={() => playback.step('backward')}
      />
      <div className={css({ fontSize: 'sm', color: 'text.muted' })}>
        Last hotkey action: {lastAction ?? 'none yet'}
      </div>
      <EventList events={playback.events} />
    </div>
  );
};
