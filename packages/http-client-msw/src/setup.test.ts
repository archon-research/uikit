import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { createMockApi } from './mock-api.js';
import { setupMockServer } from './node.js';
import { setupMocks } from './setup.js';
import { type Thing, type TestPaths, seedThings } from './test-fixtures.js';

const mock = createMockApi<TestPaths>({ baseUrl: '/api' });

describe('setupMocks', () => {
  it('runs reset callbacks in declaration order', () => {
    const calls: string[] = [];
    const mocks = setupMocks([], {
      onReset: [() => calls.push('first'), () => calls.push('second')],
    });

    mocks.resetState();
    mocks.resetState();

    expect(calls).toEqual(['first', 'second', 'first', 'second']);
  });

  it('is inert without reset callbacks', () => {
    const handler = mock.get('/things', ({ response }) =>
      response(200).json([]),
    );

    expect(() => setupMocks([handler]).resetState()).not.toThrow();
  });
});

describe('setupMockServer', () => {
  /** Mutable state a handler writes to, standing in for a mock store. */
  let things: Thing[] = seedThings();
  const mocks = setupMocks(
    [
      mock.get('/things', ({ response }) => response(200).json(things)),
      mock.post('/things', async ({ request, response }) => {
        const created = {
          id: `t${things.length + 1}`,
          ...(await request.json()),
        };
        things = [...things, created];

        return response(201).json(created);
      }),
    ],
    { onReset: [() => (things = seedThings())] },
  );

  const mockServer = setupMockServer(mocks);

  beforeAll(() => mockServer.listen());
  afterAll(() => mockServer.close());

  const list = async (): Promise<Thing[]> =>
    (await (await fetch('http://localhost/api/things')).json()) as Thing[];

  it('serves the setup handlers', async () => {
    expect(await list()).toEqual(seedThings());
  });

  it('reset() clears state written by a previous test', async () => {
    await fetch('http://localhost/api/things', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Third', size: 3 }),
    });
    expect(await list()).toHaveLength(3);

    mockServer.reset();

    expect(await list()).toEqual(seedThings());
  });

  it('reset() also drops runtime handler overrides', async () => {
    mockServer.server.use(
      mock.get('/things', ({ response }) =>
        response(500).json({ message: 'x' }),
      ),
    );
    expect((await fetch('http://localhost/api/things')).status).toBe(500);

    mockServer.reset();

    expect((await fetch('http://localhost/api/things')).status).toBe(200);
  });

  it('errors on an unhandled request by default', async () => {
    await expect(fetch('http://localhost/api/unmocked')).rejects.toThrow();
  });

  it('takes a listen override for the unhandled-request strategy', () => {
    const listen = vi.fn();
    const overridden = setupMockServer(mocks);
    overridden.server.listen = listen;

    overridden.listen({ onUnhandledRequest: 'bypass' });

    expect(listen).toHaveBeenCalledWith({ onUnhandledRequest: 'bypass' });
  });
});
