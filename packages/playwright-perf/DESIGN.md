# Design — playwright-perf

## The problem

A Playwright run is the expensive part of a frontend test suite, and it throws
away everything except pass/fail and a screenshot. Every consumer that wants to
know whether a change made the app slower builds the same harness, by hand, and
deletes it afterwards.

The harness is generic. Only the thresholds are app-specific.

## What "all the signal" is

A harvest that collects everything and interprets nothing is a log file. Three
signals, each answering a question someone actually asks, each with a way of
being judged:

### 1. Blocking time — `longtask`

Sum of `duration - 50 ms` over the long tasks in the phase: the time the main
thread was busy past what a frame can hide. This is the number behind "it feels
janky".

Noisy in absolute terms, so it is never asserted as an absolute. It is compared
against a baseline (with a tolerance) or against another phase in the same run.

### 2. Worst interaction — `event` timing

Interaction latency is the longest event in an interaction; the phase's number
is the **worst** interaction in it, not an average — an average lets one slow
click hide behind nine fast ones. The report names the event and its target, so
the number points at something.

This is the metric that matters for a data-grid-heavy SPA, where LCP settled
long ago and every remaining complaint is about responsiveness.

`durationThreshold` is 16 ms rather than the spec default of 104: an interaction
that misses one frame is already worth seeing, and the default would hide every
regression that has not yet grown past a tenth of a second.

### 3. Request counts — Playwright's `request` event

Counted per `` `${method} ${pathname}` ``. Discrete, exact, and independent of
the machine, which makes it the only one of the three that takes a hard budget:
`{ 'GET /positions': 0 }` in the "open drawer" phase *is* the refetch assertion.

The key format is deliberately identical to `createRequestRecorder`'s in
`@archon-research/http-client-msw`, so one assertion string reads the same in a
Playwright run and a vitest one.

## Instruments that were tried and rejected

Three dead ends, all verified by running them rather than reasoned about.

**Patching `window.fetch`** sees nothing. `openapi-fetch` snapshots
`globalThis.fetch` at `createClient` time as a default parameter, so a spy
installed afterwards records zero while requests are plainly going out. Any
client that resolves its transport once behaves the same way. (Recorded in
`http-client-msw/src/request-recorder.ts`.)

**`PerformanceResourceTiming`** does produce entries for service-worker-fulfilled
requests — contrary to the common belief — but the entry carries **no HTTP
method**, so `GET /things` and `POST /things` are indistinguishable. That is
exactly the distinction a refetch assertion turns on. Several discriminating
fields also disagree across engines, and the resource buffer is capped at 250
entries.

**Playwright's `page.on('request')`** is what replaced both. Measured against a
service worker that fulfils `/api/*`: the page event fires for every fetch with
its method intact, and the paired response's `fromServiceWorker()` is `true` —
so the driving process can both count requests by method and tell a mocked
response from one that reached the network, with no cooperation from the app.

## Two failure modes this is built around

A perf harness that silently collects nothing looks identical to one reporting a
fast app: both print small numbers and exit 0. Two specific versions of that
were hit while building this, and both are now structural.

### Support is read from `supportedEntryTypes`, not from a try/catch

| Engine | `supportedEntryTypes` has `longtask` | `observe({type:'longtask'})` |
| --- | --- | --- |
| Chromium | yes | resolves, delivers entries |
| WebKit | **no** | **resolves, delivers none** |

A try/catch probe calls WebKit "supported" and then reports zero long tasks on a
page that blocks for 600 ms. So the probe is the advertised list, an entry type
absent from it is never observed, every number it would have produced is `null`
rather than `0`, the report renders `—` and says why, and **a budget written
against an unmeasured signal fails** instead of passing.

### The observers are flushed before they are read

`event` timing entries are queued only after the frame following the handler has
been *presented*. Reading the collector the instant a phase ended produced an
empty interaction list beside a correct long-task list — an app with heavy boot
work and perfectly snappy interactions, which was a plausible and entirely wrong
story. `collect()` now waits until the entry count has been unchanged for three
animation frames, capped so a hidden page resolves anyway.

## One clock

`entry.startTime` is relative to the document's time origin, and a navigation
starts a new document with a new one. The first version paired phase boundaries
taken inside the page, and every phase containing a `reload()` came back empty.

`performance.timeOrigin` is epoch milliseconds, so every entry is stamped
`startTime + timeOrigin` as it arrives and becomes directly comparable with
`Date.now()` in the driving process. Phase boundaries are taken in the driving
process only, and navigation stops being a special case.

What a navigation does still cost is the previous document's entries, which go
away with its `window`. A `sessionStorage` counter survives the navigation, so
the summary can say which phases began before the surviving document did and
that their page-side numbers are a lower bound. Request counts are unaffected —
they are recorded outside the page.

## What a second run gives you

"Blocking time was 210 ms" is not a fact about the application. It is a fact
about the application, this laptop, this browser build, and whatever else the
machine was doing.

Two things make the numbers actionable, and both are implemented:

1. **A baseline** — the same scenario, previously, on the machine running it
   now. Comparison cancels the hardware out. Timings get a tolerance because
   they are noisy; request counts get none, because they are not.
2. **A control phase in the same run** — "opening the drawer costs four times the
   cold load" survives being read on different hardware in a way that "312 ms"
   does not.

The tolerance needs both a ratio and a floor. A ratio alone turns tiny baselines
into false alarms (4 ms against a 12 ms baseline is a 33% regression and is also
nothing); a floor alone lets a large baseline absorb a real one. A change has to
clear `max(floorMs, baseline * ratio)` — 50 ms and 25% by default.

## Out of scope

- **Bundle size and code splitting.** `uikit-cli bundle-budget` already computes
  the eager critical path from the built `dist` as the static-import closure over
  the entry plus its modulepreloads, with gzipped sizes and a `forbidEager`
  check. Measuring it again through a browser would be worse and slower.
- **JS/CSS coverage.** Chromium-only, and at chunk granularity it answers a
  question `bundle-budget`'s `forbidEager` already decides better. Worth
  revisiting if a consumer needs unused-byte attribution at module granularity,
  which needs sourcemaps to be actionable at all.
- **React commit counts.** Needs the application to mount a `<Profiler>` behind
  its mock flag, which makes it app-specific wiring rather than harness. The
  request-count signal catches the most common re-render regression — the one
  that refetches — without it.
- **A CDP performance trace.** A trace is a haystack. Playwright's own
  `trace: 'on-first-retry'` already captures one for a failing run, and an agent
  reading `perf-report.md` is better served by three judged numbers than by a
  megabyte of events.
- **Latency profiles.** `MOCK_LATENCY_PROFILES` in
  `@archon-research/http-client-msw` already names them from Chrome DevTools'
  own throttling presets. A scenario sets the latency it wants in its handlers;
  this package measures whatever the run produced.
