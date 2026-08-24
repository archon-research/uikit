import type { RequestHandler, WebSocketHandler } from 'msw';

/**
 * Anything msw accepts as a handler. Typed handlers from `createMockApi` are
 * `RequestHandler`s; the union leaves room for a websocket mock in the same
 * array without a second setup path.
 */
export type MockSetupHandler = RequestHandler | WebSocketHandler;

/**
 * A callback that returns mock state to its seeded starting point. Stores built
 * with `createMockStore` expose exactly this as `store.reset`.
 */
export type MockResetCallback = () => void;

export type MockSetupOptions = {
  /**
   * Callbacks that restore mock state, run **in declaration order** by `reset()`
   * on whichever entry serves these handlers. This is how a stateful mock stops
   * leaking writes from one test into the next: the handlers close over a store,
   * and the store's `reset` is declared here once rather than at every call site.
   *
   * Order matters when one reset feeds another. A store whose seed function draws
   * from a seeded rng must be listed *after* that rng, or each reset re-seeds
   * from wherever the previous one left the sequence.
   */
  onReset?: readonly MockResetCallback[];
};

/**
 * An environment-neutral description of a mock deployment: the handler array
 * plus the state resets that belong with it. It holds no msw setup object of its
 * own, which is what lets the same value be handed to the browser entry
 * (`setupWorker`) or the node entry (`setupServer`) without either environment's
 * msw import reaching the other's bundle.
 */
export type MockSetup = {
  handlers: readonly MockSetupHandler[];
  /** Runs every `onReset` callback in declaration order. */
  resetState: () => void;
};

/**
 * Bundles handlers with their state resets.
 *
 * ```ts
 * const rng = createSeededRng(42);
 * const things = createMockStore(() => [
 *   { id: 't1', name: 'First', size: rng.int(1, 100) },
 * ]);
 *
 * export const mocks = setupMocks(
 *   [mock.get('/things', ({ response }) => response(200).json(things.list()))],
 *   // The rng first: the store's seed draws from it.
 *   { onReset: [rng.reset, things.reset] },
 * );
 * ```
 */
export function setupMocks(
  handlers: readonly MockSetupHandler[],
  options: MockSetupOptions = {},
): MockSetup {
  const onReset = options.onReset ?? [];

  return {
    handlers,
    resetState: () => {
      for (const reset of onReset) reset();
    },
  };
}
