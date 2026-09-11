/**
 * The half of the harvest that runs inside the page.
 *
 * It is a string, not a function, on purpose. Playwright's `addInitScript`
 * accepts either, but a function is serialised by `toString()` and evaluated in
 * a context where none of this module's imports, helpers or TypeScript
 * down-levelling exist — so anything the compiler inserts (a helper for `??`, a
 * `const` captured from the enclosing scope) breaks at runtime in the browser
 * rather than at build time here. A string keeps the boundary visible: what is
 * written is exactly what runs.
 *
 * ── The support probe is `supportedEntryTypes`, not try/catch ──
 *
 * The obvious probe — wrap `observer.observe({ type })` in a try/catch and call
 * a non-throwing call "supported" — is wrong, and wrong in the direction that
 * matters. Measured across engines:
 *
 * | Engine   | `supportedEntryTypes` has `longtask` | `observe({type:'longtask'})` |
 * | -------- | ------------------------------------ | ---------------------------- |
 * | Chromium | yes                                  | resolves, delivers entries   |
 * | WebKit   | **no**                               | **resolves, delivers none**  |
 *
 * Under WebKit a try/catch probe reports `longtask: supported` and the phase
 * reports zero long tasks — indistinguishable from a page with no jank at all.
 * A perf harness whose failure mode is "looks fast" is worse than no harness, so
 * support is read from `PerformanceObserver.supportedEntryTypes`, an entry type
 * absent from it is never observed, and every number it would have produced is
 * reported as `null` (unmeasured) rather than `0`.
 *
 * `event` is in `supportedEntryTypes` on both engines and carries real
 * `interactionId`s on both, so interaction latency survives a cross-engine run
 * even where blocking time does not.
 *
 * ── Every timestamp is absolute ──
 *
 * `entry.startTime` is relative to the document's time origin, and a navigation
 * starts a new document with a new origin — so a phase that opened before a
 * `reload()` and closed after it has two incompatible clocks in it. The first
 * version of this file paired phase boundaries taken inside the page, and every
 * phase containing a navigation came back empty, which is exactly the silent
 * nothing this package exists to prevent.
 *
 * `performance.timeOrigin` is epoch milliseconds, so `startTime + timeOrigin` is
 * an absolute instant comparable with `Date.now()` in the driving process. Every
 * entry is stamped that way as it arrives, phase boundaries are taken in the
 * driving process only, and navigation stops being a special case.
 *
 * What a navigation does still cost is the *previous* document's entries: they
 * live on that document's `window` and go away with it. That is unavoidable
 * without a persistent side channel, so instead it is made visible — a
 * `sessionStorage` counter survives same-origin navigation and lets the summary
 * say which phases began before the surviving document did.
 */

/** Name of the collector's namespace on `window`. */
export const PERF_GLOBAL = '__uikitPlaywrightPerf';

/** A `longtask` entry. `at` is absolute epoch milliseconds. */
export type RawLongTask = { at: number; duration: number };

/** An `event` timing entry belonging to a real interaction. */
export type RawInteractionEvent = {
  /** DOM event name: `click`, `keydown`, `pointerup`. */
  name: string;
  /** Groups the events of one interaction. Never `0` here — those are dropped. */
  interactionId: number;
  /** Absolute epoch milliseconds. */
  at: number;
  duration: number;
  /** `id`, else tag name, of the event target; `null` once it has detached. */
  target: string | null;
};

/** Everything the page hands back in a single `evaluate`. */
export type PerfSample = {
  /**
   * Per entry type, whether this engine reports it at all. A `false` here is the
   * difference between "measured zero" and "did not measure".
   */
  supported: { longtask: boolean; event: boolean };
  /** Entry types the engine advertises, verbatim — the evidence for the above. */
  supportedEntryTypes: readonly string[];
  /** Epoch milliseconds at which the surviving document's clock started. */
  timeOrigin: number;
  /**
   * How many documents the collector has run in on this origin, from
   * `sessionStorage`. Greater than one means earlier documents' entries were
   * discarded with their `window`.
   */
  documents: number;
  longTasks: readonly RawLongTask[];
  interactionEvents: readonly RawInteractionEvent[];
};

