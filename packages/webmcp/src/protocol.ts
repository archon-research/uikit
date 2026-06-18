/**
 * Relay wire-protocol types for the browser side.
 *
 * Single source of truth lives in the browser-free core
 * `@archon-research/mcp-relay`; we re-export it here so the browser widget and
 * the relay host can never drift. (Previously these were re-declared in full;
 * the duplicate has been collapsed.)
 *
 * Mutation confirmation is handled browser-side (the session hook gates a
 * mutation invoke behind a local dialog, then returns a normal `result`), so
 * the relay's MVP wire subset is all the browser needs — there are no
 * confirmation_request/response frames on the wire.
 */
export type {
  BrowserToServerMessage,
  ConnectionTokenClaims,
  CreateSessionResponse,
  HarnessStatusMessage,
  HelloAcceptedMessage,
  HelloMessage,
  HelloRejectedMessage,
  InvokeMessage,
  PingMessage,
  PongMessage,
  ResultMessage,
  ServerToBrowserMessage,
  ToolActivityMessage,
  ToolDefinition,
  ToolInputSchema,
  ToolsChangedMessage,
  ToolsListMessage,
} from '@archon-research/mcp-relay';
