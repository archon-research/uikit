import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
  type EvaluateOptions,
  evaluateRun,
  type PerfVerdict,
} from './compare.js';
import type { PerfRun, PhaseSignals } from './summarize.js';

/**
 * One markdown file per run, so the artefact is diffable and an agent can read
 * it back without parsing a trace.
 *
 * The JSON written beside it is the same run, and is what the next run loads as
 * its baseline — the report is for people, the JSON is for the comparison.
 */

/** A signal that was not measured prints as this, never as `0`. */
const UNMEASURED = '—';

function cell(value: number | null, unit = ' ms'): string {
  return value === null ? UNMEASURED : `${Math.round(value)}${unit}`;
}

function phaseRow(phase: PhaseSignals): string {
  const worst =
    phase.worstInteraction === null
      ? UNMEASURED
      : `${cell(phase.worstInteraction.durationMs)} (${phase.worstInteraction.name}` +
        `${phase.worstInteraction.target ? ` on ${phase.worstInteraction.target}` : ''})`;

  return `| ${phase.phase} | ${cell(phase.durationMs)} | ${cell(phase.blockingMs)} | ${cell(phase.longestTaskMs)} | ${worst} | ${phase.requests.total} |`;
}

function requestsSection(run: PerfRun): string {
  const lines: string[] = [];
  for (const phase of run.phases) {
    const entries = Object.entries(phase.requests.byKey).sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    );
    if (entries.length === 0) continue;
    lines.push(`### ${phase.phase}`, '');
    for (const [key, count] of entries) {
      const unmocked = phase.requests.unmockedKeys.includes(key)
        ? ' — **not mocked**'
        : '';
      lines.push(`- \`${key}\` ×${count}${unmocked}`);
    }
    lines.push('');
  }
  return lines.length === 0
    ? '_No requests were recorded._\n'
    : lines.join('\n');
}

export type ReportMeta = {
  /** What this run was, e.g. a branch name or a scenario name. */
  label?: string;
  /** ISO timestamp. Defaults to now. Injectable so the output is testable. */
  at?: string;
};

/** Render a run and its verdict as the `perf-report.md` body. */
export function renderPerfReport(
  run: PerfRun,
  verdict: PerfVerdict,
  meta: ReportMeta = {},
): string {
  const failures = verdict.findings.filter((f) => f.severity === 'fail');
  const warnings = verdict.findings.filter((f) => f.severity === 'warn');
  const notes = verdict.findings.filter((f) => f.severity === 'info');

  const lines: string[] = [
    '# Performance harvest',
    '',
    `- Run: ${meta.at ?? new Date().toISOString()}${meta.label ? ` · ${meta.label}` : ''}`,
    `- Verdict: ${verdict.ok ? 'within budget' : `${failures.length} failure(s)`}`,
    '',
    '## Phases',
    '',
    '| phase | wall | blocking | longest task | worst interaction | requests |',
    '| --- | --- | --- | --- | --- | --- |',
    ...run.phases.map(phaseRow),
    '',
    `\`${UNMEASURED}\` means the signal was not measured in this run, which is not the same as zero.`,
    '',
  ];

  if (failures.length > 0) {
    lines.push('## Failures', '');
    for (const finding of failures) {
      lines.push(
        `- **${finding.phase}** · ${finding.kind}: ${finding.message}`,
      );
    }
    lines.push('');
  }

  if (warnings.length > 0) {
    lines.push('## Warnings', '');
    for (const finding of warnings) {
      lines.push(
        `- **${finding.phase}** · ${finding.kind}: ${finding.message}`,
      );
    }
    lines.push('');
  }

  lines.push('## Requests', '', requestsSection(run));

  const unmeasured = run.phases.flatMap((phase) =>
    phase.notes.map((note) => `- **${phase.phase}**: ${note}`),
  );
  if (unmeasured.length > 0) {
    lines.push('## What was not measured', '', ...unmeasured, '');
  }

  if (notes.length > 0) {
    lines.push('## Checks that passed', '');
    for (const finding of notes) {
      lines.push(
        `- **${finding.phase}** · ${finding.kind}: ${finding.message}`,
      );
    }
    lines.push('');
  }

  lines.push(
    '## Engine',
    '',
    `Reported entry types: \`${run.supportedEntryTypes.join('`, `') || 'none'}\``,
    '',
  );

  return `${lines.join('\n').trimEnd()}\n`;
}

export type WritePerfReportOptions = EvaluateOptions & {
  /** Directory for `perf-report.md` and `perf-report.json`. */
  outDir: string;
  /**
   * Baseline JSON to compare against, and to write when `updateBaseline` is set.
   * Defaults to `<outDir>/perf-baseline.json`. A missing file is not an error —
   * the first run has nothing to compare to, and the report says so.
   */
  baselinePath?: string;
  /** Replace the baseline with this run. */
  updateBaseline?: boolean;
  meta?: ReportMeta;
};

export type WrittenPerfReport = {
  verdict: PerfVerdict;
  markdownPath: string;
  jsonPath: string;
  /** Whether a baseline was found and used. */
  comparedToBaseline: boolean;
};

/** Read a previously written run, or `null` when there is not one yet. */
export function readBaseline(baselinePath: string): PerfRun | null {
  try {
    return JSON.parse(readFileSync(baselinePath, 'utf8')) as PerfRun;
  } catch {
    return null;
  }
}

/** Evaluate a run, write the report and JSON, and return the verdict. */
export function writePerfReport(
  run: PerfRun,
  options: WritePerfReportOptions,
): WrittenPerfReport {
  const baselinePath =
    options.baselinePath ?? path.join(options.outDir, 'perf-baseline.json');
  const baseline = options.baseline ?? readBaseline(baselinePath);

  const verdict = evaluateRun(run, { ...options, baseline });

  mkdirSync(options.outDir, { recursive: true });
  const markdownPath = path.join(options.outDir, 'perf-report.md');
  const jsonPath = path.join(options.outDir, 'perf-report.json');
  writeFileSync(markdownPath, renderPerfReport(run, verdict, options.meta));
  writeFileSync(jsonPath, `${JSON.stringify(run, null, 2)}\n`);

  if (options.updateBaseline === true) {
    mkdirSync(path.dirname(baselinePath), { recursive: true });
    writeFileSync(baselinePath, `${JSON.stringify(run, null, 2)}\n`);
  }

  return {
    verdict,
    markdownPath,
    jsonPath,
    comparedToBaseline: baseline !== null,
  };
}
