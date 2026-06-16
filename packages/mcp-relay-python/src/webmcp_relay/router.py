"""FastAPI endpoints for the session relay.

Endpoints (see ``.notes/web-mcp-investigations/relay.md`` §6):

* ``POST /api/sessions``        - browser requests a session + pairing token.
* ``WS   /ws/sessions/{id}``    - browser back-channel (hello, tools, results).
* ``POST /mcp``                 - harness Streamable HTTP entry (bearer auth).
* ``POST /mcp/token/refresh``   - harness connection-token refresh.

The ``POST /mcp`` handler here is the relay's bearer-validation + tool-routing
front door. It exchanges a single-use pairing token for a durable connection
token on first use, then routes ``tools/list`` / ``tools/call`` to the bound
browser WebSocket. (The FastMCP data-tool server from BE-TOOLS mounts its own
Streamable HTTP app; this handler covers the relay-routed, browser-hosted tool
path and the pairing handshake.)

The relay itself has no Synome imports. The host registers capabilities via
``webmcp_relay.registry`` at startup.
"""

from __future__ import annotations

import asyncio
import inspect
import json
import logging
import time
import uuid
from typing import Annotated, Any, Literal

from fastapi import APIRouter, Header, HTTPException, Request, WebSocket, WebSocketDisconnect
from pydantic import ValidationError

from webmcp_relay.confirm import ConfirmationError, get_guarded_write_tool
from webmcp_relay.protocol import (
    ConfirmationResponseMessage,
    CreateSessionResponse,
    HelloMessage,
    PendingCallsResponse,
    PendingCallView,
    ResultMessage,
    TokenRefreshResponse,
    ToolActivityMessage,
    ToolsChangedMessage,
    ToolsListMessage,
)
from webmcp_relay.registry import (
    get_all_guarded_writes,
    get_prompt_spec,
    get_server_tool,
    get_server_tools,
)
from webmcp_relay.relay import SessionRelay, get_relay
from webmcp_relay.store import SessionRecord
from webmcp_relay.tokens import (
    CONNECTION_TOKEN_TTL_SECONDS,
    mint_connection_token,
    new_connection_id,
    new_pairing_token,
    new_session_id,
    new_tab_id,
    parse_bearer,
    session_id_from_token,
)

router = APIRouter(tags=["relay"])
logger = logging.getLogger(__name__)


def _iso_from_monotonic_offset(seconds_from_now: float) -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() + seconds_from_now))


# ---------------------------------------------------------------------------
# Session issuance
# ---------------------------------------------------------------------------


@router.post("/api/sessions", response_model=CreateSessionResponse)
def create_session(request: Request) -> CreateSessionResponse:
    """Issue a new browser session and its durable connection token (a JWT)."""
    relay = get_relay()
    session_id = new_session_id()
    record = SessionRecord(
        session_id=session_id,
        tab_id=new_tab_id(),
        pairing_token=new_pairing_token(),
    )
    relay.store.create(record)

    # The connection token is a self-verifying HS256 JWT carrying the session id
    # (auto-generated on first use). Auth is stateless: the relay verifies the
    # signature/expiry, so a backend restart re-authenticates live tabs without
    # any persisted session (when WEBMCP_RELAY_JWT_SECRET is set). The in-memory
    # record is only ephemeral live-state for routing.
    connection_token = mint_connection_token(session_id, record.tab_id)
    record.connection_token_expires_at = time.monotonic() + CONNECTION_TOKEN_TTL_SECONDS

    ws_url = str(request.url_for("relay_websocket", session_id=session_id))
    ws_url = ws_url.replace("http://", "ws://", 1).replace("https://", "wss://", 1)

    assert record.pairing_token is not None
    return CreateSessionResponse(
        session_id=session_id,
        pairing_token=record.pairing_token,
        connection_token=connection_token,
        connection_token_expires_at=_iso_from_monotonic_offset(CONNECTION_TOKEN_TTL_SECONDS),
        ws_url=ws_url,
        expires_at=_iso_from_monotonic_offset(record.expires_at - time.monotonic()),
    )


# ---------------------------------------------------------------------------
# Browser WebSocket back-channel
# ---------------------------------------------------------------------------


