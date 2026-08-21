import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createMockApi } from './mock-api.js';
import { type Thing, type TestPaths, seedThings } from './test-fixtures.js';

const mock = createMockApi<TestPaths>();

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('createMockApi', () => {
  it('responds with the operation 2xx body', async () => {
    server.use(
      mock.get('/things', ({ response }) => response(200).json(seedThings())),
    );

    const response = await fetch('http://localhost/things');

    expect(response.status).toBe(200);
    expect((await response.json()) as Thing[]).toEqual(seedThings());
  });

  it('parses the OpenAPI path template into typed path params', async () => {
    server.use(
      mock.get('/things/{id}', ({ params, response }) =>
        response(200).json({
          id: params.id,
          name: `thing-${params.id}`,
          size: 3,
        }),
      ),
    );

    const response = await fetch('http://localhost/things/t7');

    expect(await response.json()).toEqual({
      id: 't7',
      name: 'thing-t7',
      size: 3,
    });
  });

  it('exposes query params through the typed query helper', async () => {
    server.use(
      mock.get('/things', ({ query, response }) => {
        const limit = Number(query.get('limit') ?? '0');

        return response(200).json(seedThings().slice(0, limit));
      }),
    );

    const response = await fetch('http://localhost/things?limit=1');

    expect(await response.json()).toEqual([seedThings()[0]]);
  });

  it('reads a typed request body off a mutating operation', async () => {
    server.use(
      mock.post('/things', async ({ request, response }) => {
        const body = await request.json();

        return response(201).json({ id: 'new', ...body });
      }),
    );

    const response = await fetch('http://localhost/things', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Fresh', size: 9 }),
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      id: 'new',
      name: 'Fresh',
      size: 9,
    });
  });

  it('answers with a declared error status and body', async () => {
    server.use(
      mock.get('/things/{id}', ({ response }) =>
        response(404).json({ message: 'no such thing' }),
      ),
    );

    const response = await fetch('http://localhost/things/missing');

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ message: 'no such thing' });
  });

  it('answers a no-content operation with an empty body', async () => {
    server.use(
      mock.delete('/things/{id}', ({ response }) => response(204).empty()),
    );

    const response = await fetch('http://localhost/things/t1', {
      method: 'DELETE',
    });

    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
  });

  it('prefixes handler paths with a relative baseUrl on any origin', async () => {
    const prefixed = createMockApi<TestPaths>({ baseUrl: '/api' });
    server.use(
      prefixed.get('/things', ({ response }) =>
        response(200).json(seedThings()),
      ),
    );

    for (const origin of ['http://localhost', 'https://elsewhere.test']) {
      const response = await fetch(`${origin}/api/things`);

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(seedThings());
    }
  });

  it('tolerates a trailing slash on baseUrl', async () => {
    const prefixed = createMockApi<TestPaths>({ baseUrl: '/api/' });
    server.use(
      prefixed.get('/things', ({ response }) => response(200).json([])),
    );

    const response = await fetch('http://localhost/api/things');

    expect(response.status).toBe(200);
  });

  it('pins the origin when baseUrl is absolute', async () => {
    const prefixed = createMockApi<TestPaths>({
      baseUrl: 'http://localhost/api',
    });
    server.use(
      prefixed.get('/things', ({ response }) => response(200).json([])),
    );

    expect((await fetch('http://localhost/api/things')).status).toBe(200);
    await expect(fetch('https://elsewhere.test/api/things')).rejects.toThrow();
  });
});
