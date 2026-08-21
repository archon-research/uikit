/**
 * The smallest amount of state a mock needs to behave like an API rather than a
 * fixture dump: a POST that shows up in the following GET. Deliberately not a
 * database — no queries, no indexes, no relations. A mock that needs those is a
 * mock standing in for logic the real service owns.
 */

export type MockStoreOptions<T> = {
  /**
   * How an item's identity is read. Defaults to its `id` property, which must be
   * a string or a number.
   */
  id?: (item: T) => string;
};

/**
 * Aliasing, since it is observable: `get` and `insert` hand back the **stored**
 * object, so mutating one writes through to the store. `update` replaces it with
 * a merged copy instead, which leaves any reference taken before the update
 * stale. Read again after an update rather than holding a reference across one.
 */
export type MockStore<T> = {
  /** Every item, in insertion order. A fresh array, so callers cannot reorder the store. */
  list: () => T[];
  get: (id: string) => T | undefined;
  has: (id: string) => boolean;
  readonly size: number;
  /** Adds an item. Throws on a duplicate id, which is a fixture bug rather than an API condition. */
  insert: (item: T) => T;
  /**
   * Merges `patch` into an existing item, keeping its position. `undefined`
   * when the id is unknown — a handler turns that into its own 404.
   *
   * A patch may carry the id, which moves the item to it; the old id then
   * misses. Throws if that id is already taken, like `insert`, and leaves the
   * store untouched when it does.
   */
  update: (id: string, patch: Partial<T>) => T | undefined;
  /** `false` when the id is unknown. */
  remove: (id: string) => boolean;
  /** Swaps in a whole collection. Throws if two items share an id, like `insert`. */
  replaceAll: (items: readonly T[]) => void;
  /** Re-seeds from the seed function. Pass this to `setupMocks({ onReset })`. */
  reset: () => void;
};

function defaultIdOf<T>(item: T): string {
  const id = (item as { id?: unknown }).id;

  if (typeof id === 'string') return id;
  if (typeof id === 'number') return String(id);

  throw new Error(
    'http-client-msw: createMockStore items need a string or number `id`, or an explicit `id` selector',
  );
}

/**
 * An in-memory collection whose `reset` restores the seeded contents.
 *
 * The seed is a **function**, called on construction and again on every reset, so
 * a handler that mutates an item in place cannot corrupt the next test's
 * starting point. That holds only if the function *constructs* its items — a
 * seed that returns a shared module-level array hands out the same objects every
 * time, and a mutation to one of those does survive a reset.
 *
 * ```ts
 * const things = createMockStore(seedThings);
 *
 * export const mocks = setupMocks(
 *   [
 *     mock.get('/things', ({ response }) => response(200).json(things.list())),
 *     mock.get('/things/{id}', ({ params, response }) => {
 *       const thing = things.get(params.id);
 *
 *       return thing
 *         ? response(200).json(thing)
 *         : response(404).json({ message: 'not found' });
 *     }),
 *   ],
 *   { onReset: [things.reset] },
 * );
 * ```
 */
export function createMockStore<T>(
  seed: () => readonly T[],
  options: MockStoreOptions<T> = {},
): MockStore<T> {
  const idOf = options.id ?? defaultIdOf;
  const items = new Map<string, T>();

  /**
   * Built into a staging map first, so the duplicate-id check that `insert`
   * enforces also covers construction and every reset — and so a rejected
   * collection leaves the store as it was rather than half-cleared.
   */
  const replaceAll = (next: readonly T[]): void => {
    const replacement = new Map<string, T>();

    for (const item of next) {
      const id = idOf(item);
      if (replacement.has(id)) {
        throw new Error(
          `http-client-msw: createMockStore was given two items with id "${id}"`,
        );
      }
      replacement.set(id, item);
    }

    items.clear();
    for (const [id, item] of replacement) items.set(id, item);
  };

  replaceAll(seed());

  return {
    list: () => [...items.values()],
    get: (id) => items.get(id),
    has: (id) => items.has(id),
    get size() {
      return items.size;
    },
    insert: (item) => {
      const id = idOf(item);
      if (items.has(id)) {
        throw new Error(
          `http-client-msw: createMockStore already holds an item with id "${id}"`,
        );
      }
      items.set(id, item);

      return item;
    },
    update: (id, patch) => {
      const existing = items.get(id);
      if (existing === undefined) return undefined;

      const updated = { ...existing, ...patch };
      // `Partial<T>` admits the id, so the patch can move the item. Re-derived
      // rather than assumed, because leaving it under the old key desyncs the
      // map from the items in it: `get(item.id)` misses and `get(oldId)` hands
      // back an item that no longer claims that id.
      const nextId = idOf(updated);

      if (nextId === id) {
        items.set(id, updated);

        return updated;
      }

      if (items.has(nextId)) {
        throw new Error(
          `http-client-msw: createMockStore already holds an item with id "${nextId}"`,
        );
      }

      // Rebuilt in order rather than delete-then-set, which would move the item
      // to the end: `update` keeps an item's position, and a patched id is
      // still an update. The collision above throws before anything is
      // touched, so a rejected patch leaves the store as it was.
      const entries = [...items];

      items.clear();
      for (const [key, item] of entries) {
        if (key === id) items.set(nextId, updated);
        else items.set(key, item);
      }

      return updated;
    },
    remove: (id) => items.delete(id),
    replaceAll,
    reset: () => replaceAll(seed()),
  };
}
