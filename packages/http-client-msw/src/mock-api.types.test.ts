import { describe, expectTypeOf, it } from 'vitest';

import {
  createMockApi,
  type MockPathsFor,
  type MockRequestBodyFor,
  type MockResponseBodyFor,
} from './mock-api.js';
import type { ApiFault, TestPaths, Thing } from './test-fixtures.js';

/**
 * Type-level coverage of the guarantee the package exists for: a handler's path,
 * params, request body, status codes, and response bodies all come off the
 * generated `TPaths`, so a fixture cannot drift from the contract while still
 * compiling.
 *
 * `expectTypeOf` and `@ts-expect-error` are checked by `npm run type:check`, so
 * the assertions live in a function that is never called. The `it` block below
 * only keeps vitest from reporting the file as empty.
 */

const mock = createMockApi<TestPaths>();

describe('createMockApi — inference', () => {
  it('is asserted by tsc, not at runtime', () => {
    expectTypeOf(mock.get).toBeFunction();
    expectTypeOf(mock.untyped).toBeObject();
  });
});

export function typeAssertions(): void {
  // Only paths that declare the method are offered per factory.
  expectTypeOf<MockPathsFor<typeof mock.get>>().toEqualTypeOf<
    '/things' | '/things/{id}'
  >();
  expectTypeOf<MockPathsFor<typeof mock.post>>().toEqualTypeOf<'/things'>();
  expectTypeOf<
    MockPathsFor<typeof mock.delete>
  >().toEqualTypeOf<'/things/{id}'>();

  // Bodies are read off the operation, not restated by the fixture.
  expectTypeOf<MockResponseBodyFor<typeof mock.get, '/things'>>().toEqualTypeOf<
    Thing[] | ApiFault
  >();
  expectTypeOf<
    MockRequestBodyFor<typeof mock.post, '/things'>
  >().toEqualTypeOf<{
    name: string;
    size: number;
  }>();

  mock.get('/things/{id}', ({ params, query, request, response }) => {
    // Path params are stringified from the operation's `parameters.path`.
    expectTypeOf(params).toEqualTypeOf<{ id: string }>();
    // Query params are typed per name; an optional one may be absent.
    expectTypeOf(query.get('expand')).toEqualTypeOf<string | null>();
    expectTypeOf(request.url).toBeString();

    return response(200).json({ id: params.id, name: 'Thing', size: 1 });
  });

  mock.get('/things', ({ query, response }) => {
    // An array-valued query param stringifies to its element type.
    expectTypeOf(query.getAll('tag')).toEqualTypeOf<string[]>();
    expectTypeOf(query.get('limit')).toEqualTypeOf<string | null>();

    return response(200).json([]);
  });

  mock.post('/things', async ({ request, response }) => {
    expectTypeOf(await request.json()).toEqualTypeOf<{
      name: string;
      size: number;
    }>();

    return response(201).json({ id: 'new', name: 'New', size: 1 });
  });

  // A declared error status takes that status's own body shape.
  mock.get('/things/{id}', ({ response }) =>
    response(404).json({ message: 'gone' }),
  );

  // A no-content response takes no body at all.
  mock.delete('/things/{id}', ({ response }) => response(204).empty());

  // @ts-expect-error — the path is not in TestPaths
  mock.get('/unknown', ({ response }) => response(200).json([]));

  // @ts-expect-error — /things has no DELETE operation
  mock.delete('/things', ({ response }) => response(204).empty());

  mock.get('/things/{id}', ({ response }) =>
    // @ts-expect-error — `size` is required by Thing and `name` must be a string
    response(200).json({ id: 'x', name: 7 }),
  );

  mock.get('/things', ({ response }) =>
    // @ts-expect-error — the 200 response is a list of Thing, not a bare Thing
    response(200).json({ id: 'x', name: 'Thing', size: 1 }),
  );

  // @ts-expect-error — 418 is not one of the operation's declared responses
  mock.get('/things', ({ response }) => response(418).json({ message: 'no' }));

  mock.get('/things', ({ query, response }) => {
    // @ts-expect-error — 'unknown' is not a declared query param
    query.get('unknown');

    return response(500).json({ message: 'boom' });
  });
}
