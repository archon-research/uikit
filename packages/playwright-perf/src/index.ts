/**
 * A perf harvest for a Playwright run: install one collector, run the scenario
 * in named phases, and get back a diffable report with a verdict.
 *
 * The browser is the expensive part of a Playwright run and it is already being
 * paid for, so the same pass that drives a scenario can also say how long the
 * main thread was blocked, how slow the worst interaction was, and exactly which
 * endpoints were called how many times.
 *
 * What this deliberately does **not** do is measure the bundle: the static side
 * of the question is `uikit-cli bundle-budget`, which reads the built `dist` and
 * computes the eager critical path properly. See DESIGN.md for the rest of what
 * was left out and why.
 */

export {
  type CompareOptions,
  type EvaluateOptions,
  evaluateRun,
  type Finding,
  type PerfBudget,
  type PerfVerdict,
} from './compare.js';
export {
  type AttachOptions,
  attachPerfHarvest,
  type PerfHarvest,
  type PerfRunRaw,
  type RecordedPageRequest,
  type PhaseBoundary,
} from './harvest.js';
export type { PerfPage, PerfRequest, PerfResponse } from './page.js';
export {
  readBaseline,
  renderPerfReport,
  type ReportMeta,
  type WrittenPerfReport,
  writePerfReport,
  type WritePerfReportOptions,
} from './report.js';
export {
  type PerfRun,
  type PhaseRequests,
  type PhaseSignals,
  summarizeRun,
  WHOLE_RUN,
  type WorstInteraction,
} from './summarize.js';
