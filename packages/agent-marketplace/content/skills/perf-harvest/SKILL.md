---
name: perf-harvest
description: WHEN asked whether a change made the app slower, or to measure interaction latency, jank, or refetch behaviour; harvest blocking time, worst interaction and per-endpoint request counts from one Playwright run and judge them against a budget or a baseline.
---

# Perf Harvest

A Playwright run already pays for a real browser, a real navigation and a real
render. This gets performance signal out of that run instead of throwing it away.

Use it when the question is **"is it slower?"** or **"why does this feel slow?"**.
Use `eyes` when the question is "does it look right" — that skill drives
Playwright MCP interactively, and numbers taken from an agent-paced session are
not comparable between runs. This is a sibling, not an extension: same browser,
different vehicle (a scripted spec, so the same scenario runs the same way twice).

## Do not build the harness

`@archon-research/playwright-perf` is the harness. Do not hand-roll a
`PerformanceObserver`, a fetch spy, or a resource-timing reader — each of those
has a documented failure mode that makes it report a fast app when it is
collecting nothing. See the package's `DESIGN.md`.

Three other pieces already exist and compose with it:

| Question | Use |
| --- | --- |
| Did the bundle's critical path regress? | `uikit-cli bundle-budget` — no browser needed |
| How many requests did a *unit* test fire? | `createRequestRecorder` from `@archon-research/http-client-msw` |
| What latency should the scenario run under? | `MOCK_LATENCY_PROFILES` from the same package |

`bundle-budget` is the static half of the answer and is strictly better at it:
it computes the eager critical path from the built `dist` as the static-import
closure over the entry plus its modulepreloads. Run it first — it is cheap and
needs no browser.

## Procedure

1. **Find or write the spec.** Look for `perf/*.spec.ts` or similar. If there is
   none, write one scenario covering the flow in question. One spec, two or more
   phases.

2. **Attach before navigating.** `attachPerfHarvest(page)` installs its collector
   with `addInitScript`, which only applies to documents created after the call.

3. **Name the phases after what the user is doing.** `'cold load'`,
   `'open drawer'`, `'sort column'`. Phases are the unit everything is reported
   and budgeted against, and **two phases in one run are the cheapest honest
   comparison there is** — same machine, same process, same minute.

4. **Include a control phase.** A phase you expect to be cheap, next to the one
   you suspect. "Opening the drawer costs four times the cold load" survives
   being read on someone else's hardware; "312 ms" does not.

5. **Run it twice.** The first run has nothing to compare to. Record a baseline
   on the unchanged code (`updateBaseline: true`), apply the change, run again.
   Report the delta, not the absolute.

6. **Read `perf-report.md`.** It is written for this. The table is the summary;
   the `Failures` section says what to look at.

## Reading the report

| Signal | What it means | How to judge it |
| --- | --- | --- |
| Blocking time | Main thread busy past what a frame hides | Compare to baseline or another phase — never quote the absolute |
| Worst interaction | Longest event of the slowest interaction, named with its target | Compare, or budget generously (200 ms is a reasonable ceiling for a click) |
| Request counts | Per `METHOD /path` | **Exact.** No tolerance. A change here is always real |

Request counts are the strongest signal in the report because they do not depend
on the machine. `{ 'GET /positions': 0 }` as the budget for an "open drawer"
phase is the refetch assertion: reopening a drawer must not re-read the list.

**`—` means unmeasured, not zero.** Blocking time needs `longtask`, which
Chromium reports and WebKit does not — and WebKit accepts the observer and
delivers nothing rather than erroring. A budget written against an unmeasured
signal fails rather than passing; if you see that failure, the fix is to run the
scenario in Chromium, not to delete the budget.

## Setting thresholds

The collection is generic; the thresholds are yours. Derive them, do not invent
them:

1. Run the scenario three times on unchanged code.
2. Take the worst blocking time and worst interaction of the three.
3. Set the budget above that, with headroom — a budget that fails on noise gets
   deleted within a week.
4. Set request counts to exactly what the unchanged run does.

Prefer the baseline comparison to a budget for the timings, and a budget for the
counts. The default tolerance (a regression must clear both 50 ms and 25% of the
baseline) is tuned for that split.

## Reporting a finding

Say what moved, by how much, against what, and what to look at. Not "blocking
time is 400 ms" but "blocking time in `open drawer` went 100 ms → 400 ms against
the baseline, and `GET /positions` now fires twice where it fired once — the
drawer is re-reading the list it was opened from."

If nothing moved, say that too, and say what was measured — a report where every
number is `—` proves nothing and must not be presented as a pass.
