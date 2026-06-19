# demo-relay — Cloudflare Workers adapter for the WebMCP relay

This directory deploys the WebMCP relay that backs the **MCP Connect** story
in the published preview. It is a thin Cloudflare
Workers + Durable Objects host around the I/O-free
[`@archon-research/mcp-relay`](../../mcp-relay) core.

It exists so the published, static component preview can be driven by a real
MCP harness (Claude Code, Copilot CLI): the demo story registers a few
`ladle.*` tools in the browser, and a harness the user connects to the relay
can call them to search components, select a story, and change the theme.

## How it fits together

```
GitHub Pages (stable origin)            Cloudflare Worker            Harness
https://archon-research.github.io       mcp-relay.*.workers.dev      (claude/copilot)
  MCP Connect story      ── WS ──▶  /ws/sessions/:id  (back-channel)
                                          │
  registers ladle.* tools                 │  invoke / result
                                          │
                          ◀── POST /mcp ──┴────────────────────────  tools/list, tools/call
```

- The browser (the demo story) opens a WebSocket back-channel and registers its
  tool catalogue.
- The harness connects over Streamable HTTP at `/mcp` with a bearer connection
  token; `tools/call` is relayed to the browser and the result returned.
- One `SessionDO` Durable Object per session holds the live socket and the
  session state machine, and persists a snapshot so tools survive Hibernation
  eviction.

## Routes

| Method | Path               | Description                                       |
| ------ | ------------------ | ------------------------------------------------- |
| POST   | `/api/sessions`    | Create a session; returns `CreateSessionResponse` |
| GET    | `/ws/sessions/:id` | WebSocket upgrade for the browser back-channel    |
| POST   | `/mcp`             | Harness Streamable HTTP (bearer auth required)    |

## Files

| File                       | Role                                                       |
| -------------------------- | ---------------------------------------------------------- |
| `worker.ts`                | HTTP/WS entry point; mints tokens, routes, applies CORS    |
| `session-do.ts`            | `SessionDO` Durable Object; live socket + persisted state  |
| `env.ts`                   | Shared `Env` binding type                                  |
| `wrangler.toml`            | Worker name, DO binding/migration, `[vars]`                |
| `vitest.config.ts`         | Workers-runtime test config (Miniflare)                    |
| `relay.integration.test.ts`| End-to-end HTTP + WS + DO tests                            |

## GitHub Pages ↔ Worker wiring (CORS)

The preview is published to GitHub Pages at a **stable origin**
(`https://archon-research.github.io`). Because that origin never changes, the
Worker scopes browser access to it precisely instead of using a wildcard:

- `wrangler.toml` sets `[vars] ALLOWED_ORIGINS = "https://archon-research.github.io"`.
- `worker.ts` echoes the request `Origin` only when it is in the allow-list
  (adding `Vary: Origin`); any other origin gets the canonical origin back, so
  the browser blocks the cross-origin read.
- Auth is a bearer JWT, never cookies, so this is defence-in-depth on top of
  token verification.

For local `wrangler dev`, override the allow-list in `.dev.vars`
(`ALLOWED_ORIGINS=` — empty falls back to `*`).

## Local development

1. Copy `.dev.vars.example` to `.dev.vars` and set a signing secret:

   ```
   WEBMCP_RELAY_JWT_SECRET=$(openssl rand -base64 32)
   ALLOWED_ORIGINS=
   ```

2. Build the core package first:

   ```bash
   npm run build --workspace packages/mcp-relay
   ```

3. Run the Worker (from `packages/uikit-preview/`):

   ```bash
   npx wrangler dev --config demo-relay/wrangler.toml
   ```

   It listens on `http://localhost:8787`.

## Tests

```bash
# From the repo root:
npm test
```

`npm test` runs the full relay test suite in one pass: the I/O-free core unit
tests and the integration tests that drive the host (HTTP + WebSocket + session
storage) end to end. Test-time bindings such as the JWT secret and
`ALLOWED_ORIGINS` are injected via `vitest.config.ts`.

## Deploy

Deploys are automated in CI (see `.github/workflows/deploy-relay.yml`) on push
to `main`, gated on the `CLOUDFLARE_API_TOKEN` repository secret. The secret
JWT signing key is provisioned once:

```bash
# one-time, from packages/uikit-preview/:
npx wrangler secret put WEBMCP_RELAY_JWT_SECRET --config demo-relay/wrangler.toml
```

To deploy manually:

```bash
npx wrangler deploy --config demo-relay/wrangler.toml
```
