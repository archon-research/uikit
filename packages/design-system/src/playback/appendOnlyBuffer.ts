/**
 * An append-only buffer that grows IN PLACE but hands out immutable snapshots
 * in O(1).
 *
 * This exists to satisfy two requirements that pull in opposite directions:
 *
 * 1. **Appending must be O(batch).** `usePlayback`'s live path accumulates
 *    every event since mount. Rebuilding the array per flush
 *    (`next = [...previous, ...batch]`) re-copies EVERY accumulated event on
 *    EVERY flush — O(all events so far), forever. A long-running feed reaches
 *    hundreds of thousands of events with a batch arriving every few seconds,
 *    so that per-flush re-copy grows without bound and shows up as sustained
 *    GC pressure. Growing one array in place keeps a flush O(batch).
 *
 * 2. **What React sees must change identity exactly when the contents change.**
 *    Every memoization React does — `useMemo(..., [events])`, `memo()`,
 *    and the dependency arrays the React Compiler INFERS on a consumer's
 *    behalf — is keyed on identity. An array that grows in place keeps one
 *    identity forever, so a compiled consumer's derived value silently freezes
 *    at its first value while the feed keeps moving.
 *
 * `snapshot()` reconciles them. It returns a read-only view over the growing
 * array, pinned to the length at the moment it was taken: creating one is O(1)
 * (no copy, requirement 1), and each append produces a fresh identity
 * (requirement 2). Because the length is pinned, an older snapshot keeps
 * showing the prefix it was taken over even after later appends — so it is a
 * real immutable value, not a live window that can tear mid-render.
 *
 * The view is a `Proxy` over the backing array, so `Array.isArray` is true and
 * indexing, `length`, iteration, spread, `map`/`filter`/`slice` and
 * `JSON.stringify` all behave exactly as they would on a plain array. Two
 * deliberate differences: writing through it (`push`, `sort`, `reverse`,
 * `events[0] = x`) throws a `TypeError` in strict mode rather than corrupting
 * the shared backing array, and it cannot be `structuredClone`d or
 * `postMessage`d directly (clone a copy: `structuredClone([...events])`).
 *
 * ---
 *
 * THE COST, MEASURED. Taking a snapshot is O(1), but every element read then
 * goes through a proxy trap, which is 10-19x slower than a plain array index.
 * Node 24 / V8, median of 7 runs, ms per operation:
 *
 *     pattern                 entries    plain   snapshot   delta
 *     slice(-8).reverse()          1k   0.0000     0.0007   +0.0007
 *     slice(-8).reverse()        100k   0.0000     0.0007   +0.0007
 *     slice(-8).reverse()        500k   0.0000     0.0007   +0.0007
 *     full map                     1k   0.0049     0.0491   +0.044
 *     full map                   100k   0.5706     5.5738   +5.0
 *     full map                   500k   2.8035    28.3701   +25.6
 *     for...of                   500k   2.2654    28.6367   +26.4
 *     index loop                 500k   3.1085    46.6395   +43.5
 *
 * The ratio is stable but the absolute cost is what decides this, and it splits
 * cleanly by access pattern:
 *
 * - A WINDOWED read costs 0.7us at every size, because `slice(-8)` reads eight
 *   elements and `length` no matter how much is buffered. This is free, and it
 *   is what a consumer rendering a live feed actually does (see
 *   `playback-bar.stories.tsx`, which does `events.slice(-8).reverse()`).
 * - A FULL unwindowed scan costs +5ms at 100k and +26ms at 500k — past one
 *   frame. Note that rendering 500k rows is already unusable for reasons that
 *   have nothing to do with this proxy; the case that genuinely regresses is a
 *   non-rendering full scan, e.g. a summary stat recomputed per flush.
 *
 * There is no copy-out escape hatch: `Array.from(snapshot)` costs 35.7ms at
 * 500k, WORSE than scanning the snapshot directly, because the copy itself
 * pays the trap on every element. A consumer needing a per-flush aggregate
 * over a large buffer should accumulate it incrementally in `onEvent` (O(batch))
 * rather than rescanning the whole history (O(n), either way).
 *
 * The trade is still right, because the rejected alternative — a fresh plain
 * array per flush — charges O(n) on EVERY flush whether or not the consumer
 * ever scans: 0.644ms per flush at 500k, plus the GC pressure, against 0.001ms
 * for append + snapshot. That cost is unconditional and recurring; the proxy's
 * is paid only by a consumer that actually reads every element, and a windowed
 * consumer pays neither.
 */

/**
 * Append `items` to `target` IN PLACE, preserving order. Deliberately a plain
 * loop, not `target.push(...items)`: spread passes `items` as function
 * ARGUMENTS, and engines cap the argument count (V8 at ~65k) — a live
 * source's initial catch-up fan-in can arrive as ONE batch far larger than
 * that, and the resulting RangeError would drop the whole batch. Exported for
 * tests.
 */
export function appendInPlace<T>(target: T[], items: readonly T[]): void {
  for (const item of items) target.push(item);
}

/** The non-negative integer index `property` names, or `null` if it names something else. */
function asIndex(property: string | symbol): number | null {
  if (typeof property !== 'string') return null;
  const index = Number(property);
  return Number.isInteger(index) && index >= 0 ? index : null;
}

/**
 * A read-only array view over the first `length` entries of `backing`. O(1) to
 * create regardless of `length`, and unaffected by later appends to `backing`.
 */
function createPrefixView<T>(backing: T[], length: number): T[] {
  return new Proxy(backing, {
    get(target, property, receiver) {
      if (property === 'length') return length;
      const index = asIndex(property);
      if (index !== null) return index < length ? target[index] : undefined;
      return Reflect.get(target, property, receiver);
    },
    has(target, property) {
      const index = asIndex(property);
      if (index !== null) return index < length;
      return Reflect.has(target, property);
    },
    getOwnPropertyDescriptor(target, property) {
      if (property === 'length') {
        // `length` is a non-configurable own property of an array, so the
        // descriptor must keep that shape or the proxy invariant check throws.
        return {
          value: length,
          writable: true,
          enumerable: false,
          configurable: false,
        };
      }
      const index = asIndex(property);
      if (index !== null && index >= length) return undefined;
      return Reflect.getOwnPropertyDescriptor(target, property);
    },
    ownKeys() {
      // Index properties are configurable and the target stays extensible, so
      // omitting the ones past `length` is a legal trap result.
      const keys: string[] = [];
      for (let index = 0; index < length; index += 1) keys.push(String(index));
      keys.push('length');
      return keys;
    },
    // Read-only: a snapshot that could be written through would either corrupt
    // the shared backing array or, via `length`, truncate it.
    set: () => false,
    defineProperty: () => false,
    deleteProperty: () => false,
  });
}

export type AppendOnlyBuffer<T> = {
  /** Append a batch in place. O(batch), independent of how much is already buffered. */
  append(items: readonly T[]): void;
  /**
   * An immutable view of everything appended so far, oldest first. O(1).
   * Returns a FRESH identity after any append, and the SAME identity when
   * nothing has been appended since the previous call — so the result is a
   * sound React memoization key in both directions.
   */
  snapshot(): T[];
};

export function createAppendOnlyBuffer<T>(): AppendOnlyBuffer<T> {
  const items: T[] = [];
  let cached = createPrefixView(items, 0);
  let cachedLength = 0;

  return {
    append(batch) {
      appendInPlace(items, batch);
    },
    snapshot() {
      if (cachedLength !== items.length) {
        cached = createPrefixView(items, items.length);
        cachedLength = items.length;
      }
      return cached;
    },
  };
}