@router.websocket("/ws/sessions/{session_id}", name="relay_websocket")
async def relay_websocket(websocket: WebSocket, session_id: str) -> None:
    """Browser back-channel: accept hello, ingest tools, route results.

    Accept first, then authenticate from the JWT in the hello. This avoids a
    pre-accept 403 (which the browser sees as an opaque close and retries
    forever); instead an unauthenticated/stale token gets a clean
    ``hello/rejected`` so the client stops and re-pairs. A valid token
    re-materializes the ephemeral session, so reconnects survive a restart.
    """
    relay = get_relay()
    await websocket.accept()

    # First frame must be a hello.
    try:
        first = await websocket.receive_json()
        hello = HelloMessage.model_validate(first)
    except (WebSocketDisconnect, ValidationError, ValueError):
        await websocket.close(code=4400)
        return

    # Stateless auth: the hello must carry a connection token whose session id
    # matches this channel. Knowing the token is valid is enough to (re)create
    # the in-memory live-state record; liveness/routing is tracked separately.
    authed_session_id = (
        session_id_from_token(hello.connection_token) if hello.connection_token else None
    )
    if authed_session_id != session_id:
        await websocket.send_json(
            relay.reject_hello(
                "Session token missing, invalid, or expired. Reconnect from the Explorer panel."
            ).model_dump()
        )
        await websocket.close(code=4401)
        return

    _ensure_session(relay, session_id)

    try:
        accepted = relay.handle_hello(hello, session_id)
    except Exception as exc:  # noqa: BLE001
        await websocket.send_json(relay.reject_hello(str(exc)).model_dump())
        await websocket.close(code=4401)
        return

    await websocket.send_json(accepted.model_dump())
    relay.attach_socket(session_id, websocket)

    heartbeat = asyncio.ensure_future(relay.heartbeat_loop(session_id, websocket))
    try:
        await _browser_receive_loop(relay, session_id, websocket)
    except WebSocketDisconnect:
        pass
    finally:
        heartbeat.cancel()
        relay.detach_socket(session_id)


async def _browser_receive_loop(relay: SessionRelay, session_id: str, websocket: WebSocket) -> None:
    while True:
        message = await websocket.receive_json()
        message_type = message.get("type")
        if message_type in ("tools/list", "tools/changed"):
            model = (
                ToolsListMessage if message_type == "tools/list" else ToolsChangedMessage
            ).model_validate(message)
            relay.set_tools(session_id, model.tools)
        elif message_type == "result":
            relay.resolve_result(ResultMessage.model_validate(message))
        elif message_type == "confirmation_response":
            relay.resolve_confirmation(ConfirmationResponseMessage.model_validate(message))
        elif message_type == "pong":
            continue
        else:
            logger.debug("Ignoring unknown browser message type %r", message_type)


# ---------------------------------------------------------------------------
# Harness Streamable HTTP entry point
# ---------------------------------------------------------------------------


def _ensure_session(relay: SessionRelay, session_id: str) -> SessionRecord:
    """Return the in-memory live-state record, creating an empty one if absent.

    The record is ephemeral routing/liveness state, not the auth authority: it
    is lazily (re)created from a verified token, so a backend restart simply
    re-materializes it on the next authenticated call or WS reconnect.
    """
    record = relay.store.get(session_id)
    if record is None:
        record = SessionRecord(session_id=session_id, tab_id=session_id)
        relay.store.create(record)
    return record


def _resolve_session(relay: SessionRelay, bearer: str) -> SessionRecord:
    """Authenticate a bearer and return its (ephemeral) live-state record.

    Auth is stateless: a validly-signed, unexpired connection JWT authorizes the
    call regardless of in-memory state. Whether a live browser is connected is a
    separate liveness check enforced at invoke/confirm time (so read-only data
    tools work tab-less while UI/mutation tools require a live tab). The legacy
    single-use pairing token is still accepted for any non-JWT client.
    """
    session_id = session_id_from_token(bearer)
    if session_id is not None:
        return _ensure_session(relay, session_id)

    connection_token = new_connection_id()
    consumed = relay.store.consume_pairing_token(bearer, connection_token)
    if consumed is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token; reconnect from the Explorer panel.",
        )
    return consumed


