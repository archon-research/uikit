"""Relay wire-protocol types.

These mirror the @mcp-b/webmcp-local-relay wire protocol verbatim so the
browser widget (wrapped here by @mcp-b/global) can connect to our server-side
WebSocket endpoint without any browser-side changes.

Message types (browser -> server unless noted):
  hello                   browser sends on WS connect
  hello/accepted          server responds (server -> browser)
  hello/rejected          server responds (server -> browser)
  tools/list              browser pushes full tool catalogue
  tools/changed           browser pushes updated tool catalogue
  invoke                  server sends tool call (server -> browser)
  result                  browser returns tool result
  ping                    server heartbeat (server -> browser)
  pong                    browser heartbeat response
  harness_status          server pushes harness-liveness state (server -> browser)
  tool_activity           server pushes a harness-activity feed entry (server -> browser)
  confirmation_request    server asks the browser to approve a mutation (server -> browser)
  confirmation_response   browser returns the user's approve/deny decision
  confirmation_expired    server cancels a pending mutation on timeout (server -> browser)

Token / session protocol (HTTP):
  POST /api/sessions        browser requests session + pairing token
  WS   /ws/sessions/{id}   browser back-channel
  POST /mcp                 harness Streamable HTTP entry point
  POST /mcp/token/refresh   harness connection-token refresh
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict

# ---------------------------------------------------------------------------
# Tool schema (shared between browser registration and server registry)
# ---------------------------------------------------------------------------


class ToolInputSchema(BaseModel):
    """JSON Schema subset used for MCP tool input parameters."""

    model_config = ConfigDict(extra="allow")

    type: Literal["object"] = "object"
    properties: dict[str, Any] = {}
    required: list[str] = []


class ToolDefinition(BaseModel):
    """A single tool as carried in tools/list and tools/changed."""

    model_config = ConfigDict(extra="allow")

    name: str
    description: str
    input_schema: ToolInputSchema
    mutation: bool = False
    confirmation_summary_template: str | None = None


# ---------------------------------------------------------------------------
# Browser -> server messages
# ---------------------------------------------------------------------------


class HelloMessage(BaseModel):
    """Browser sends immediately after WebSocket upgrade."""

    model_config = ConfigDict(extra="allow")

    type: Literal["hello"]
    tab_id: str
    origin: str
    url: str
    title: str = ""
    # Durable connection JWT for this channel. The relay verifies it (stateless
    # auth) and requires its session id to match the URL before accepting.
    connection_token: str | None = None


class ToolsListMessage(BaseModel):
    """Browser pushes full tool catalogue (and after reconnect)."""

    model_config = ConfigDict(extra="allow")

    type: Literal["tools/list"]
    tools: list[ToolDefinition]


class ToolsChangedMessage(BaseModel):
    """Browser pushes updated catalogue when mounts/unmounts change the set."""

    model_config = ConfigDict(extra="allow")

    type: Literal["tools/changed"]
    tools: list[ToolDefinition]


class ResultMessage(BaseModel):
    """Browser returns the result of an invoked tool."""

    model_config = ConfigDict(extra="allow")

    type: Literal["result"]
    call_id: str
    result: Any
    error: str | None = None


class PongMessage(BaseModel):
    """Browser heartbeat response."""

    model_config = ConfigDict(extra="allow")

    type: Literal["pong"]


class ConfirmationResponseMessage(BaseModel):
    """Browser returns the user's decision for a pending mutation.

    Sent over the same WebSocket back-channel after the user approves or denies
    a ``confirmation_request`` in the Explorer modal.
    """

    model_config = ConfigDict(extra="allow")

    type: Literal["confirmation_response"]
    call_id: str
    decision: Literal["approved", "denied"]


# ---------------------------------------------------------------------------
# Server -> browser messages
# ---------------------------------------------------------------------------


class HelloAcceptedMessage(BaseModel):
    """Server accepts the browser connection."""

    model_config = ConfigDict(extra="forbid")

    type: Literal["hello/accepted"] = "hello/accepted"
    session_id: str


class HelloRejectedMessage(BaseModel):
    """Server rejects the browser connection."""

    model_config = ConfigDict(extra="forbid")

    type: Literal["hello/rejected"] = "hello/rejected"
    reason: str


class InvokeMessage(BaseModel):
    """Server dispatches a tool call to the browser."""

    model_config = ConfigDict(extra="forbid")

    type: Literal["invoke"] = "invoke"
    call_id: str
    tool_name: str
    args: dict[str, Any]


class PingMessage(BaseModel):
    """Server heartbeat."""

    model_config = ConfigDict(extra="forbid")

    type: Literal["ping"] = "ping"


class ConfirmationRequestMessage(BaseModel):
    """Server pushes a pending mutation for user approval."""

    model_config = ConfigDict(extra="forbid")

    type: Literal["confirmation_request"] = "confirmation_request"
    call_id: str
    tool_name: str
    summary: str
    args_preview: dict[str, Any]
    expires_at: str


class ConfirmationExpiredMessage(BaseModel):
    """Server notifies browser that a pending confirmation timed out."""

    model_config = ConfigDict(extra="forbid")

    type: Literal["confirmation_expired"] = "confirmation_expired"
    call_id: str


class ToolActivityMessage(BaseModel):
    """Best-effort feed of every tools/call the relay handles for this session.

    Emitted for all three tool kinds (data / ui / mutation) so the chat window
    can show a live "Harness activity" feed of what a connected harness is doing
    in the page. Pushed only when a browser socket is live; the browser stamps
    the receive time. Payloads are truncated server-side.
    """

    model_config = ConfigDict(extra="forbid")

    type: Literal["tool_activity"] = "tool_activity"
    activity_id: str
    tool_name: str
    kind: Literal["data", "ui", "mutation"]
    status: Literal["started", "ok", "error", "denied"]
    args: dict[str, Any] = {}
    result_preview: str | None = None
    error: str | None = None


class HarnessStatusMessage(BaseModel):
    """Server pushes harness-liveness state changes to the browser.

    Emitted over the WS back-channel when the harness-attached flag flips:
      false -> true  on harness ``initialize``
      true  -> false after the inactivity TTL sweep

    CONTRACT (the frontend codes against this exact shape):
      { "type": "harness_status", "attached": bool, "last_activity_ms": int | null }

    ``last_activity_ms`` is the wall-clock millisecond timestamp of the last
    harness ``/mcp`` call, or null when the harness is not attached. The browser
    uses it to show "last seen X seconds ago" in the status Indicator.
    """

    model_config = ConfigDict(extra="forbid")

    type: Literal["harness_status"] = "harness_status"
    attached: bool
    # Milliseconds since epoch (wall clock) of the last harness /mcp call,
    # or null when attached is false and no prior activity exists.
    last_activity_ms: int | None = None


class PendingCallView(BaseModel):
    """A pending mutation as exposed over ``GET /api/mcp/pending-calls``.

    Lets a browser that reconnected its back-channel re-surface any in-flight
    confirmations it missed while disconnected (see confirm note §7).
    """

    model_config = ConfigDict(extra="forbid")

    call_id: str
    tool_name: str
    summary: str
    args_preview: dict[str, Any]
    expires_at: str


class PendingCallsResponse(BaseModel):
    """``GET /api/mcp/pending-calls`` response body."""

    model_config = ConfigDict(extra="forbid")

    pending_calls: list[PendingCallView]


# ---------------------------------------------------------------------------
# HTTP: session issuance
# ---------------------------------------------------------------------------


class CreateSessionRequest(BaseModel):
    """POST /api/sessions request body (currently empty; reserved for options)."""

    model_config = ConfigDict(extra="forbid")


class CreateSessionResponse(BaseModel):
    """POST /api/sessions response."""

    model_config = ConfigDict(extra="forbid")

    session_id: str
    pairing_token: str
    # Durable bearer the user pastes into their harness config. Validated on
    # every request (unlike the single-use pairing_token), so static-header
    # clients like Claude Code work for the whole session.
    connection_token: str
    # ISO-8601 deadline for connection_token; the UI surfaces an expired state
    # and a manual refresh once this passes.
    connection_token_expires_at: str
    ws_url: str
    expires_at: str


class TokenRefreshResponse(BaseModel):
    """POST /mcp/token/refresh and POST /api/sessions/{id}/refresh-token response."""

    model_config = ConfigDict(extra="forbid")

    connection_token: str
    expires_at: str


# ---------------------------------------------------------------------------
# JWT claim schema (HS256, self-issued; opaque session-table lookup in v1)
# ---------------------------------------------------------------------------


class ConnectionTokenClaims(BaseModel):
    """HS256 JWT claims for a durable harness connection token.

    In v1 the server validates via an opaque session table rather than JWT
    signature verification. The claim schema is defined now so the validator
    is a pluggable swap, not a migration, when full JWT verification is added.
    """

    model_config = ConfigDict(extra="allow")

    iss: str
    sub: str
    aud: str
    jti: str
    iat: int
    exp: int
    channel_id: str
    scope: str
    tab_id: str
