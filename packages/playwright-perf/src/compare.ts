import { type PerfRun, type PhaseSignals, WHOLE_RUN } from './summarize.js';

/**
 * What turns numbers into a verdict.
 *
 * ── Why a single run is nearly worthless ──
 *
 * "Blocking time was 210 ms" is not a fact about the application. It is a fact
 * about the application, this laptop, this browser build, and whatever else the
 * machine was doing. Absolute perf numbers from unspecified hardware cannot be
 * compared to anyone else's, or to the same machine next week.
 *
 * Two things make them actionable, and this module implements both:
 *
 * 1. **A baseline** — the same scenario, previously, on the machine running it
 *    now. Comparison cancels the hardware out. Timings get a tolerance because
 *    they are noisy; request counts get none, because they are not.
 * 2. **A control phase in the same run** — two phases minutes apart on one
 *    machine. "Opening the drawer costs four times the cold load" survives being
 *    read on different hardware in a way that "312 ms" does not.
 *
 * ── Why the tolerance has both a ratio and a floor ──
 *
 * A ratio alone turns tiny baselines into false alarms: 4 ms against a 12 ms
 * baseline is a 33% regression and is also nothing. A floor alone lets a large
 * baseline absorb a real regression. A change has to clear both to count.
 */

export type PerfBudget = {
  /** Ceiling for blocking time in the phase, in ms. */
  blockingMs?: number;
  /** Ceiling for the worst interaction in the phase, in ms. */
  interactionMs?: number;
  /**
   * Exact expected request counts, per `` `${method} ${pathname}` `` key. A key
   * mapped to `0` is the refetch assertion: this endpoint must not be read
   * again during this phase.
   */
  requests?: Record<string, number>;
  /** Ceiling for the total number of counted requests in the phase. */
  maxRequests?: number;
  /**
   * Fail when a request in this phase reached the network while others in the
   * run were served by the service worker — a hole in the fixtures.
   */
  requireMocked?: boolean;
};

export type CompareOptions = {
  /** Relative slack before a timing increase counts. Default `0.25`. */
  ratio?: number;
  /** Absolute slack in ms; below this, a change is noise. Default `50`. */
  floorMs?: number;
};

export type Finding = {
  phase: string;
  /** Stable identifier: `budget-blocking`, `regression-interaction`, … */
  kind: string;
  severity: 'fail' | 'warn' | 'info';
  message: string;
};

export type EvaluateOptions = {
  budgets?: Record<string, PerfBudget>;
  baseline?: PerfRun | null;
  compare?: CompareOptions;
};

export type PerfVerdict = {
  /** True when nothing failed. */
  ok: boolean;
  findings: readonly Finding[];
};

const DEFAULT_RATIO = 0.25;
const DEFAULT_FLOOR_MS = 50;

function ms(value: number): string {
  return `${Math.round(value)} ms`;
}

function budgetTiming(
  phase: PhaseSignals,
  label: string,
  kind: string,
  actual: number | null,
  limit: number | undefined,
): Finding[] {
  if (limit === undefined) return [];
  if (actual === null) {
    // The whole point of the `null`: a budget written against a signal this run
    // could not measure must fail loudly. Passing it would mean a WebKit run
    // reports every blocking-time budget as green.
    return [
      {
        phase: phase.phase,
        kind: `${kind}-unmeasured`,
        severity: 'fail',
        message:
          `${label} has a budget of ${limit} ms but was not measured in this run, so the ` +
          'budget asserted nothing. ' +
          (phase.notes[0] ?? 'No reason was recorded.'),
      },
    ];
  }
  return actual <= limit
    ? [
        {
          phase: phase.phase,
          kind,
          severity: 'info',
          message: `${label} ${ms(actual)}, within ${limit} ms`,
        },
      ]
    : [
        {
          phase: phase.phase,
          kind,
          severity: 'fail',
          message: `${label} ${ms(actual)}, over the ${limit} ms budget by ${ms(actual - limit)}`,
        },
      ];
}

function budgetRequests(phase: PhaseSignals, budget: PerfBudget): Finding[] {
  const findings: Finding[] = [];

  for (const [key, expected] of Object.entries(budget.requests ?? {})) {
    const actual = phase.requests.byKey[key] ?? 0;
    if (actual === expected) continue;
    findings.push({
      phase: phase.phase,
      kind: 'budget-requests',
      severity: 'fail',
      message:
        `\`${key}\` fired ${actual}x, expected ${expected}x.` +
        (expected === 0
          ? '\n  This phase is not supposed to read that endpoint again — something ' +
            'invalidated a cache, remounted a subscribed component, or changed a query key.'
          : ''),
    });
  }

  if (
    budget.maxRequests !== undefined &&
    phase.requests.total > budget.maxRequests
  ) {
    findings.push({
      phase: phase.phase,
      kind: 'budget-max-requests',
      severity: 'fail',
      message:
        `${phase.requests.total} requests, over the ${budget.maxRequests} allowed:\n` +
        Object.entries(phase.requests.byKey)
          .sort((a, b) => b[1] - a[1])
          .map(([key, count]) => `      ${String(count).padStart(4)}x  ${key}`)
          .join('\n'),
    });
  }

  if (budget.requireMocked === true && phase.requests.unmockedKeys.length > 0) {
    findings.push({
      phase: phase.phase,
      kind: 'budget-unmocked',
      severity: 'fail',
      message:
        `${phase.requests.unmockedKeys.length} request key(s) went to the network while the ` +
        `rest of the run was served by the worker: ${phase.requests.unmockedKeys.join(', ')}.\n` +
        '  A request nothing mocked is a hole in the fixtures — whatever it measured ' +
        'includes real network time, and whatever it rendered is not the fixture.',
    });
  }

  return findings;
}

