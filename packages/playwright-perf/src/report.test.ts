import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { evaluateRun } from './compare.js';
import { readBaseline, renderPerfReport, writePerfReport } from './report.js';
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

const run: PerfRun = {
  phases: [phase()],
  supportedEntryTypes: ['event', 'longtask'],
  warnings: [],
};

function outDir(): string {
  return mkdtempSync(path.join(tmpdir(), 'playwright-perf-'));
}

describe('the rendered report', () => {
  it('names the worst interaction rather than just timing it', () => {
    const markdown = renderPerfReport(run, evaluateRun(run), {
      at: '2026-01-01T00:00:00.000Z',
    });
    expect(markdown).toContain('80 ms (click on row)');
    expect(markdown).toContain('`GET /positions/p1` ×1');
  });

  it('prints an unmeasured signal as a dash and says why', () => {
    const unmeasured: PerfRun = {
      ...run,
      phases: [
        phase({
          blockingMs: null,
          longestTaskMs: null,
          notes: ['engine reports no long tasks'],
        }),
      ],
      supportedEntryTypes: ['event'],
    };
    const markdown = renderPerfReport(unmeasured, evaluateRun(unmeasured));

    expect(markdown).toContain('| — |');
    expect(markdown).toContain(
      'not measured in this run, which is not the same as zero',
    );
    expect(markdown).toContain('engine reports no long tasks');
    // The failure mode this guards: a dash must never be rendered as 0 ms.
    expect(markdown).not.toContain('| 0 ms | 0 ms |');
  });

  it('marks a request that reached the network', () => {
    const leaky: PerfRun = {
      ...run,
      phases: [
        phase({
          requests: {
            total: 1,
            byKey: { 'GET /real': 1 },
            unmockedKeys: ['GET /real'],
            unresolved: 0,
          },
        }),
      ],
    };
    expect(renderPerfReport(leaky, evaluateRun(leaky))).toContain(
      '`GET /real` ×1 — **not mocked**',
    );
  });
});

describe('writing a run', () => {
  it('writes a report and a machine-readable run beside it', () => {
    const dir = outDir();
    const written = writePerfReport(run, { outDir: dir });

    expect(written.comparedToBaseline).toBe(false);
    expect(readFileSync(written.markdownPath, 'utf8')).toContain(
      '# Performance harvest',
    );
    expect(JSON.parse(readFileSync(written.jsonPath, 'utf8'))).toEqual(run);
  });

  it('round-trips through a baseline and then compares against it', () => {
    const dir = outDir();
    writePerfReport(run, { outDir: dir, updateBaseline: true });

    const baselinePath = path.join(dir, 'perf-baseline.json');
    expect(readBaseline(baselinePath)).toEqual(run);

    const regressed: PerfRun = { ...run, phases: [phase({ blockingMs: 600 })] };
    const second = writePerfReport(regressed, { outDir: dir });

    expect(second.comparedToBaseline).toBe(true);
    expect(second.verdict.ok).toBe(false);
    expect(readFileSync(second.markdownPath, 'utf8')).toContain(
      '100 ms → 600 ms',
    );
  });

  it('treats a missing baseline as a first run rather than an error', () => {
    const dir = outDir();
    expect(readBaseline(path.join(dir, 'perf-baseline.json'))).toBeNull();
    expect(writePerfReport(run, { outDir: dir }).comparedToBaseline).toBe(
      false,
    );
  });
});
