# @archon-research/mcp-connect

The drop-in connection UI for pairing a browser app with an external agent harness (Claude Code, GitHub Copilot CLI, ...) over a WebMCP relay. It is a single chat-bubble icon with a status indicator plus a connection modal, and the human-in-the-loop confirmation surface for guarded writes.

It pairs with [`@archon-research/webmcp`](../webmcp/README.md): `webmcp` registers the UI tools a harness can call; `mcp-connect` is how the user connects a harness and approves its writes.

## Installation

```bash
npm install @archon-research/mcp-connect @archon-research/webmcp @archon-research/design-system react
```

`react` is a peer dependency (>= 19). The components are themed with `@archon-research/design-system` (ark-ui `Dialog`, `Tabs`, status `Indicator`).

## Components

### `HarnessConnect`

A chat-bubble icon carrying a status `Indicator`; clicking it opens a modal with copy-paste setup instructions for Claude Code and GitHub Copilot CLI (segmented control), rendering the relay URL, the durable connection token, and the per-harness `mcp add` command.

It is fully prop-driven, so the host owns all connection state:

```tsx
import { HarnessConnect } from '@archon-research/mcp-connect';

<HarnessConnect
  indicatorStatus={indicatorStatus} // 'disconnected' | 'ready' | 'connected' | 'reconnecting'
  relayBaseUrl={window.location.origin}
  connectionToken={connectionToken} // string | null
/>;
```

The four `indicatorStatus` values map to:

| status | meaning |
|--------|---------|
| `disconnected` | no session, or the token expired |
| `ready` | the browser has a live session + relay socket, but no harness has attached |
| `connected` | a harness has attached (derived from harness activity recency) |
| `reconnecting` | the relay socket dropped and is retrying |

### `ConfirmToolCallDialog` + `useConfirmationQueue`

A guarded write from a harness must be approved by the user. `useConfirmationQueue` consumes confirmation events from the relay back-channel and exposes the active `PendingCallRecord` (as `activePendingCall`) plus `approve` / `deny`; `ConfirmToolCallDialog` renders it (tool name, summary, arguments, a countdown to expiry, and a queue badge). Render the dialog at the app root so it works regardless of the connection modal.

```tsx
import { ConfirmToolCallDialog, useConfirmationQueue } from '@archon-research/mcp-connect';

function ConfirmationSurface({ backChannel }: { backChannel: WebSocket | null }) {
  const { activePendingCall, queueLength, approve, deny } = useConfirmationQueue({ backChannel });
  return (
    <ConfirmToolCallDialog
      pendingCall={activePendingCall}
      queueLength={queueLength}
      onApprove={approve}
      onDeny={deny}
    />
  );
}
```

## Public surface

- `HarnessConnect` (+ `HarnessConnectProps`)
- `ConfirmToolCallDialog` (+ `ConfirmToolCallDialogProps`)
- `useConfirmationQueue` (+ option/result types)
- Types: `HarnessIndicatorStatus`, `PendingCallRecord`, `PendingCallStatus`, `ConfirmationDecision`, `ConfirmationRequestEvent`, `ConfirmationExpiredEvent`

## Preview

State previews live in the [Ladle preview site](https://archon-research.github.io/uikit/) under Organisms. The preview is static (no relay), so it documents each visual state via props; the live `ready -> connected` flip is driven by an actual harness attaching.
