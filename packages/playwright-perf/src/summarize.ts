import type { PerfRunRaw } from './harvest.js';

/**
 * Turning a raw run into the three numbers per phase that are worth arguing
 * about. Pure, so every rule below is testable without a browser.
 *
 * ── Why these three ──
 *
 * A harvest that collects everything and interprets nothing is a log file. Each
 * signal here answers a question a developer actually asks, and each is either
 * budgetable or comparable:
 *
 * - **Blocking time** — "why does it feel janky?" The main thread was busy this
 *   long past the 50 ms a frame can hide. Noisy in absolute terms; meaningful
 *   against a baseline or another phase.
 * - **Worst interaction** — "how long after the click?" The metric that matters
 *   for a grid-heavy SPA, where LCP settled long ago and every remaining
 *   complaint is about responsiveness.
 * - **Request counts** — "did opening it twice fetch twice?" Discrete, exact and
 *   hardware-independent, so it takes a hard budget where the timings can only
 *   take a tolerance.
 *
 * What is deliberately absent, and why, is in DESIGN.md.
 *
 * Every timestamp in play here — phase boundaries from the driving process,
 * entries from the page — is absolute epoch milliseconds, so windowing is a
 * plain comparison and a navigation mid-run is not a special case. See the
 * collector for how the page's relative clock is converted.
 */

/** A frame's worth of main thread. Blocking time counts what runs past it. */
const FRAME_BUDGET_MS = 50;

export type WorstInteraction = {
  /** DOM event name of the slowest event in the interaction. */
  name: string;
  target: string | null;
  durationMs: number;
};

export type PhaseRequests = {
  total: number;
  /** Request count per `` `${method} ${pathname}` `` key. */
  byKey: Record<string, number>;
  /**
   * Keys that reached the network rather than a service worker, in a run where
   * something else was served by one. Empty when nothing was mocked at all —
   * this is a fixture-hole detector, not a "you used the network" complaint.
   */
  unmockedKeys: readonly string[];
  /** Requests that never produced a response: aborted, or still in flight. */
  unresolved: number;
};

export type PhaseSignals = {
  phase: string;
  /** Wall-clock duration of the phase. Context for the rest, never a budget. */
  durationMs: number;
  /** `null` means the engine does not report `longtask` — not "zero jank". */
  blockingMs: number | null;
  longestTaskMs: number | null;
  longTaskCount: number | null;
  /** Worst interaction latency in the phase; `null` when unmeasured. */
  interactionMs: number | null;
  worstInteraction: WorstInteraction | null;
  interactionCount: number | null;
  requests: PhaseRequests;
  /** Why something above is `null` or incomplete, in the report's own words. */
  notes: readonly string[];
};

export type PerfRun = {
  /** `'(run)'` first, then each phase in the order it was opened. */
  phases: readonly PhaseSignals[];
  /** Entry types the engine advertised, for the record. */
  supportedEntryTypes: readonly string[];
  /** Run-level problems that invalidate or weaken the numbers. */
  warnings: readonly string[];
};

/** The synthetic phase covering everything the run saw. */
export const WHOLE_RUN = '(run)';

type PhaseWindow = { phase: string; start: number; end: number };

function pairBoundaries(boundaries: PerfRunRaw['boundaries']): PhaseWindow[] {
  const paired: PhaseWindow[] = [];
  const open = new Map<string, number>();
  for (const boundary of boundaries) {
    if (boundary.edge === 'start') open.set(boundary.phase, boundary.at);
    else {
      const start = open.get(boundary.phase);
      if (start === undefined) continue;
      open.delete(boundary.phase);
      paired.push({ phase: boundary.phase, start, end: boundary.at });
    }
  }
  return paired;
}

function summarizeRequests(
  requests: PerfRunRaw['requests'],
  anyMocked: boolean,
): PhaseRequests {
  const byKey: Record<string, number> = {};
  const unmocked = new Set<string>();
  let unresolved = 0;

  for (const request of requests) {
    byKey[request.key] = (byKey[request.key] ?? 0) + 1;
    if (request.fromServiceWorker === null) unresolved += 1;
    else if (!request.fromServiceWorker && anyMocked) unmocked.add(request.key);
  }

  return {
    total: requests.length,
    byKey,
    unmockedKeys: [...unmocked].sort(),
    unresolved,
  };
}

