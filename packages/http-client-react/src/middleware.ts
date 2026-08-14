/** Which half of the API a request came from. */
export type QueryApiOperationType = 'query' | 'mutation';

/**
 * What a middleware sees. `init` is the init as it will be handed to
 * `openapi-fetch` — the caller's init plus the abort `signal` react-query
 * supplies — not the sanitized cache-key form.
 */
export type QueryApiRequestContext = {
  /** Lowercase OpenAPI method (`get`, `post`, …). */
  readonly method: string;
  /** The OpenAPI path template, braces intact (`/users/{id}`). */
  readonly path: string;
  readonly operationType: QueryApiOperationType;
  readonly init: Record<string, unknown> | undefined;
};

/**
 * Invokes the rest of the chain. Called with no argument to pass the context
 * through unchanged, or with a replacement to rewrite the request downstream.
 */
export type QueryApiNext = (ctx?: QueryApiRequestContext) => Promise<unknown>;

/**
 * Onion-style middleware over the *parsed result* of a request, not over
 * `Request`/`Response`. That is the layer response validation, logging, and
 * retry shims want; `openapi-fetch`'s own `use()` middleware remains available
 * on the client for anything that needs the raw HTTP objects.
 */
export type QueryApiMiddleware = (
  ctx: QueryApiRequestContext,
  next: QueryApiNext,
) => Promise<unknown>;

type TerminalHandler = (ctx: QueryApiRequestContext) => Promise<unknown>;

/**
 * Folds `middleware` around `terminal`, outermost first: given `[a, b]`, `a`
 * runs before `b` on the way in and after `b` on the way out.
 *
 * Each composed handler is single-use per invocation — calling `next()` twice
 * from one middleware rejects rather than issuing the request twice.
 */
export function composeMiddleware(
  middleware: readonly QueryApiMiddleware[],
  terminal: TerminalHandler,
): TerminalHandler {
  if (middleware.length === 0) return terminal;

  return (ctx) => {
    let called = -1;

    const dispatch = (
      index: number,
      current: QueryApiRequestContext,
    ): Promise<unknown> => {
      if (index <= called) {
        return Promise.reject(
          new Error(
            'http-client-react: middleware called next() more than once',
          ),
        );
      }
      called = index;

      const handler = middleware[index];
      if (!handler) return terminal(current);

      return handler(current, (nextCtx) =>
        dispatch(index + 1, nextCtx ?? current),
      );
    };

    return dispatch(0, ctx);
  };
}