function regressionTiming(
  phaseName: string,
  label: string,
  kind: string,
  actual: number | null,
  before: number | null,
  options: Required<CompareOptions>,
): Finding[] {
  if (actual === null || before === null) return [];
  const delta = actual - before;
  const allowed = Math.max(options.floorMs, before * options.ratio);

  if (delta > allowed) {
    return [
      {
        phase: phaseName,
        kind,
        severity: 'fail',
        message:
          `${label} ${ms(before)} → ${ms(actual)} (+${ms(delta)}), past the ` +
          `${ms(allowed)} tolerance (max of ${options.floorMs} ms and ` +
          `${Math.round(options.ratio * 100)}% of the baseline)`,
      },
    ];
  }

  // An improvement past the same tolerance is worth saying out loud: it is how a
  // fix is confirmed to have done something, and it is the cue to re-baseline.
  if (-delta > allowed) {
    return [
      {
        phase: phaseName,
        kind: `${kind}-improved`,
        severity: 'info',
        message: `${label} ${ms(before)} → ${ms(actual)} (${ms(delta)}) — improved past the tolerance`,
      },
    ];
  }

  return [];
}

function regressionRequests(
  phase: PhaseSignals,
  before: PhaseSignals,
): Finding[] {
  const keys = new Set([
    ...Object.keys(phase.requests.byKey),
    ...Object.keys(before.requests.byKey),
  ]);
  const changed: string[] = [];
  for (const key of [...keys].sort()) {
    const now = phase.requests.byKey[key] ?? 0;
    const then = before.requests.byKey[key] ?? 0;
    if (now !== then) changed.push(`      ${key}: ${then}x → ${now}x`);
  }

  return changed.length === 0
    ? []
    : [
        {
          phase: phase.phase,
          kind: 'regression-requests',
          severity: 'fail',
          message:
            'request counts changed against the baseline:\n' +
            `${changed.join('\n')}\n` +
            '  Counts are deterministic, so this has no tolerance: the scenario really ' +
            'does talk to the API a different number of times than it used to. Re-baseline ' +
            'if the change is intended.',
        },
      ];
}

/** Apply budgets and a baseline to a run. */
export function evaluateRun(
  run: PerfRun,
  options: EvaluateOptions = {},
): PerfVerdict {
  const compare: Required<CompareOptions> = {
    ratio: options.compare?.ratio ?? DEFAULT_RATIO,
    floorMs: options.compare?.floorMs ?? DEFAULT_FLOOR_MS,
  };
  const findings: Finding[] = [];

  // `(run)` is the total, and when named phases exist it is a sum of numbers
  // already reported — comparing it as well doubles every finding and dilutes
  // the ones that point somewhere. Phases are the assertion unit; the total is
  // context. With no phases declared it is the only thing there is, so it is
  // compared then. A budget written explicitly for `(run)` always applies.
  const hasNamedPhases = run.phases.some((phase) => phase.phase !== WHOLE_RUN);

  for (const warning of run.warnings) {
    findings.push({
      phase: '(run)',
      kind: 'run-warning',
      severity: 'warn',
      message: warning,
    });
  }

  for (const phase of run.phases) {
    if (phase.requests.unresolved > 0) {
      findings.push({
        phase: phase.phase,
        kind: 'unresolved-requests',
        severity: 'warn',
        message:
          `${phase.requests.unresolved} request(s) never produced a response — aborted, or ` +
          'still in flight when the phase ended. They are counted, but nothing is known ' +
          'about who answered them.',
      });
    }

    const budget = options.budgets?.[phase.phase];
    if (budget) {
      findings.push(
        ...budgetTiming(
          phase,
          'blocking time',
          'budget-blocking',
          phase.blockingMs,
          budget.blockingMs,
        ),
        ...budgetTiming(
          phase,
          'worst interaction',
          'budget-interaction',
          phase.interactionMs,
          budget.interactionMs,
        ),
        ...budgetRequests(phase, budget),
      );
    }

    const comparable = !(hasNamedPhases && phase.phase === WHOLE_RUN);
    const before = comparable
      ? options.baseline?.phases.find(
          (candidate) => candidate.phase === phase.phase,
        )
      : undefined;
    if (before) {
      findings.push(
        ...regressionTiming(
          phase.phase,
          'blocking time',
          'regression-blocking',
          phase.blockingMs,
          before.blockingMs,
          compare,
        ),
        ...regressionTiming(
          phase.phase,
          'worst interaction',
          'regression-interaction',
          phase.interactionMs,
          before.interactionMs,
          compare,
        ),
        ...regressionRequests(phase, before),
      );
    } else if (options.baseline && comparable) {
      findings.push({
        phase: phase.phase,
        kind: 'new-phase',
        severity: 'info',
        message: 'no baseline for this phase — it is new, or it was renamed.',
      });
    }
  }

  return {
    ok: findings.every((finding) => finding.severity !== 'fail'),
    findings,
  };
}
