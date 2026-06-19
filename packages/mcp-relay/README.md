# @archon-research/mcp-relay

Host-agnostic core for the WebMCP relay protocol.

## What it is

A pure TypeScript library that implements the WebMCP relay wire protocol
types, HS256 JWT helpers (mint + verify), and a `RelaySession` sans-I/O
state machine. It contains zero transport code: no sockets, no timers,
no fetch, no Cloudflare or Node APIs.

Use it as the shared core inside any relay host adapter:
- Cloudflare Durable Objects (see `packages/uikit-preview/demo-relay/`)
- Node.js / Bun servers
- Future WASM targets

## Core vs Host boundary

The host (e.g. a Durable Object) owns:

- Holding the live WebSocket and sending/receiving frames.
- **The async invoke round-trip**: generating a `call_id`, sending the
  `InvokeMessage` over the WS, storing a `{resolve, reject, timer}` entry
  keyed by `call_id`, resolving it when the browser's `result` frame arrives,
  and timing out after `INVOKE_TIMEOUT_MS`.
- Scheduling the liveness TTL sweep (e.g. via a DO alarm or setInterval).

The core (`RelaySession`) owns:

- Protocol framing (building `invoke`, `tool_activity`, `harness_status` frames).
- State tracking (tools catalogue, `harnessAttached`, `lastSeenMs`).
- `onHello` -> accepted/rejected logic.
- `onInitialize` -> flips `harnessAttached`, returns `harness_status` frame.
- `sweep` -> reverts `harnessAttached` on TTL expiry, returns frame or null.

## Exports

```ts
// Wire types (MVP subset: connect + tool-activity)
export type { ToolDefinition, HelloMessage, InvokeMessage, ... }

// JWT helpers (async, Web Crypto)
export { mintConnectionToken, sessionIdFromToken, parseBearer, ... }

// State machine
export { RelaySession, HARNESS_LIVENESS_TTL_MS, INVOKE_TIMEOUT_MS }
```

## Build

```bash
npm run build --workspace packages/mcp-relay
```
