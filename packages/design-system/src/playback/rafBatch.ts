/**
 * rAF coalescing for `usePlayback`'s live-source path.
 *
 * Before this, a live `PlaybackSource`'s `subscribe` callback did
 * `setLiveEvents(prev => [...prev, event])` for every single arriving
 * event — one React state commit AND one O(n) array copy per event, even
 * when a burst of events arrives faster than a frame. `createRafBatcher`
 * buffers pushed items and delivers the whole buffer to `onFlush` on the
 * next animation frame, so a frame's worth of events collapse into ONE
 * state commit no matter how many arrived inside it.
 *
 * The batcher also drops work naturally when the tab is hidden: browsers
 * stop firing `requestAnimationFrame`, so the buffer just accumulates and
 * flushes in one go on return, rather than spinning a timer nobody can see.
 *
 * (Adapted for `usePlayback`'s own live-subscribe path rather than a
 * consumer's `onEvent` handler.)
 */
export type RafBatcher<T> = {
  /** Queue one item. It is delivered on the next animation frame. */
  push: (item: T) => void;
  /** Deliver anything buffered immediately, outside the frame schedule. */
  flush: () => void;
  /** Cancel any pending frame and drop the buffer (call on unmount/cleanup). */
  dispose: () => void;
};

export function createRafBatcher<T>(
  onFlush: (batch: T[]) => void,
): RafBatcher<T> {
  let buffer: T[] = [];
  let frame: number | null = null;

  const hasRaf = typeof requestAnimationFrame === 'function';

  const runFlush = () => {
    frame = null;
    if (buffer.length === 0) return;
    const batch = buffer;
    buffer = [];
    onFlush(batch);
  };

  const schedule = () => {
    if (frame !== null) return;
    // A ~16ms timeout stands in where rAF doesn't exist (jsdom, SSR); the
    // cadence is the point, not the exact API.
    frame = hasRaf
      ? requestAnimationFrame(runFlush)
      : (setTimeout(runFlush, 16) as unknown as number);
  };

  return {
    push(item) {
      buffer.push(item);
      schedule();
    },
    flush() {
      if (frame !== null) {
        if (hasRaf) cancelAnimationFrame(frame);
        else clearTimeout(frame as unknown as ReturnType<typeof setTimeout>);
        frame = null;
      }
      runFlush();
    },
    dispose() {
      if (frame !== null) {
        if (hasRaf) cancelAnimationFrame(frame);
        else clearTimeout(frame as unknown as ReturnType<typeof setTimeout>);
        frame = null;
      }
      buffer = [];
    },
  };
}
