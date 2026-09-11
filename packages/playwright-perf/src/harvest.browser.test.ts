import { type Browser, chromium, type Page } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { evaluateRun } from './compare.js';
import { attachPerfHarvest } from './harvest.js';
import { type PerfRun, type PhaseSignals, summarizeRun } from './summarize.js';
import { type FixtureServer, startFixtureServer } from './test-fixtures.js';

/**
 * The spec that keeps this package honest.
 *
 * A perf harness that silently collects nothing is indistinguishable from one
 * reporting a fast app — both print small numbers and exit 0. So every claim
 * here is made twice: once against a cheap page and once against the *same page
 * made measurably worse*, and the assertion is that the harvest moved. A
 * collector that stopped working would pass the first half and fail the second.
 */

let server: FixtureServer;
let browser: Browser;

beforeAll(async () => {
  server = await startFixtureServer();
  browser = await chromium.launch();
});

afterAll(async () => {
  await browser?.close();
  await server?.close();
});

type ScenarioOptions = {
  boot?: number;
  click?: number;
  fetches?: number;
  /** Extra init script, evaluated before the collector installs itself. */
  beforeCollector?: string;
};

/** Load the fixture, click twice, and harvest. */
async function runScenario(options: ScenarioOptions = {}): Promise<PerfRun> {
  const page: Page = await browser.newPage();
  try {
    if (options.beforeCollector !== undefined) {
      await page.addInitScript(options.beforeCollector);
    }
    const perf = await attachPerfHarvest(page);
    const query = new URLSearchParams({
      boot: String(options.boot ?? 120),
      click: String(options.click ?? 30),
      fetches: String(options.fetches ?? 1),
    });

    await perf.phase('boot', async () => {
      await page.goto(`${server.origin}/?${query.toString()}`);
      await page.waitForSelector('#status:has-text("ready")');
    });

    await perf.phase('interact', async () => {
      await page.click('#go');
      await page.waitForSelector('#status:has-text("done")');
    });

    const run = summarizeRun(await perf.collect());
    perf.stop();
    return run;
  } finally {
    await page.close();
  }
}

function phase(run: PerfRun, name: string): PhaseSignals {
  const found = run.phases.find((candidate) => candidate.phase === name);
  if (!found)
    throw new Error(
      `no phase ${name} in ${run.phases.map((p) => p.phase).join(', ')}`,
    );
  return found;
}

describe('the harvest collects real signal', () => {
  it('measures blocking time, interaction latency and requests in one pass', async () => {
    const run = await runScenario();

    const boot = phase(run, 'boot');
    const interact = phase(run, 'interact');

    // Not null, and not zero: the fixture blocks for 120 ms at parse, which is
    // 70 ms past the frame budget.
    expect(boot.blockingMs).not.toBeNull();
    expect(boot.blockingMs as number).toBeGreaterThan(40);
    expect(boot.longestTaskMs as number).toBeGreaterThan(100);

    expect(interact.interactionMs).not.toBeNull();
    expect(interact.interactionMs as number).toBeGreaterThan(20);
    expect(interact.worstInteraction?.target).toBe('go');

    // The signal Resource Timing cannot give: method-separated counts, for
    // requests a service worker answered.
    expect(interact.requests.byKey).toEqual({
      'GET /api/things': 1,
      'POST /api/things': 1,
    });
    expect(interact.requests.unmockedKeys).toEqual([]);
    expect(interact.requests.unresolved).toBe(0);
  });

  it('attributes entries to the phase they happened in', async () => {
    const run = await runScenario();

    // The boot block happens during the reload, not during the click; the click
    // cost happens during the click, not the reload. If windowing were broken
    // both phases would carry both.
    expect(phase(run, 'boot').requests.total).toBe(0);
    expect(phase(run, 'interact').requests.total).toBe(2);
    expect(phase(run, 'boot').interactionCount).toBe(0);
    expect(phase(run, 'interact').interactionCount).toBe(1);
  });
});

describe('making the page worse moves the numbers', () => {
  it('a slower click handler raises the worst interaction and fails its budget', async () => {
    const fast = await runScenario({ click: 30 });
    const slow = await runScenario({ click: 400 });

    const fastMs = phase(fast, 'interact').interactionMs as number;
    const slowMs = phase(slow, 'interact').interactionMs as number;

    expect(fastMs).toBeLessThan(200);
    expect(slowMs).toBeGreaterThan(300);
    expect(slowMs).toBeGreaterThan(fastMs * 3);

    const budgets = { interact: { interactionMs: 200 } };
    expect(evaluateRun(fast, { budgets }).ok).toBe(true);

    const regressed = evaluateRun(slow, { budgets });
    expect(regressed.ok).toBe(false);
    expect(
      regressed.findings.some((f) => f.kind === 'budget-interaction'),
    ).toBe(true);
  });

  it('a heavier boot raises blocking time and trips the baseline comparison', async () => {
    const before = await runScenario({ boot: 120 });
    const after = await runScenario({ boot: 600 });

    expect(
      after.phases.find((p) => p.phase === 'boot')?.blockingMs as number,
    ).toBeGreaterThan(
      (before.phases.find((p) => p.phase === 'boot')?.blockingMs as number) +
        200,
    );

    // The same numbers against themselves must not regress — the tolerance has
    // to absorb run-to-run noise, or every report is a false alarm.
    expect(evaluateRun(before, { baseline: before }).ok).toBe(true);

    const verdict = evaluateRun(after, { baseline: before });
    expect(verdict.ok).toBe(false);
    expect(verdict.findings.some((f) => f.kind === 'regression-blocking')).toBe(
      true,
    );
  });

  it('an extra fetch is caught with no tolerance at all', async () => {
    const before = await runScenario({ fetches: 1 });
    const after = await runScenario({ fetches: 2 });

    expect(phase(after, 'interact').requests.byKey['GET /api/things']).toBe(2);

    const verdict = evaluateRun(after, { baseline: before });
    expect(verdict.ok).toBe(false);
    const finding = verdict.findings.find(
      (f) => f.kind === 'regression-requests',
    );
    expect(finding?.message).toContain('GET /api/things: 1x → 2x');

    // And the same regression caught by a budget, without a baseline at all.
    const budgeted = evaluateRun(after, {
      budgets: { interact: { requests: { 'GET /api/things': 1 } } },
    });
    expect(budgeted.ok).toBe(false);
  });
});