@router.post("/mcp")
async def mcp_entry(
    request: Request,
    authorization: Annotated[str | None, Header()] = None,
) -> dict[str, Any]:
    """Relay-routed MCP entry: validate bearer, route to the browser session.

    Handles the minimal JSON-RPC method surface needed to bind a harness and
    drive browser-hosted tools: ``initialize``, ``tools/list``, ``tools/call``,
    ``prompts/list``, ``prompts/get``.

    Data tools served entirely server-side are handled by the FastMCP mount
    (BE-TOOLS); this front door covers pairing, browser routing, and any
    capabilities registered via the relay registry (server tools, prompts,
    guarded writes).

    On ``initialize``, the session is marked harness-attached and the
    ``harness_status`` frame is pushed to any live browser WebSocket.
    Every ``/mcp`` call updates ``last_seen`` for TTL-based liveness tracking.
    """
    relay = get_relay()
    bearer = parse_bearer(authorization)
    if not bearer:
        raise HTTPException(
            status_code=401,
            detail="Missing bearer token. Paste your pairing code from the Explorer panel.",
        )

    record = _resolve_session(relay, bearer)
    session_id = record.session_id

    body = await request.json()
    method = body.get("method")
    request_id = body.get("id")
    params = body.get("params") or {}

    # Update harness last_seen on every /mcp call for TTL-based liveness.
    relay.touch_harness(session_id)

    if method == "initialize":
        # Mark the harness as attached and push a harness_status frame.
        await relay.mark_harness_attached(session_id)
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {
                "protocolVersion": "2025-03-26",
                "serverInfo": {"name": "synome-relay", "version": "1"},
                "capabilities": {
                    "tools": {"listChanged": True},
                    "prompts": {},
                },
                "_synome": {"session_id": session_id},
            },
        }

    if method == "tools/list":
        tools = [
            {
                "name": tool.name,
                "description": tool.description,
                "inputSchema": tool.input_schema.model_dump(),
            }
            for tool in relay.list_tools(session_id)
        ]
        # Server-side read-only data tools execute on the server, so a harness
        # can use them even with no browser tab open (the hybrid-execution path,
        # gap 3). These are independent of the live browser session.
        browser_names = {tool["name"] for tool in tools}
        tools.extend(
            {
                "name": spec.name,
                "description": spec.description,
                "inputSchema": spec.input_schema,
            }
            for name, spec in get_server_tools().items()
            if name not in browser_names
        )
        # Server-side guarded write tools are advertised too: they execute on
        # the server but only after browser confirmation.
        all_names = {tool["name"] for tool in tools}
        tools.extend(
            {
                "name": guarded.name,
                "description": guarded.description,
                "inputSchema": guarded.input_schema,
            }
            for name, guarded in get_all_guarded_writes().items()
            if name not in all_names
        )
        return {"jsonrpc": "2.0", "id": request_id, "result": {"tools": tools}}

    if method == "tools/call":
        tool_name = params.get("name")
        arguments = params.get("arguments") or {}
        if not tool_name:
            return _jsonrpc_error(request_id, -32602, "Missing tool name")
        return await _handle_tools_call(relay, session_id, request_id, tool_name, arguments)

    if method == "prompts/list":
        prompt_spec = get_prompt_spec()
        prompts = prompt_spec.list_fn() if prompt_spec is not None else []
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {"prompts": prompts},
        }

    if method == "prompts/get":
        prompt_spec = get_prompt_spec()
        prompt_name = params.get("name")
        if not prompt_name:
            return _jsonrpc_error(request_id, -32602, "Missing prompt name")
        if prompt_spec is None:
            return _jsonrpc_error(request_id, -32602, f"Unknown prompt: {prompt_name}")
        try:
            result = prompt_spec.get_fn(prompt_name, params.get("arguments") or {})
        except KeyError:
            return _jsonrpc_error(request_id, -32602, f"Unknown prompt: {prompt_name}")
        return {"jsonrpc": "2.0", "id": request_id, "result": result}

    return _jsonrpc_error(request_id, -32601, f"Method not found: {method}")


@router.post("/mcp/token/refresh")
async def refresh_token(
    authorization: Annotated[str | None, Header()] = None,
) -> dict[str, Any]:
    """Mint a fresh connection JWT from a still-valid bearer (harness-facing)."""
    bearer = parse_bearer(authorization)
    session_id = session_id_from_token(bearer) if bearer else None
    if session_id is None:
        raise HTTPException(status_code=401, detail="Token invalid or expired; re-pair.")
    return {
        "connection_token": mint_connection_token(session_id),
        "expires_at": _iso_from_monotonic_offset(CONNECTION_TOKEN_TTL_SECONDS),
    }


@router.post(
    "/api/sessions/{session_id}/refresh-token",
    response_model=TokenRefreshResponse,
)
def refresh_session_token(session_id: str) -> TokenRefreshResponse:
    """Re-mint a session's durable connection JWT (manual UI refresh).

    The browser owns ``session_id`` and calls this when the user clicks Refresh
    after the token expires. Tokens are stateless JWTs, so the old one simply
    lapses at its expiry; this issues a fresh 12h token.
    """
    relay = get_relay()
    _ensure_session(relay, session_id)
    return TokenRefreshResponse(
        connection_token=mint_connection_token(session_id),
        expires_at=_iso_from_monotonic_offset(CONNECTION_TOKEN_TTL_SECONDS),
    )


@router.get("/api/mcp/pending-calls", response_model=PendingCallsResponse)
def list_pending_calls(session_id: str) -> PendingCallsResponse:
    """Re-surface mutations awaiting confirmation after a back-channel reconnect.

    The browser calls this on reconnect so it can re-render any confirmation
    dialogs it missed while its WebSocket was down (see confirm note §7).
    """
    relay = get_relay()
    return PendingCallsResponse(
        pending_calls=[
            PendingCallView(
                call_id=call.call_id,
                tool_name=call.tool_name,
                summary=call.summary,
                args_preview=call.args_preview(),
                expires_at=call.expires_at_iso(),
            )
            for call in relay.pending_calls_for(session_id)
        ]
    )


