// ---------------------------------------------------------------------------
// Confirmation protocol types (wire-level relay contract)
// ---------------------------------------------------------------------------

export type PendingCallStatus = 'pending' | 'approved' | 'denied' | 'expired';

/**
 * A mutation tool call awaiting human approval.
 *
 * Pushed by the relay server to the browser back-channel when the harness
 * invokes a tool tagged mutation:true. The browser surfaces a confirmation
 * dialog; the user approves or denies; the server unblocks the harness call.
 */
export type PendingCallRecord = {
  /** Unique identifier for this invocation, issued by the relay. */
  callId: string;
  /** Session that owns this call (maps to the browser back-channel). */
  sessionId: string;
  /** Fully qualified tool name, e.g. "uikit-preview.identities.update". */
  toolName: string;
  /** Raw arguments supplied by the harness. */
  toolArgs: Record<string, unknown>;
  /**
   * Human-readable one-liner produced by the tool's confirmationSummary
   * callback, e.g. "Update identity SYN-042: change expression to 'a*b*c'".
   */
  summary: string;
  /** ISO-8601 timestamp when the call was created on the server. */
  createdAt: string;
  /** ISO-8601 timestamp when the pending call expires (default: +120 s). */
  expiresAt: string;
  status: PendingCallStatus;
};

// ---------------------------------------------------------------------------
// Harness connection state for the HarnessConnect icon and modal
// ---------------------------------------------------------------------------

/**
 * The four states surfaced by the connect UI Indicator.
 *
 * disconnected - no session or token expired
 * ready        - session + WS up, but no harness has attached yet
 * connected    - a harness is attached (sent initialize and made recent /mcp calls)
 * reconnecting - WS dropped and is retrying
 */
export type HarnessIndicatorStatus =
  | 'disconnected'
  | 'ready'
  | 'connected'
  | 'reconnecting';
