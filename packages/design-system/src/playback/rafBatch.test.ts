import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createRafBatcher } from './rafBatch.js';

// `createRafBatcher` is the mechanism `usePlayback`'s live-source subscribe
// path uses to turn "N events arrived this frame" into exactly one
// `setLiveEvents` commit (see usePlayback.ts). It has no dependency on React
// or the DOM beyond `requestAnimationFrame`/`cancelAnimationFrame`, so it's
// testable directly by controlling a fake rAF queue — this is the test that
// "many events pushed within one frame yield one committed (flushed)
// update", the guarantee the hook itself relies on.

type QueuedFrame = { id: number; callback: FrameRequestCallback };

/** A minimal, synchronously-drivable stand-in for the browser's rAF queue. */
function installFakeRaf() {
  let nextId = 1;
  const queue: QueuedFrame[] = [];

  vi.stubGlobal(
    'requestAnimationFrame',
    (callback: FrameRequestCallback): number => {
      const id = nextId++;
      queue.push({ id, callback });
      return id;
    },
  );
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    const index = queue.findIndex((frame) => frame.id === id);
    if (index >= 0) queue.splice(index, 1);
  });

  return {
    /** Runs every frame currently queued, as the browser would on the next paint. */
    runFrame(now = 0) {
      const pending = queue.splice(0, queue.length);
      for (const frame of pending) frame.callback(now);
    },
    pendingCount: () => queue.length,
  };
}

describe('createRafBatcher', () => {
  let raf: ReturnType<typeof installFakeRaf>;

  beforeEach(() => {
    raf = installFakeRaf();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not flush until the frame fires', () => {
    const onFlush = vi.fn();
    const batcher = createRafBatcher<number>(onFlush);

    batcher.push(1);
    batcher.push(2);

    expect(onFlush).not.toHaveBeenCalled();
  });

  it('collapses many pushes within one frame into a single flush call', () => {
    const onFlush = vi.fn();
    const batcher = createRafBatcher<number>(onFlush);

    for (let i = 0; i < 50; i += 1) batcher.push(i);
    raf.runFrame();

    expect(onFlush).toHaveBeenCalledTimes(1);
    expect(onFlush).toHaveBeenCalledWith(
      Array.from({ length: 50 }, (_, i) => i),
    );
  });

  it('preserves arrival order across the batch', () => {
    const onFlush = vi.fn();
    const batcher = createRafBatcher<string>(onFlush);

    batcher.push('a');
    batcher.push('b');
    batcher.push('c');
    raf.runFrame();

    expect(onFlush).toHaveBeenCalledWith(['a', 'b', 'c']);
  });

  it('only schedules one frame no matter how many pushes happen before it fires', () => {
    const batcher = createRafBatcher<number>(() => {});

    batcher.push(1);
    batcher.push(2);
    batcher.push(3);

    expect(raf.pendingCount()).toBe(1);
  });

  it('starts a fresh batch after each flush', () => {
    const onFlush = vi.fn();
    const batcher = createRafBatcher<number>(onFlush);

    batcher.push(1);
    raf.runFrame();
    batcher.push(2);
    raf.runFrame();

    expect(onFlush).toHaveBeenNthCalledWith(1, [1]);
    expect(onFlush).toHaveBeenNthCalledWith(2, [2]);
  });

  it('does not flush an empty buffer', () => {
    const onFlush = vi.fn();
    const batcher = createRafBatcher<number>(onFlush);

    batcher.push(1);
    raf.runFrame(); // buffer drains here
    raf.runFrame(); // nothing queued a second frame

    expect(onFlush).toHaveBeenCalledTimes(1);
  });

  it('flush() delivers immediately without waiting for the frame', () => {
    const onFlush = vi.fn();
    const batcher = createRafBatcher<number>(onFlush);

    batcher.push(1);
    batcher.push(2);
    batcher.flush();

    expect(onFlush).toHaveBeenCalledTimes(1);
    expect(onFlush).toHaveBeenCalledWith([1, 2]);
    // The scheduled frame was cancelled by flush(), so running it does nothing.
    raf.runFrame();
    expect(onFlush).toHaveBeenCalledTimes(1);
  });

  it('dispose() drops the buffer and cancels the pending frame', () => {
    const onFlush = vi.fn();
    const batcher = createRafBatcher<number>(onFlush);

    batcher.push(1);
    batcher.dispose();
    raf.runFrame();

    expect(onFlush).not.toHaveBeenCalled();
    expect(raf.pendingCount()).toBe(0);
  });
});
