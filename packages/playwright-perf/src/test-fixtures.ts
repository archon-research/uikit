import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

/**
 * A synthetic app whose cost is set by query string, so a test can make the page
 * measurably worse and watch the harvest move.
 *
 * It is served over a real origin rather than `page.setContent`, because the
 * request signal depends on a service worker, and a service worker cannot
 * register on `about:blank`.
 *
 * - `boot` — ms of synchronous work during parse: the boot long task.
 * - `click` — ms of synchronous work in the click handler: interaction latency.
 * - `fetches` — how many times the click handler re-reads `/api/things`: the
 *   refetch regression, expressed as a number.
 */
const APP_HTML = `<!doctype html>
<meta charset="utf-8"><title>perf fixture</title>
<body>
<button id="go">Go</button>
<p id="status">idle</p>
<script type="module">
const params = new URLSearchParams(location.search);
const ms = (name, fallback) => Number(params.get(name) ?? fallback);
const block = (duration) => { const start = performance.now(); while (performance.now() - start < duration) {} };

block(ms('boot', 120));

await navigator.serviceWorker.register('/sw.js');
await navigator.serviceWorker.ready;

const clickCost = ms('click', 30);
const fetches = ms('fetches', 1);
document.getElementById('go').addEventListener('click', async () => {
  block(clickCost);
  for (let i = 0; i < fetches; i++) await fetch('/api/things');
  await fetch('/api/things', { method: 'POST', body: '{}' });
  document.getElementById('status').textContent = 'done';
});
document.getElementById('status').textContent = 'ready';
</script>
</body>`;

const SERVICE_WORKER = `
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (!url.pathname.startsWith('/api/')) return;
  if (url.pathname === '/api/unmocked') return;
  event.respondWith(new Response(JSON.stringify({ ok: true }), {
    headers: { 'content-type': 'application/json' },
  }));
});
`;

export type FixtureServer = { origin: string; close: () => Promise<void> };

/** Serves the fixture app, its worker, and a real endpoint the worker skips. */
export async function startFixtureServer(): Promise<FixtureServer> {
  const server: Server = createServer((request, response) => {
    const pathname = (request.url ?? '/').split('?')[0];
    if (pathname === '/sw.js') {
      response.setHeader('content-type', 'text/javascript');
      response.end(SERVICE_WORKER);
      return;
    }
    if (pathname?.startsWith('/api/')) {
      response.setHeader('content-type', 'application/json');
      response.end('{"from":"network"}');
      return;
    }
    response.setHeader('content-type', 'text/html');
    response.end(APP_HTML);
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;

  return {
    origin: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}
