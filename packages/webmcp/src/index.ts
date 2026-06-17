/**
 * @archon-research/webmcp
 *
 * Stable wrapper over the @mcp-b/global polyfill, exposing a fixed interface
 * that the rest of the codebase depends on. All @mcp-b/* churn is absorbed here.
 *
 * Public surface (stable contract):
 *   - defineTool                   schema-first tool factory
 *   - WebMCPProvider               React provider (initializes polyfill + registry)
 *   - useRegisterTool              register a tool while mounted
 *   - useTool                      observe a single tool's spec by name
 *   - useToolRegistry              read the full registry (listTools / getViewState)
 *   - useContributeViewState       contribute a partial view-state slice
 *   - listTools / getViewState     imperative helpers for non-React callers
 *   - ToolSpec / ViewState / etc.  shared types
 *   - wire-protocol types          shared with the Python relay
 */

// Tool-definition contract
export { defineTool } from './types.js';
export type {
  PendingCall,
  ToolHandler,
  ToolRegistry,
  ToolSpec,
  ViewState,
} from './types.js';

// Provider
export { WebMCPProvider } from './provider.js';
export type {
  WebMCPProviderProps,
  ToolRegistryContextValue,
} from './provider.js';

// Hooks
export {
  useRegisterTool,
  useTool,
  useToolRegistry,
  useContributeViewState,
  listTools,
  getViewState,
  useToolRegistryRef,
} from './hooks.js';
export type { ToolRegistryRef } from './hooks.js';

// Relay activity logger (console.info per tool_activity frame; no feed state)
export { useRelayActivity } from './useRelayActivity.js';

// Wire-protocol types (shared with the Python relay)
export type {
  BrowserToServerMessage,
  ConfirmationExpiredMessage,
  ConfirmationRequestMessage,
  ConfirmationResponseMessage,
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
  TokenRefreshResponse,
} from './protocol.js';