/**
 * The script installed before any application code runs.
 *
 * Written against `window` with no bundler assistance: see the note above.
 */
export const COLLECTOR_SCRIPT = `(() => {
  var KEY = ${JSON.stringify(PERF_GLOBAL)};
  if (window[KEY]) return;

  var origin = performance.timeOrigin;
  var types = (window.PerformanceObserver && PerformanceObserver.supportedEntryTypes) || [];
  var has = function (type) { return Array.prototype.indexOf.call(types, type) !== -1; };

  // sessionStorage rather than a window property: it is what survives the
  // navigation whose cost this is counting. An origin that denies it (a sandbox,
  // a privacy mode) falls back to 1, which under-reports rather than throws
  // inside the app's first script.
  var documents = 1;
  try {
    documents = Number(sessionStorage.getItem(KEY) || '0') + 1;
    sessionStorage.setItem(KEY, String(documents));
  } catch (error) { documents = 1; }

  var state = {
    supported: { longtask: has('longtask'), event: has('event') },
    supportedEntryTypes: Array.prototype.slice.call(types),
    timeOrigin: origin,
    documents: documents,
    longTasks: [],
    interactionEvents: [],
  };
  window[KEY] = state;

  if (state.supported.longtask) {
    new PerformanceObserver(function (list) {
      var entries = list.getEntries();
      for (var i = 0; i < entries.length; i++) {
        state.longTasks.push({ at: entries[i].startTime + origin, duration: entries[i].duration });
      }
    }).observe({ type: 'longtask', buffered: true });
  }

  if (state.supported.event) {
    new PerformanceObserver(function (list) {
      var entries = list.getEntries();
      for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        // interactionId 0 means "not part of an interaction" (a scroll-driven
        // pointermove, a programmatic dispatch). Keeping those would inflate the
        // interaction count with events no user ever waited on.
        if (!entry.interactionId) continue;
        var target = null;
        try {
          if (entry.target) target = entry.target.id || entry.target.tagName || null;
        } catch (error) { target = null; }
        state.interactionEvents.push({
          name: entry.name,
          interactionId: entry.interactionId,
          at: entry.startTime + origin,
          duration: entry.duration,
          target: target,
        });
      }
      // 16 ms rather than the spec default of 104: an interaction that misses a
      // single frame is already worth seeing, and the default would hide every
      // regression that has not yet grown past a tenth of a second.
    }).observe({ type: 'event', buffered: true, durationThreshold: 16 });
  }
})();`;

/** Expression evaluated in the page to read everything back. */
export const READ_SCRIPT = `window[${JSON.stringify(PERF_GLOBAL)}] || null`;

/**
 * Expression that waits for the observers to stop delivering, then resolves.
 *
 * Reading the collector the instant a phase ends loses entries, and loses them
 * in the worst possible way: `event` timing entries are queued only once the
 * frame that followed the handler has been *presented*, so a click whose handler
 * blocked for 400 ms produced an empty interaction list while the long-task list
 * beside it was correct. The report looked like an app with heavy boot work and
 * perfectly snappy interactions — a plausible, entirely wrong story.
 *
 * Waiting a fixed time would trade that for flakiness on a slow machine. This
 * instead waits until the entry count has been unchanged for three animation
 * frames, capped so a hidden page (where `requestAnimationFrame` never fires)
 * resolves anyway rather than hanging the run.
 */
export const FLUSH_SCRIPT = `new Promise((resolve) => {
  var state = window[${JSON.stringify(PERF_GLOBAL)}];
  if (!state) { resolve(false); return; }

  var settled = false;
  var finish = function () { if (!settled) { settled = true; resolve(true); } };
  setTimeout(finish, 1000);

  var last = -1;
  var stable = 0;
  var tick = function () {
    if (settled) return;
    var count = state.longTasks.length + state.interactionEvents.length;
    if (count === last) stable += 1; else { stable = 0; last = count; }
    if (stable >= 3) { finish(); return; }
    requestAnimationFrame(function () { setTimeout(tick, 0); });
  };
  tick();
})`;
