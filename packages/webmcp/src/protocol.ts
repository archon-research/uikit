/**
 * Relay wire-protocol types (TypeScript mirror of src/synome/relay/protocol.py).
 *
 * These match the @mcp-b/webmcp-local-relay wire protocol so the browser
 * widget can speak to the Synome WebSocket back-channel without changes.
 */

// ---------------------------------------------------------------------------
// Tool schema
// ---------------------------------------------------------------------------

export interface ToolInputSchema {
  type: 'object';
  properties: Record<string, unknown>;
  required?: string[];
  [key: string]: unknown;
}

export interface ToolDefinition {
  name: string;
  description: string;
  /** Follows MCP naming: input_schema (snake_case). */
  input_schema: ToolInputSchema;
  mutation?: boolean;
  confirmation_summary_template?: string;
}

// ---------------------------------------------------------------------------
// Browser -> server messages
// ---------------------------------------------------------------------------

export interface HelloMessage {
  type: 'hello';
  tab_id: string;
  origin: string;
  url: string;
  title?: string;
  /** Durable connection JWT; the relay verifies it for stateless auth. */
  connection_token?: string;
}

export interface ToolsListMessage {
  type: 'tools/list';
  tools: ToolDefinition[];
}

export interface ToolsChangedMessage {
  type: 'tools/changed';
  tools: ToolDefinition[];
}

export interface ResultMessage {
  type: 'result';
  call_id: string;
  result: unknown;
  error?: string;
}

export interface PongMessage {
  type: 'pong';
}

export interface ConfirmationResponseMessage {
  type: 'confirmation_response';
  call_id: string;
  decision: 'approved' | 'denied';
}

// Union of all browser -> server messages
export type BrowserToServerMessage =
  | HelloMessage
  | ToolsListMessage
  | ToolsChangedMessage
  | ResultMessage
  | PongMessage
  | ConfirmationResponseMessage;

// ---------------------------------------------------------------------------
// Server -> browser messages
// ---------------------------------------------------------------------------

export interface HelloAcceptedMessage {
  type: 'hello/accepted';
  session_id: string;
}

export interface HelloRejectedMessage {
  type: 'hello/rejected';
  reason: string;
}

export interface InvokeMessage {
  type: 'invoke';
  call_id: string;
  tool_name: string;
  args: Record<string, unknown>;
}

export interface PingMessage {
  type: 'ping';
}

export interface ConfirmationRequestMessage {
  type: 'confirmation_request';
  call_id: string;
  tool_name: string;
  summary: string;
  args_preview: Record<string, unknown>;
  expires_at: string;
}

export interface ConfirmationExpiredMessage {
  type: 'confirmation_expired';
  call_id: string;
}

/** Best-effort feed of every tools/call the relay handles for this session. */
export interface ToolActivityMessage {
  type: 'tool_activity';
  activity_id: string;
  tool_name: string;
  kind: 'data' | 'ui' | 'mutation';
  status: 'started' | 'ok' | 'error' | 'denied';
  args?: Record<string, unknown>;
  result_preview?: string | null;
  error?: string | null;
}

/**
 * Pushed by the relay when harness attachment state changes.
 * attached:true means a harness did initialize and has made recent /mcp calls.
 * attached:false means the session has no recently-active harness.
 */
export interface HarnessStatusMessage {
  type: 'harness_status';
  attached: boolean;
  last_activity_ms: number | null;
}

// Union of all server -> browser messages
export type ServerToBrowserMessage =
  | HelloAcceptedMessage
  | HelloRejectedMessage
  | InvokeMessage
  | PingMessage
  | ConfirmationRequestMessage
  | ConfirmationExpiredMessage
  | ToolActivityMessage
  | HarnessStatusMessage;

// ---------------------------------------------------------------------------
// HTTP: session issuance
// ---------------------------------------------------------------------------

export interface CreateSessionResponse {
  session_id: string;
  pairing_token: string;
  /** Durable bearer the user pastes into their harness config (validated on
   * every request, unlike the single-use pairing_token). */
  connection_token: string;
  /** ISO-8601 deadline for connection_token; UI shows expired + manual refresh. */
  connection_token_expires_at: string;
  ws_url: string;
  expires_at: string;
}

export interface TokenRefreshResponse {
  connection_token: string;
  expires_at: string;
}

// ---------------------------------------------------------------------------
// JWT claim schema (defined now; validated via opaque session table in v1)
// ---------------------------------------------------------------------------

export interface ConnectionTokenClaims {
  iss: string;
  sub: string;
  aud: string;
  jti: string;
  iat: number;
  exp: number;
  channel_id: string;
  scope: string;
  tab_id: string;
}
