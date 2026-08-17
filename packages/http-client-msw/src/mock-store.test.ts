import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createMockApi } from './mock-api.js';
import { createMockStore } from './mock-store.js';
import { setupMockServer } from './node.js';
import { setupMocks } from './setup.js';
import { type Thing, type TestPaths, seedThings } from './test-fixtures.js';

describe('createMockStore', () => {
  it('starts from the seed, in insertion order', () => {
    const store = createMockStore(seedThings);

    expect(store.list()).toEqual(seedThings());
    expect(store.size).toBe(2);
  });

  it('reads and writes by id', () => {
    const store = createMockStore(seedThings);

    expect(store.get('t1')?.name).toBe('First');
    expect(store.has('t9')).toBe(false);

    store.insert({ id: 't3', name: 'Third', size: 3 });

    expect(store.size).toBe(3);
    expect(store.list().at(-1)?.id).toBe('t3');
  });

  it('rejects a duplicate id as a fixture bug', () => {
    const store = createMockStore(seedThings);

    expect(() => store.insert({ id: 't1', name: 'Clash', size: 0 })).toThrow(
      /already holds an item with id "t1"/,
    );
  });

  it('reports an unknown id instead of throwing, so a handler can 404', () => {
    const store = createMockStore(seedThings);

    expect(store.update('nope', { name: 'x' })).toBeUndefined();
    expect(store.remove('nope')).toBe(false);
  });

  it('merges a patch and keeps the rest of the item', () => {
    const store = createMockStore(seedThings);

    expect(store.update('t1', { size: 42 })).toEqual({
      id: 't1',
      name: 'First',
      size: 42,
    });
    expect(store.get('t1')?.size).toBe(42);
  });

  it('hands out a fresh array each time, so a caller cannot reorder the store', () => {
    const store = createMockStore(seedThings);
    const list = store.list();
    list.pop();

    expect(store.list()).toHaveLength(2);
    expect(store.list()).not.toBe(store.list());
  });

  it('re-seeds on reset', () => {
    const store = createMockStore(seedThings);

    store.remove('t2');
    store.insert({ id: 't3', name: 'Third', size: 3 });

    store.reset();

    expect(store.list()).toEqual(seedThings());
  });

  it('undoes an in-place mutation when the seed constructs its items', () => {
    const store = createMockStore(seedThings);

    const stored = store.get('t1');
    if (stored) stored.name = 'Overwritten';
    expect(store.get('t1')?.name).toBe('Overwritten');

    store.reset();

    expect(store.get('t1')?.name).toBe('First');
  });

  it('cannot undo one when the seed returns a shared array', () => {
    // The documented limit of the reset guarantee: the store holds the seed's
    // own objects, so a seed that hands back the same ones every call has
    // nothing to restore from.
    const shared = [{ id: 't1', name: 'First', size: 1 }];
    const store = createMockStore(() => shared);

    const stored = store.get('t1');
    if (stored) stored.name = 'Overwritten';
    store.reset();

    expect(store.get('t1')?.name).toBe('Overwritten');
  });

  it('replaces the whole collection', () => {
    const store = createMockStore(seedThings);
    store.replaceAll([{ id: 'only', name: 'Only', size: 1 }]);

    expect(store.list()).toEqual([{ id: 'only', name: 'Only', size: 1 }]);
  });

  it('rejects a duplicate id on replaceAll and on the seed, like insert', () => {
    const store = createMockStore(seedThings);

    expect(() =>
      store.replaceAll([
        { id: 'x', name: 'One', size: 1 },
        { id: 'x', name: 'Two', size: 2 },
      ]),
    ).toThrow(/two items with id "x"/);
    // The rejected collection is not partially applied.
    expect(store.list()).toEqual(seedThings());

    expect(() =>
      createMockStore(() => [
        { id: 'y', name: 'One', size: 1 },
        { id: 'y', name: 'Two', size: 2 },
      ]),
    ).toThrow(/two items with id "y"/);
  });

  it('keeps an item in place when updated, and stales an earlier reference', () => {
    const store = createMockStore(seedThings);
    const before = store.get('t1');

    store.update('t1', { size: 99 });

    expect(store.list().map((thing) => thing.id)).toEqual(['t1', 't2']);
    expect(before?.size).toBe(1);
    expect(store.get('t1')?.size).toBe(99);
  });

  it('takes an explicit id selector for items with no `id`', () => {
    const store = createMockStore<{ slug: string }>(() => [{ slug: 'a' }], {
      id: (item) => item.slug,
    });

    expect(store.get('a')).toEqual({ slug: 'a' });
  });

  it('explains itself when an item has no usable id', () => {
    expect(() =>
      createMockStore<{ name: string }>(() => [{ name: 'x' }]),
    ).toThrow(/need a string or number `id`/);
  });
});

describe('createMockStore — through the reset convention', () => {
  const mock = createMockApi<TestPaths>({ baseUrl: '/api' });
  const things = createMockStore(seedThings);

  const mocks = setupMocks(
    [
      mock.get('/things', ({ response }) => response(200).json(things.list())),
      mock.post('/things', async ({ request, response }) => {
        const created = {
          id: `t${things.size + 1}`,
          ...(await request.json()),
        };

        return response(201).json(things.insert(created));
      }),
      mock.delete('/things/{id}', ({ params, response }) =>
        things.remove(params.id)
          ? response(204).empty()
          : response(404).json({ message: 'not found' }),
      ),
    ],
    { onReset: [things.reset] },
  );

  const mockServer = setupMockServer(mocks);

  beforeAll(() => mockServer.listen());
  afterEach(() => mockServer.reset());
  afterAll(() => mockServer.close());

  const list = async (): Promise<Thing[]> =>
    (await (await fetch('http://localhost/api/things')).json()) as Thing[];

  it('a write is visible to a later read in the same test', async () => {
    const created = await fetch('http://localhost/api/things', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Third', size: 3 }),
    });

    expect(created.status).toBe(201);
    expect(await list()).toHaveLength(3);
  });

  it('and is gone by the next one', async () => {
    expect(await list()).toEqual(seedThings());
  });

  it('a delete is undone too', async () => {
    expect(
      (await fetch('http://localhost/api/things/t1', { method: 'DELETE' }))
        .status,
    ).toBe(204);
    expect(await list()).toHaveLength(1);
  });

  it('leaving the seed intact', async () => {
    expect(await list()).toEqual(seedThings());
  });
});
