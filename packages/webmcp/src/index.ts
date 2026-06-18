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
 *   - useRelaySession              drive a relay back-channel from the registry
 *   - listTools / getViewState     imperative helpers for non-React callers
 *   - ToolSpec / ViewState / etc.  shared types
 *   - wire-protocol types          re-exported from @archon-research/mcp-relay
 */

// Tool-definition contract
export { defineTool } from './types.js';
export type {
  PendingCallPrompt,
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

// Relay session: connects the registry to a relay back-channel.
export { useRelaySession } from './useRelaySession.js';
export type {
  RelaySessionStatus,
  UseRelaySessionOptions,
  UseRelaySessionResult,
} from './useRelaySession.js';

// Wire-protocol types (single source of truth: @archon-research/mcp-relay)
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
} from './protocol.js';