function summarizePhase(
  window: PhaseWindow,
  raw: PerfRunRaw,
  anyMocked: boolean,
): PhaseSignals {
  const { supported, timeOrigin, documents } = raw.sample;
  const notes: string[] = [];

  // Entries live on the document that recorded them and go away with it. A phase
  // that opened before the surviving document's clock started is therefore
  // missing whatever happened in the document it opened in — the numbers below
  // are real, but they are a lower bound.
  if (documents > 1 && window.start < timeOrigin) {
    notes.push(
      `this phase began ${Math.round(timeOrigin - window.start)} ms before the current ` +
        `document loaded (${documents} documents in this run). Long tasks and ` +
        'interactions from before that navigation went away with the previous ' +
        'document, so the page-side numbers here are a lower bound. Requests are ' +
        'unaffected — they are recorded outside the page.',
    );
  }

  // An entry belongs to the phase its *start* falls in. A task that begins in
  // one phase and runs into the next is charged wholly to where it began, which
  // is where the code that caused it ran.
  const inWindow = (at: number): boolean =>
    at >= window.start && at <= window.end;

  let blockingMs: number | null = null;
  let longestTaskMs: number | null = null;
  let longTaskCount: number | null = null;

  if (supported.longtask) {
    const tasks = raw.sample.longTasks.filter((task) => inWindow(task.at));
    longTaskCount = tasks.length;
    longestTaskMs = tasks.reduce(
      (max, task) => Math.max(max, task.duration),
      0,
    );
    blockingMs = tasks.reduce(
      (sum, task) => sum + Math.max(0, task.duration - FRAME_BUDGET_MS),
      0,
    );
  } else {
    notes.push(
      'blocking time unmeasured: this engine does not report `longtask` entries. ' +
        'Chromium does; WebKit accepts the observer and delivers nothing, which is ' +
        'why this says unmeasured rather than 0 ms.',
    );
  }

  let interactionMs: number | null = null;
  let interactionCount: number | null = null;
  let worstInteraction: WorstInteraction | null = null;

  if (supported.event) {
    // One interaction fans out into several events (pointerdown, pointerup,
    // click). Its latency is the longest of them, and the phase's number is the
    // worst interaction in it — not an average, which would let one slow click
    // hide behind nine fast ones.
    const worstPerInteraction = new Map<number, WorstInteraction>();
    for (const event of raw.sample.interactionEvents) {
      if (!inWindow(event.at)) continue;
      const current = worstPerInteraction.get(event.interactionId);
      if (current === undefined || event.duration > current.durationMs) {
        worstPerInteraction.set(event.interactionId, {
          name: event.name,
          target: event.target,
          durationMs: event.duration,
        });
      }
    }
    interactionCount = worstPerInteraction.size;
    for (const candidate of worstPerInteraction.values()) {
      if (
        worstInteraction === null ||
        candidate.durationMs > worstInteraction.durationMs
      ) {
        worstInteraction = candidate;
      }
    }
    interactionMs = worstInteraction?.durationMs ?? null;
    if (interactionCount === 0) {
      notes.push(
        'no interaction recorded in this phase — nothing the browser counts as a ' +
          'user interaction happened, so there is no latency to report (this is not 0 ms).',
      );
    }
  } else {
    notes.push(
      'interaction latency unmeasured: this engine does not report `event` timing entries.',
    );
  }

  const requests = summarizeRequests(
    raw.requests.filter((request) => inWindow(request.at)),
    anyMocked,
  );

  return {
    phase: window.phase,
    durationMs: window.end - window.start,
    blockingMs,
    longestTaskMs,
    longTaskCount,
    interactionMs,
    worstInteraction,
    interactionCount,
    requests,
    notes,
  };
}

/** Reduce a raw run to per-phase signals. */
export function summarizeRun(raw: PerfRunRaw): PerfRun {
  const warnings: string[] = [];
  const phases = pairBoundaries(raw.boundaries);

  const openCount = raw.boundaries.filter((b) => b.edge === 'start').length;
  if (openCount > phases.length) {
    warnings.push(
      `${openCount - phases.length} phase(s) were opened and never closed, so nothing ` +
        'was attributed to them. This happens when the process is collected from ' +
        'inside a phase body.',
    );
  }

  const anyMocked = raw.requests.some(
    (request) => request.fromServiceWorker === true,
  );

  // The whole-run window spans attach to read-back, so a total exists even when
  // no phase was declared at all — and its duration is a real number rather than
  // an infinity that JSON would write out as `null`.
  const wholeRun: PhaseWindow = {
    phase: WHOLE_RUN,
    start: raw.startedAt,
    end: raw.collectedAt,
  };

  return {
    phases: [wholeRun, ...phases].map((window) =>
      summarizePhase(window, raw, anyMocked),
    ),
    supportedEntryTypes: raw.sample.supportedEntryTypes,
    warnings,
  };
}
