import {
  createLiveSource,
  createReplaySource,
  PlaybackBar,
  usePlayback,
  type LivePlaybackSource,
  type PlaybackEvent,
} from '@archon-research/design-system';
import { useEffect, useMemo, useRef, useState } from 'react';

import { css } from '../../../styled-system/css';

type EventPayload = { message: string };

const COMPONENTS = ['ingestion', 'worker.a', 'pipeline'];
const TYPES = ['log', 'state-change', 'heartbeat'] as const;

function buildReplayLog(count: number): PlaybackEvent<EventPayload>[] {
  const start = Date.now() - count * 4_000;
  return Array.from({ length: count }, (_, index) => ({
    seq: index,
    timestamp: start + index * 4_000,
    component: COMPONENTS[index % COMPONENTS.length],
    type: TYPES[index % TYPES.length],
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
        component: COMPONENTS[seqRef.current % COMPONENTS.length],
        type: TYPES[seqRef.current % TYPES.length],
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
