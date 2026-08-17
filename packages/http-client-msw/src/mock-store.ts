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

export type MockStore<T> = {
  /** Every item, in insertion order. A fresh array, so callers cannot reorder the store. */
  list: () => T[];
  get: (id: string) => T | undefined;
  has: (id: string) => boolean;
  readonly size: number;
  /** Adds an item. Throws on a duplicate id, which is a fixture bug rather than an API condition. */
  insert: (item: T) => T;
  /** Merges `patch` into an existing item. `undefined` when the id is unknown — a handler turns that into its own 404. */
  update: (id: string, patch: Partial<T>) => T | undefined;
  /** `false` when the id is unknown. */
  remove: (id: string) => boolean;
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
 * starting point.
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

  const replaceAll = (next: readonly T[]): void => {
    items.clear();
    for (const item of next) items.set(idOf(item), item);
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
      items.set(id, updated);

      return updated;
    },
    remove: (id) => items.delete(id),
    replaceAll,
    reset: () => replaceAll(seed()),
  };
}
