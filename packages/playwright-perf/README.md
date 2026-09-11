# @archon-research/playwright-perf

Harvest performance signal from a Playwright run you were going to pay for anyway.

A Playwright session already buys a real browser, a real navigation and a real
render. This attaches to the same `Page`, runs the scenario in named phases, and
returns three numbers per phase with a verdict against budgets and a baseline.

```ts
import {
  attachPerfHarvest,
  summarizeRun,
  writePerfReport,
} from '@archon-research/playwright-perf';

test('positions grid', async ({ page }) => {
  const perf = await attachPerfHarvest(page);

  await perf.phase('cold load', async () => {
    await page.goto('/positions');
    await page.getByRole('row').nth(1).waitFor();
  });

  await perf.phase('open drawer', async () => {
    await page.getByRole('button', { name: 'Details' }).click();
    await page.getByRole('dialog').waitFor();
  });

  const { verdict } = writePerfReport(summarizeRun(await perf.collect()), {
    outDir: 'perf',
    updateBaseline: Boolean(process.env.UPDATE_PERF_BASELINE),
    budgets: {
      'cold load': { blockingMs: 600, requests: { 'GET /positions': 1 } },
      // Reopening a drawer must not re-read the list.
      'open drawer': { interactionMs: 200, requests: { 'GET /positions': 0 } },
    },
  });

  expect(verdict.findings.filter((f) => f.severity === 'fail')).toEqual([]);
});
```

It writes `perf/perf-report.md` (diffable, and readable by an agent) and
`perf/perf-report.json` (the next run's baseline).

## What it measures

| Signal | Question | How it is judged |
| --- | --- | --- |
| Blocking time | Why does it feel janky? | Budget, or a baseline with a tolerance |
| Worst interaction | How long after the click? | Budget, or a baseline with a tolerance |
| Request counts per `METHOD /path` | Did opening it twice fetch twice? | Exact — no tolerance |

Request counts are the only one of the three that is hardware-independent, so
they are the only one that takes an exact budget. The timings are compared, not
asserted: against a stored baseline from the same machine, or against another
phase in the same run.

## What it does not measure, on purpose

- **Bundle size.** `uikit-cli bundle-budget` reads the built `dist` and computes
  the eager critical path as the static-import closure over the entry plus its
  modulepreloads. That is a better answer than anything the browser can report,
  and it does not need a browser.
- **A CDP trace.** A trace is a haystack, not a signal. Playwright's own
  `trace: 'on-first-retry'` already captures one when a run fails.

`DESIGN.md` has the reasoning, including the instruments that were tried and
rejected.

## Notes

- Call `attachPerfHarvest` **before** the first navigation. The collector is
  installed with `addInitScript`, which only applies to documents created after
  the call; `collect()` throws rather than reporting a run of zeros if it was
  never installed.
- Blocking time needs `longtask`, which Chromium reports and WebKit does not.
  An unmeasured signal is reported as `null` and rendered as `—`, and a budget
  written against one **fails** rather than passing.
- The package has no dependency on Playwright: the `Page` surface it uses is
  typed structurally, and `src/page.types.test.ts` checks the real thing still
  fits.
