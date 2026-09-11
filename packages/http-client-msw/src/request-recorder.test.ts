import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createRequestRecorder } from './request-recorder.js';

/**
 * Exercised against a real msw server and real `fetch` calls rather than a fake
 * emitter. The recorder's whole claim is that msw's life-cycle events see
 * traffic the obvious instruments miss, and a hand-rolled emitter would assert
 * the recorder's own bookkeeping instead of that claim.
 */
const server = setupServer(
  http.get('https://api.test/positions', () =>
    HttpResponse.json([{ id: 'p1' }]),
  ),
  http.get('https://api.test/positions/:id', ({ params }) =>
    HttpResponse.json({ id: params.id }),
  ),
  http.post('https://api.test/positions', () =>
    HttpResponse.json({ id: 'p2' }),
  ),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('createRequestRecorder', () => {
  it('counts requests per method and path', async () => {
    const requests = createRequestRecorder(server);

    await fetch('https://api.test/positions');
    await fetch('https://api.test/positions');
    await fetch('https://api.test/positions', { method: 'POST' });

    expect(requests.counts()).toEqual({
      'GET /positions': 2,
      'POST /positions': 1,
    });
    expect(requests.count('GET /positions')).toBe(2);
    requests.stop();
  });

  it('keys on the path, not the query string', async () => {
    const requests = createRequestRecorder(server);

    // A second page of the same endpoint is still a request to that endpoint.
    await fetch('https://api.test/positions?limit=10');
    await fetch('https://api.test/positions?limit=25');

    expect(requests.count('GET /positions')).toBe(2);
    // …and the query is still on the record for a caller that needs it.
    expect(requests.all()[1]?.url.searchParams.get('limit')).toBe('25');
    requests.stop();
  });

  it('separates methods, which is what a refetch assertion turns on', async () => {
    const requests = createRequestRecorder(server);

    await fetch('https://api.test/positions', { method: 'POST' });
    await fetch('https://api.test/positions');

    // Resource Timing cannot do this: its entries carry no method.
    expect(requests.count('POST /positions')).toBe(1);
    expect(requests.count('GET /positions')).toBe(1);
    requests.stop();
  });

  it('selects by pattern and by predicate', async () => {
    const requests = createRequestRecorder(server);

    await fetch('https://api.test/positions');
    await fetch('https://api.test/positions/p1');

    expect(requests.count(/^GET \/positions/)).toBe(2);
    expect(
      requests.count((request) => request.url.pathname.endsWith('/p1')),
    ).toBe(1);
    requests.stop();
  });

  it('takes a custom key', async () => {
    const requests = createRequestRecorder(server, {
      key: (request) => new URL(request.url).host,
    });

    await fetch('https://api.test/positions');
    await fetch('https://api.test/positions/p1');

    expect(requests.counts()).toEqual({ 'api.test': 2 });
    requests.stop();
  });

  it('marks requests no handler matched', async () => {
    const requests = createRequestRecorder(server);

    await fetch('https://api.test/positions');
    await fetch('https://nowhere.invalid/gone').catch(() => undefined);

    // The reason this is worth surfacing: a count of zero for an endpoint you
    // never mocked looks exactly like an app that stayed quiet.
    expect(requests.unhandled().map((request) => request.url.pathname)).toEqual(
      ['/gone'],
    );
    expect(
      requests.all().find((r) => r.key === 'GET /positions')?.unhandled,
    ).toBe(false);
    requests.stop();
  });

  it('clears the record without unsubscribing', async () => {
    const requests = createRequestRecorder(server);

    await fetch('https://api.test/positions');
    const before = requests.all();
    requests.reset();

    await fetch('https://api.test/positions/p1');

    expect(requests.counts()).toEqual({ 'GET /positions/p1': 1 });
    // The list handed out before the reset is not retroactively emptied.
    expect(before).toHaveLength(1);
    requests.stop();
  });

  it('stops recording after stop(), keeping what it had', async () => {
    const requests = createRequestRecorder(server);

    await fetch('https://api.test/positions');
    requests.stop();
    await fetch('https://api.test/positions');

    expect(requests.count('GET /positions')).toBe(1);
  });

  it('records nothing fired before it subscribed', async () => {
    // Pins the documented ordering requirement: the recorder counts what it was
    // listening for, so a request made during render is missed if the recorder
    // is built afterwards.
    await fetch('https://api.test/positions');
    const requests = createRequestRecorder(server);

    expect(requests.all()).toEqual([]);
    requests.stop();
  });
});