def _truncate(text: str, limit: int) -> str:
    return text if len(text) <= limit else text[:limit] + "...(truncated)"


async def _emit_activity(
    relay: SessionRelay,
    session_id: str,
    activity_id: str,
    tool_name: str,
    kind: Literal["data", "ui", "mutation"],
    status: Literal["started", "ok", "error", "denied"],
    *,
    args: dict[str, Any] | None = None,
    result: Any = None,
    error: str | None = None,
) -> None:
    """Push one tool-activity frame for the harness-activity feed (best-effort)."""
    await relay.notify_activity(
        session_id,
        ToolActivityMessage(
            activity_id=activity_id,
            tool_name=tool_name,
            kind=kind,
            status=status,
            args=args or {},
            result_preview=_truncate(_stringify(result), 2000) if result is not None else None,
            error=_truncate(error, 500) if error else None,
        ),
    )


async def _handle_tools_call(
    relay: SessionRelay,
    session_id: str,
    request_id: Any,
    tool_name: str,
    arguments: dict[str, Any],
) -> dict[str, Any]:
    """Route a tools/call, gating mutations behind browser confirmation.

    Flow:
      1. If the tool is a mutation, hold it for confirmation (the harness HTTP
         response blocks here until approve/deny/timeout).
      2. On approval, execute it: server-side guarded write tools run their
         handler directly; browser-hosted tools are invoked over the WS.
      3. Denial / timeout / no-browser return a structured MCP error result.
    """
    data_tool = get_server_tool(tool_name)
    guarded = get_guarded_write_tool(tool_name)
    is_mutation = relay.is_mutation(session_id, tool_name)
    kind: Literal["data", "ui", "mutation"] = (
        "data" if data_tool is not None else ("mutation" if is_mutation else "ui")
    )

    # Best-effort "Harness activity" feed: announce the call, then its outcome.
    activity_id = str(uuid.uuid4())
    await _emit_activity(relay, session_id, activity_id, tool_name, kind, "started", args=arguments)

    # Server-side read-only data tools run their handler directly: no browser,
    # no confirmation. This is what makes a tab-less harness useful (gap 3).
    if data_tool is not None:
        try:
            result = data_tool.handler(**arguments)
            if inspect.isawaitable(result):
                result = await result
        except Exception as exc:  # noqa: BLE001 - handler failures become tool errors
            await _emit_activity(
                relay, session_id, activity_id, tool_name, kind, "error", error=str(exc)
            )
            return _tool_error_result(request_id, str(exc))
        await _emit_activity(relay, session_id, activity_id, tool_name, kind, "ok", result=result)
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {"content": [{"type": "text", "text": _stringify(result)}]},
        }

    if is_mutation:
        summary = _confirmation_summary(guarded, tool_name, arguments)
        try:
            await relay.confirm(session_id, tool_name, arguments, summary=summary)
        except ConfirmationError as exc:
            denied_or_error: Literal["denied", "error"] = (
                "denied" if exc.code == -32002 else "error"
            )
            await _emit_activity(
                relay, session_id, activity_id, tool_name, kind, denied_or_error, error=str(exc)
            )
            return _tool_error_result(request_id, str(exc))

    try:
        if guarded is not None:
            # Server-side execution path: run only after approval above.
            result = await guarded.execute(arguments)
        else:
            result = await relay.invoke(session_id, tool_name, arguments)
    except Exception as exc:  # noqa: BLE001 - relay/handler failures become tool errors
        await _emit_activity(
            relay, session_id, activity_id, tool_name, kind, "error", error=str(exc)
        )
        return _tool_error_result(request_id, str(exc))

    await _emit_activity(relay, session_id, activity_id, tool_name, kind, "ok", result=result)

    return {
        "jsonrpc": "2.0",
        "id": request_id,
        "result": {"content": [{"type": "text", "text": _stringify(result)}]},
    }


def _confirmation_summary(guarded: Any, tool_name: str, arguments: dict[str, Any]) -> str:
    if guarded is not None:
        try:
            return guarded.confirmation_summary(arguments)
        except Exception:  # noqa: BLE001 - never block confirmation on a bad summary
            pass
    return f"Run {tool_name} with {_stringify(arguments)}"


def _tool_error_result(request_id: Any, message: str) -> dict[str, Any]:
    return {
        "jsonrpc": "2.0",
        "id": request_id,
        "result": {"isError": True, "content": [{"type": "text", "text": message}]},
    }


def _jsonrpc_error(request_id: Any, code: int, message: str) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": request_id, "error": {"code": code, "message": message}}


def _stringify(result: Any) -> str:
    if isinstance(result, str):
        return result
    try:
        return json.dumps(result)
    except (TypeError, ValueError):
        return str(result)
