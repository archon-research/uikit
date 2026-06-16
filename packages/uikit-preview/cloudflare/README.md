# WebMCP Relay - Cloudflare Workers adapter

Cloudflare Workers + Durable Objects adapter for the `@archon-research/mcp-relay`
core package. Intended for a future live-preview demo.

**Scope: local development and local verification only.**
Production deploy and wiring into the published Ladle preview are deferred.

## Local dev

### Prerequisites

1. Copy `.dev.vars.example` to `.dev.vars` and set the secret:

   ```
   WEBMCP_RELAY_JWT_SECRET=<your-32-char-random-secret>
   ```

   Generate one: `openssl rand -base64 32`

2. Install deps from the repo root:

   ```bash
   npm install
   ```

3. Build the core package first:
   ```bash
   npm run build --workspace packages/mcp-relay
   ```

### Run the relay

From `packages/uikit-preview/`:

```bash
npx wrangler dev --config cloudflare/wrangler.toml
```

The worker listens on `http://localhost:8787` by default.

### Wire up Claude Code (local test)

1. Start the relay: `wrangler dev --config cloudflare/wrangler.toml`
2. `POST http://localhost:8787/api/sessions` to get a `connection_token`.
3. In Claude Code's MCP config, set:
   ```json
   {
     "mcpServers": {
       "relay": {
         "url": "http://localhost:8787/mcp",
         "headers": { "Authorization": "Bearer <connection_token>" }
       }
     }
   }
   ```
4. Open the Explorer panel in the browser (if running alongside it) and it will
   connect to `ws://localhost:8787/ws/sessions/<session_id>`.

## Routes

| Method | Path               | Description                                       |
| ------ | ------------------ | ------------------------------------------------- |
| POST   | `/api/sessions`    | Create a session; returns `CreateSessionResponse` |
| GET    | `/ws/sessions/:id` | WebSocket upgrade for the browser back-channel    |
| POST   | `/mcp`             | Harness Streamable HTTP (bearer auth required)    |

## Architecture

```
Worker (worker.ts)
  POST /api/sessions  -- mints connection JWT via mcp-relay/tokens
  GET  /ws/sessions/:id  -- forwards to SessionDO
  POST /mcp           -- verifies JWT, forwards to SessionDO

SessionDO (session-do.ts)
  Holds RelaySession (core state machine, zero I/O)
  Holds live WebSocket (CF Hibernation API)
  Owns pending-call map (call_id -> {resolve, reject, timer})
  alarm() -- runs TTL sweep every 30 s
```

## Running tests

```bash
# From packages/uikit-preview/:
npx vitest run --config cloudflare/vitest.config.ts
```

Tests run inside the Workers runtime via `@cloudflare/vitest-pool-workers` (Miniflare).
The JWT secret is injected as `test-secret-for-vitest-only` via `miniflare.bindings` in
`vitest.config.ts`.

## Deferred

- Production deploy (`wrangler deploy`)
- Wiring into the published Ladle/uikit-preview build
- Rate limiting, session expiry GC, connection-token refresh endpoint