describe('an engine that does not report a signal', () => {
  it('reports blocking time as unmeasured, and fails a budget written against it', async () => {
    // WebKit is the real case: `PerformanceObserver.supportedEntryTypes` has no
    // `longtask`, yet `observe({ type: 'longtask' })` resolves and delivers
    // nothing — so a try/catch probe would call it supported and report 0 ms of
    // blocking on a page that blocks for 600. Stubbing the advertised list here
    // reproduces exactly that engine in Chromium, where the difference between
    // the two probes is visible.
    const run = await runScenario({
      boot: 600,
      beforeCollector: `
        Object.defineProperty(PerformanceObserver, 'supportedEntryTypes', {
          get: () => ['event', 'mark', 'measure', 'navigation', 'paint', 'resource'],
        });
      `,
    });

    const boot = phase(run, 'boot');
    expect(boot.blockingMs).toBeNull();
    expect(boot.longestTaskMs).toBeNull();
    expect(boot.notes.join(' ')).toContain('does not report `longtask`');

    // Interaction timing survives: WebKit does report `event` entries.
    expect(phase(run, 'interact').interactionMs).not.toBeNull();

    // The load-bearing assertion. A budget against an unmeasured signal must
    // fail, not pass — otherwise this run reports a 600 ms boot block as green.
    const verdict = evaluateRun(run, {
      budgets: { boot: { blockingMs: 100 } },
    });
    expect(verdict.ok).toBe(false);
    expect(
      verdict.findings.some((f) => f.kind === 'budget-blocking-unmeasured'),
    ).toBe(true);
  });
});

describe('a request nothing mocked', () => {
  it('is flagged as a fixture hole rather than counted as normal traffic', async () => {
    const page = await browser.newPage();
    try {
      const perf = await attachPerfHarvest(page);
      await page.goto(`${server.origin}/`);
      await page.waitForSelector('#status:has-text("ready")');

      await perf.phase('mixed', async () => {
        await page.evaluate(() => fetch('/api/things').then((r) => r.json()));
        await page.evaluate(() => fetch('/api/unmocked').then((r) => r.json()));
      });

      const run = summarizeRun(await perf.collect());
      const mixed = phase(run, 'mixed');
      expect(mixed.requests.byKey).toEqual({
        'GET /api/things': 1,
        'GET /api/unmocked': 1,
      });
      expect(mixed.requests.unmockedKeys).toEqual(['GET /api/unmocked']);

      const verdict = evaluateRun(run, {
        budgets: { mixed: { requireMocked: true } },
      });
      expect(verdict.ok).toBe(false);
      expect(verdict.findings.some((f) => f.kind === 'budget-unmocked')).toBe(
        true,
      );
    } finally {
      await page.close();
    }
  });
});

describe('the collector must be installed before the page it measures', () => {
  it('throws rather than reporting a run of zeros', async () => {
    const page = await browser.newPage();
    try {
      const perf = await attachPerfHarvest(page);
      // No navigation, so `addInitScript` has not run in any document. Reading a
      // run here would produce a perfectly plausible report full of zeros.
      await expect(perf.collect()).rejects.toThrow(
        /in-page collector is not present/,
      );
    } finally {
      await page.close();
    }
  });
});

describe('a phase that spans a navigation', () => {
  it('keeps its request counts and says the page-side numbers are a lower bound', async () => {
    const page = await browser.newPage();
    try {
      const perf = await attachPerfHarvest(page);
      await perf.phase('load then reload', async () => {
        await page.goto(`${server.origin}/?boot=200&click=30&fetches=1`);
        await page.waitForSelector('#status:has-text("ready")');
        await page.click('#go');
        await page.waitForSelector('#status:has-text("done")');
        await page.reload();
        await page.waitForSelector('#status:has-text("ready")');
      });

      const run = summarizeRun(await perf.collect());
      const spanning = phase(run, 'load then reload');

      // The second document's boot block is still measured: entries are stamped
      // with `performance.timeOrigin`, so the new document's clock lines up with
      // the phase boundaries instead of restarting inside them.
      expect(spanning.blockingMs).not.toBeNull();
      expect(spanning.longestTaskMs as number).toBeGreaterThan(150);

      // Requests are recorded outside the page, so the navigation costs nothing.
      expect(spanning.requests.byKey).toEqual({
        'GET /api/things': 1,
        'POST /api/things': 1,
      });

      // And the loss that a navigation does cause is stated, not hidden: the
      // interaction that happened in the first document went away with it.
      expect(spanning.notes.join(' ')).toContain('lower bound');
      expect(spanning.interactionCount).toBe(0);
    } finally {
      await page.close();
    }
  });
});
