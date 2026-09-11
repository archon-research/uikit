import { describe, expect, it } from 'vitest';

import type { PerfRunRaw, RecordedPageRequest } from './harvest.js';
import { summarizeRun, WHOLE_RUN } from './summarize.js';

const ORIGIN = 1_000_000;

function request(
  overrides: Partial<RecordedPageRequest> &
    Pick<RecordedPageRequest, 'key' | 'at'>,
): RecordedPageRequest {
  return {
    method: overrides.key.split(' ')[0] ?? 'GET',
    url: `http://app.test${overrides.key.split(' ')[1] ?? '/'}`,
    resourceType: 'fetch',
    fromServiceWorker: true,
    status: 200,
    ...overrides,
  };
}

function run(overrides: Partial<PerfRunRaw> = {}): PerfRunRaw {
  return {
    sample: {
      supported: { longtask: true, event: true },
      supportedEntryTypes: ['event', 'longtask'],
      timeOrigin: ORIGIN,
      documents: 1,
      longTasks: [],
      interactionEvents: [],
      ...overrides.sample,
    },
    requests: overrides.requests ?? [],
    boundaries: overrides.boundaries ?? [],
    startedAt: overrides.startedAt ?? ORIGIN,
    collectedAt: overrides.collectedAt ?? ORIGIN + 10_000,
  };
}

describe('blocking time', () => {
  it('counts only what runs past a frame budget', () => {
    const summary = summarizeRun(
      run({
        sample: {
          supported: { longtask: true, event: true },
          supportedEntryTypes: ['longtask'],
          timeOrigin: ORIGIN,
          documents: 1,
          // 60 over, 150 over, and one that is not a long task at all.
          longTasks: [
            { at: ORIGIN + 10, duration: 110 },
            { at: ORIGIN + 200, duration: 200 },
            { at: ORIGIN + 500, duration: 40 },
          ],
          interactionEvents: [],
        },
      }),
    );

    const whole = summary.phases[0]!;
    expect(whole.phase).toBe(WHOLE_RUN);
    expect(whole.blockingMs).toBe(210);
    expect(whole.longestTaskMs).toBe(200);
    expect(whole.longTaskCount).toBe(3);
  });

  it('is null, not zero, when the engine does not report long tasks', () => {
    const summary = summarizeRun(
      run({
        sample: {
          supported: { longtask: false, event: true },
          supportedEntryTypes: ['event'],
          timeOrigin: ORIGIN,
          documents: 1,
          longTasks: [],
          interactionEvents: [],
        },
      }),
    );

    expect(summary.phases[0]!.blockingMs).toBeNull();
    expect(summary.phases[0]!.notes.join(' ')).toContain('unmeasured');
  });
});

describe('interaction latency', () => {
  it('takes the longest event of an interaction, and the worst interaction of a phase', () => {
    const summary = summarizeRun(
      run({
        sample: {
          supported: { longtask: true, event: true },
          supportedEntryTypes: ['event', 'longtask'],
          timeOrigin: ORIGIN,
          documents: 1,
          longTasks: [],
          interactionEvents: [
            {
              name: 'pointerdown',
              interactionId: 1,
              at: ORIGIN + 10,
              duration: 20,
              target: 'row',
            },
            {
              name: 'click',
              interactionId: 1,
              at: ORIGIN + 12,
              duration: 80,
              target: 'row',
            },
            {
              name: 'click',
              interactionId: 2,
              at: ORIGIN + 900,
              duration: 40,
              target: 'close',
            },
          ],
        },
      }),
    );

    const whole = summary.phases[0]!;
    expect(whole.interactionCount).toBe(2);
    expect(whole.interactionMs).toBe(80);
    expect(whole.worstInteraction).toEqual({
      name: 'click',
      target: 'row',
      durationMs: 80,
    });
  });
});

describe('phases', () => {
  it('attribute an entry to the phase its start falls in', () => {
    const summary = summarizeRun(
      run({
        boundaries: [
          { phase: 'a', edge: 'start', at: ORIGIN },
          { phase: 'a', edge: 'end', at: ORIGIN + 100 },
          { phase: 'b', edge: 'start', at: ORIGIN + 100 },
          { phase: 'b', edge: 'end', at: ORIGIN + 200 },
        ],
        sample: {
          supported: { longtask: true, event: true },
          supportedEntryTypes: ['event', 'longtask'],
          timeOrigin: ORIGIN,
          documents: 1,
          // Begins in `a` and runs well into `b`: charged wholly to `a`.
          longTasks: [{ at: ORIGIN + 90, duration: 100 }],
          interactionEvents: [],
        },
        requests: [
          request({ key: 'GET /things', at: ORIGIN + 50 }),
          request({ key: 'GET /things', at: ORIGIN + 150 }),
        ],
      }),
    );

    const [, a, b] = summary.phases;
    expect(a!.blockingMs).toBe(50);
    expect(b!.blockingMs).toBe(0);
    expect(a!.requests.byKey).toEqual({ 'GET /things': 1 });
    expect(b!.requests.byKey).toEqual({ 'GET /things': 1 });
  });

  it('warn when one was opened and never closed', () => {
    const summary = summarizeRun(
      run({ boundaries: [{ phase: 'a', edge: 'start', at: ORIGIN }] }),
    );
    expect(summary.warnings.join(' ')).toContain('never closed');
  });
});

describe('requests', () => {
  it('flags one that reached the network while the rest were mocked', () => {
    const summary = summarizeRun(
      run({
        requests: [
          request({ key: 'GET /things', at: ORIGIN + 1 }),
          request({
            key: 'GET /real',
            at: ORIGIN + 2,
            fromServiceWorker: false,
          }),
        ],
      }),
    );
    expect(summary.phases[0]!.requests.unmockedKeys).toEqual(['GET /real']);
  });

  it('says nothing about mocking when nothing in the run was mocked', () => {
    const summary = summarizeRun(
      run({
        requests: [
          request({
            key: 'GET /things',
            at: ORIGIN + 1,
            fromServiceWorker: false,
          }),
        ],
      }),
    );
    expect(summary.phases[0]!.requests.unmockedKeys).toEqual([]);
  });

  it('counts a request with no response as unresolved rather than as network traffic', () => {
    const summary = summarizeRun(
      run({
        requests: [
          request({ key: 'GET /things', at: ORIGIN + 1 }),
          request({
            key: 'GET /pending',
            at: ORIGIN + 2,
            fromServiceWorker: null,
            status: null,
          }),
        ],
      }),
    );
    expect(summary.phases[0]!.requests.unresolved).toBe(1);
    expect(summary.phases[0]!.requests.unmockedKeys).toEqual([]);
  });
});
