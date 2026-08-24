import { describe, expect, it, vi } from 'vitest';

import {
  composeMiddleware,
  type QueryApiRequestContext,
} from './middleware.js';

const ctx: QueryApiRequestContext = {
  method: 'get',
  path: '/users',
  operationType: 'query',
  init: undefined,
};

describe('composeMiddleware', () => {
  it('returns the terminal handler unchanged for an empty chain', () => {
    const terminal = vi.fn(async () => 'value');
    expect(composeMiddleware([], terminal)).toBe(terminal);
  });

  it('runs the chain outermost first and unwinds innermost first', async () => {
    const trace: string[] = [];
    const record =
      (name: string) =>
      async (
        current: QueryApiRequestContext,
        next: (ctx?: QueryApiRequestContext) => Promise<unknown>,
      ) => {
        trace.push(`enter:${name}`);
        const value = await next(current);
        trace.push(`exit:${name}`);
        return value;
      };

    const chain = composeMiddleware(
      [record('a'), record('b')],
      async () => 'value',
    );

    await expect(chain(ctx)).resolves.toBe('value');
    expect(trace).toEqual(['enter:a', 'enter:b', 'exit:b', 'exit:a']);
  });

  it('passes the context through unchanged when next() takes no argument', async () => {
    const terminal = vi.fn(async () => 'value');
    const chain = composeMiddleware([(_ctx, next) => next()], terminal);

    await chain(ctx);

    expect(terminal).toHaveBeenCalledWith(ctx);
  });

  it('hands a rewritten context to the rest of the chain', async () => {
    const terminal = vi.fn(async () => 'value');
    const chain = composeMiddleware(
      [(current, next) => next({ ...current, path: '/rewritten' })],
      terminal,
    );

    await chain(ctx);

    expect(terminal).toHaveBeenCalledWith({ ...ctx, path: '/rewritten' });
  });

  it('rejects when a middleware calls next() twice', async () => {
    const terminal = vi.fn(async () => 'value');
    const chain = composeMiddleware(
      [
        async (current, next) => {
          await next(current);
          return await next(current);
        },
      ],
      terminal,
    );

    await expect(chain(ctx)).rejects.toThrow(/next\(\) more than once/);
    expect(terminal).toHaveBeenCalledTimes(1);
  });

  it('lets a middleware short-circuit without reaching the terminal', async () => {
    const terminal = vi.fn(async () => 'value');
    const chain = composeMiddleware([async () => 'cached'], terminal);

    await expect(chain(ctx)).resolves.toBe('cached');
    expect(terminal).not.toHaveBeenCalled();
  });
});
