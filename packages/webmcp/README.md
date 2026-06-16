# @archon-research/webmcp

A stable React wrapper over [WebMCP](https://github.com/webmcp-org) (`@mcp-b/react-webmcp`) for registering UI tools that a connected agent harness can call. It exposes a fixed interface so the fast-moving `@mcp-b/*` packages can churn behind a single seam.

Tools are registered into `document.modelContext`. A tool registered here runs in the consumer's own authenticated browser session, so it reuses the app's existing auth and APIs rather than requiring separate server credentials.

## Installation

```bash
npm install @archon-research/webmcp react
```

`react` is a peer dependency (>= 19).

## Features

- Schema-first tool definitions (`defineTool`)
- StrictMode-safe registration that mounts/unmounts cleanly
- A React provider that initializes the WebMCP polyfill and a tool registry
- Hooks to register tools, observe the registry, and contribute view state
- Wire-protocol types shared with the relay back-channel

## Usage

### Wrap your app

```tsx
import { WebMCPProvider } from '@archon-research/webmcp';

export function App() {
  return (
    <WebMCPProvider>
      <YourApp />
    </WebMCPProvider>
  );
}
```

### Define and register a tool

```tsx
import { defineTool, useRegisterTool } from '@archon-research/webmcp';

const selectIdentityTool = defineTool<{ identityId: string }, { selected: string }>({
  name: 'explorer.selectIdentity',
  description: 'Select and focus an identity node in the Explorer.',
  schema: {
    type: 'object',
    properties: { identityId: { type: 'string' } },
    required: ['identityId'],
  },
  handler: async () => {
    throw new Error('handler injected at registration');
  },
});

function IdentityView({ onSelect }: { onSelect: (id: string) => void }) {
  useRegisterTool(selectIdentityTool, {
    handler: async ({ identityId }) => {
      onSelect(identityId);
      return { selected: identityId };
    },
  });
  return null;
}
```

## Public surface

- `defineTool` — schema-first tool factory
- `WebMCPProvider` — provider that initializes the polyfill and registry
- `useRegisterTool` — register a tool while a component is mounted
- `useTool` — observe a single tool's spec by name
- `useToolRegistry` / `useToolRegistryRef` — read the full registry
- `useContributeViewState` — contribute a partial view-state slice
- `listTools` / `getViewState` — imperative helpers for non-React callers
- `useRelayActivity` — `console.info` logger for `tool_activity` frames
- Tool types (`ToolSpec`, `ToolHandler`, `ViewState`, ...) and the wire-protocol types shared with the relay (`@archon-research/mcp-connect` and the Python relay)

## Related

- [`@archon-research/mcp-connect`](../mcp-connect/README.md) — the connection UI (chat icon, status indicator, connect modal) that pairs the browser with a harness over the relay.
