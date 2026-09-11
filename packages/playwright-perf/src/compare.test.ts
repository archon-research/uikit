import { describe, expect, it } from 'vitest';

import { evaluateRun } from './compare.js';
import type { PerfRun, PhaseSignals } from './summarize.js';

function phase(overrides: Partial<PhaseSignals> = {}): PhaseSignals {
  return {
    phase: 'open drawer',
    durationMs: 500,
    blockingMs: 100,
    longestTaskMs: 120,
    longTaskCount: 2,
    interactionMs: 80,
    worstInteraction: { name: 'click', target: 'row', durationMs: 80 },
    interactionCount: 1,
    requests: {
      total: 1,
      byKey: { 'GET /positions/p1': 1 },
      unmockedKeys: [],
      unresolved: 0,
    },
    notes: [],
    ...overrides,
  };
}

function run(phases: PhaseSignals[], warnings: string[] = []): PerfRun {
  return { phases, supportedEntryTypes: ['event', 'longtask'], warnings };
}

describe('budgets', () => {
  it('pass and fail on the timing they were written for', () => {
    const subject = run([phase()]);
    expect(
      evaluateRun(subject, { budgets: { 'open drawer': { blockingMs: 150 } } })
        .ok,
    ).toBe(true);

    const verdict = evaluateRun(subject, {
      budgets: { 'open drawer': { blockingMs: 50 } },
    });
    expect(verdict.ok).toBe(false);
    expect(
      verdict.findings.find((f) => f.kind === 'budget-blocking')?.message,
    ).toContain('over the 50 ms budget by 50 ms');
  });

  it('fail rather than pass when the signal was never measured', () => {
    const subject = run([
      phase({
        blockingMs: null,
        notes: ['blocking time unmeasured: this engine …'],
      }),
    ]);
    const verdict = evaluateRun(subject, {
      budgets: { 'open drawer': { blockingMs: 150 } },
    });

    expect(verdict.ok).toBe(false);
    const finding = verdict.findings.find(
      (f) => f.kind === 'budget-blocking-unmeasured',
    );
    expect(finding?.message).toContain('the budget asserted nothing');
  });

  it('catch a refetch with an expected count of zero', () => {
    const subject = run([
      phase({
        requests: {
          total: 1,
          byKey: { 'GET /positions': 1 },
          unmockedKeys: [],
          unresolved: 0,
        },
      }),
    ]);
    const verdict = evaluateRun(subject, {
      budgets: { 'open drawer': { requests: { 'GET /positions': 0 } } },
    });

    expect(verdict.ok).toBe(false);
    expect(
      verdict.findings.find((f) => f.kind === 'budget-requests')?.message,
    ).toContain('fired 1x, expected 0x');
  });

  it('treat a request nothing mocked as a fixture hole when asked to', () => {
    const subject = run([
      phase({
        requests: {
          total: 1,
          byKey: { 'GET /real': 1 },
          unmockedKeys: ['GET /real'],
          unresolved: 0,
        },
      }),
    ]);
    expect(
      evaluateRun(subject, {
        budgets: { 'open drawer': { requireMocked: true } },
      }).ok,
    ).toBe(false);
    expect(evaluateRun(subject, { budgets: { 'open drawer': {} } }).ok).toBe(
      true,
    );
  });
});

describe('baseline comparison', () => {
  const before = run([phase({ blockingMs: 100, interactionMs: 80 })]);

  it('does not flag a run against itself', () => {
    expect(evaluateRun(before, { baseline: before }).ok).toBe(true);
  });

  it('absorbs noise under both the ratio and the floor', () => {
    // +20 ms is 20% of the baseline and under the 50 ms floor: not a regression.
    const after = run([phase({ blockingMs: 120 })]);
    expect(evaluateRun(after, { baseline: before }).ok).toBe(true);
  });

  it('flags an increase that clears both', () => {
    const after = run([phase({ blockingMs: 400 })]);
    const verdict = evaluateRun(after, { baseline: before });
    expect(verdict.ok).toBe(false);
    expect(
      verdict.findings.find((f) => f.kind === 'regression-blocking')?.message,
    ).toContain('100 ms → 400 ms');
  });

  it('needs the ratio too, so a large baseline cannot absorb a real regression', () => {
    // A 60 ms rise clears the 50 ms floor but not 25% of a 1000 ms baseline.
    const big = run([phase({ blockingMs: 1000 })]);
    expect(
      evaluateRun(run([phase({ blockingMs: 1060 })]), { baseline: big }).ok,
    ).toBe(true);
    expect(
      evaluateRun(run([phase({ blockingMs: 1300 })]), { baseline: big }).ok,
    ).toBe(false);
  });

  it('says so when a fix worked', () => {
    const after = run([phase({ blockingMs: 20 })]);
    const verdict = evaluateRun(after, { baseline: before });
    expect(verdict.ok).toBe(true);
    expect(
      verdict.findings.some((f) => f.kind === 'regression-blocking-improved'),
    ).toBe(true);
  });

  it('gives request counts no tolerance at all', () => {
    const after = run([
      phase({
        requests: {
          total: 2,
          byKey: { 'GET /positions/p1': 2 },
          unmockedKeys: [],
          unresolved: 0,
        },
      }),
    ]);
    const verdict = evaluateRun(after, { baseline: before });
    expect(verdict.ok).toBe(false);
    expect(
      verdict.findings.find((f) => f.kind === 'regression-requests')?.message,
    ).toContain('GET /positions/p1: 1x → 2x');
  });

  it('does not compare a timing the new run could not measure', () => {
    const after = run([phase({ blockingMs: null })]);
    const verdict = evaluateRun(after, { baseline: before });
    expect(
      verdict.findings.some((f) => f.kind.startsWith('regression-blocking')),
    ).toBe(false);
  });

  it('notes a phase that has no counterpart', () => {
    const after = run([phase({ phase: 'renamed' })]);
    const verdict = evaluateRun(after, { baseline: before });
    expect(verdict.findings.find((f) => f.kind === 'new-phase')?.phase).toBe(
      'renamed',
    );
  });
});

describe('the (run) total', () => {
  const total = phase({ phase: '(run)', blockingMs: 100 });
  const named = phase({ phase: 'open drawer', blockingMs: 100 });

  it('is context, not a second copy of every finding, once phases exist', () => {
    const before = run([total, named]);
    const after = run([
      phase({ phase: '(run)', blockingMs: 500 }),
      phase({ phase: 'open drawer', blockingMs: 500 }),
    ]);

    const verdict = evaluateRun(after, { baseline: before });
    const phases = verdict.findings
      .filter((f) => f.kind === 'regression-blocking')
      .map((f) => f.phase);
    expect(phases).toEqual(['open drawer']);
  });

  it('is compared when it is the only phase there is', () => {
    const verdict = evaluateRun(
      run([phase({ phase: '(run)', blockingMs: 500 })]),
      {
        baseline: run([total]),
      },
    );
    expect(verdict.findings.some((f) => f.kind === 'regression-blocking')).toBe(
      true,
    );
  });

  it('still honours a budget written for it explicitly', () => {
    const verdict = evaluateRun(run([total, named]), {
      budgets: { '(run)': { blockingMs: 50 } },
    });
    expect(verdict.ok).toBe(false);
  });
});

describe('run-level problems', () => {
  it('surface as warnings without failing the verdict on their own', () => {
    const verdict = evaluateRun(
      run([phase()], ['2 phase(s) were opened and never closed']),
    );
    expect(verdict.ok).toBe(true);
    expect(verdict.findings.some((f) => f.severity === 'warn')).toBe(true);
  });
});
