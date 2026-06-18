/**
 * MVP wire-protocol types for the WebMCP relay.
 *
 * Re-declared here (not imported from @archon-research/webmcp) so this
 * package stays browser-free and usable in Cloudflare Workers without any
 * DOM or React dependency.
 *
 * Field names match the Python protocol.py verbatim (snake_case throughout).
 * Message `type` strings match the @mcp-b/webmcp-local-relay wire protocol
 * so the existing browser client interoperates with no changes.
 *
 * MVP subset: connect + tool-activity only (NO mutation-confirmation).
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
  /** Snake-case per MCP spec and the Python ToolDefinition model. */
  input_schema: ToolInputSchema;
  mutation?: boolean;
  confirmation_summary_template?: string;
}

// ---------------------------------------------------------------------------
// Browser -> server messages (MVP subset)
// ---------------------------------------------------------------------------

export interface HelloMessage {
  type: 'hello';
  tab_id: string;
  origin: string;
  url: string;
  title?: string;
  /** Durable HS256 JWT; the relay verifies it for stateless auth. */
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

// ---------------------------------------------------------------------------
// Server -> browser messages (MVP subset)
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

/**
 * Best-effort feed of every tools/call the relay handles for this session.
 * Pushed over the browser WS for the chat "Harness activity" panel.
 */
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
 * Pushed when harness attachment state changes.
 * CONTRACT: { type: "harness_status", attached: bool, last_activity_ms: int | null }
 * The frontend codes against this exact shape.
 */
export interface HarnessStatusMessage {
  type: 'harness_status';
  attached: boolean;
  /** Wall-clock ms timestamp of the last harness /mcp call, or null. */
  last_activity_ms: number | null;
}

// ---------------------------------------------------------------------------
// Message unions (MVP subset: no mutation-confirmation frames)
// ---------------------------------------------------------------------------

/** Frames a browser back-channel sends to the relay. */
export type BrowserToServerMessage =
  | HelloMessage
  | ToolsListMessage
  | ToolsChangedMessage
  | ResultMessage
  | PongMessage;

/** Frames the relay pushes to a browser back-channel. */
export type ServerToBrowserMessage =
  | HelloAcceptedMessage
  | HelloRejectedMessage
  | InvokeMessage
  | PingMessage
  | ToolActivityMessage
  | HarnessStatusMessage;

// ---------------------------------------------------------------------------
// HTTP: session issuance
// ---------------------------------------------------------------------------

export interface CreateSessionResponse {
  session_id: string;
  pairing_token: string;
  /** Durable HS256 JWT the user pastes into their harness config. */
  connection_token: string;
  /** ISO-8601 deadline for connection_token. */
  connection_token_expires_at: string;
  ws_url: string;
  expires_at: string;
}

// ---------------------------------------------------------------------------
// JWT claims (HS256, self-issued)
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
