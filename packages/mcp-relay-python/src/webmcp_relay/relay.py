"""SessionRelay: routes harness tool calls to the bound browser WebSocket.

This is the load-bearing core of the BE-RELAY workstream. It owns:

* the live ``WebSocket`` per session (the browser back-channel),
* the table of :class:`PendingInvocation` futures awaiting a ``result``,
* the connection lifecycle (hello/accept, tools push, heartbeat, disconnect),
* routing an ``invoke`` to the browser and resolving its future on ``result``,
* harness-liveness tracking (B2): ``touch_harness``, ``mark_harness_attached``,
  TTL-based revert, and ``notify_harness_status`` push.

The wire protocol is reused verbatim from ``@mcp-b/webmcp-local-relay`` (see
``webmcp_relay.protocol``): the browser widget connects with no changes beyond
pointing at our WebSocket URL.

Transport is abstracted to a small :class:`WebSocketLike` protocol so the relay
core is testable without a real network socket.
"""

from __future__ import annotations

import asyncio
import contextlib
import logging
import time
import uuid
from typing import Any, Protocol

from webmcp_relay.confirm import (
    CONFIRMATION_TIMEOUT_SECONDS,
    ConfirmationError,
    PendingCall,
    denied_error,
    no_browser_error,
    timeout_error,
)
from webmcp_relay.protocol import (
    ConfirmationExpiredMessage,
    ConfirmationRequestMessage,
    ConfirmationResponseMessage,
    HarnessStatusMessage,
    HelloAcceptedMessage,
    HelloMessage,
    HelloRejectedMessage,
    InvokeMessage,
    PingMessage,
    ResultMessage,
    ToolActivityMessage,
    ToolDefinition,
    ToolsChangedMessage,
    ToolsListMessage,
)
from webmcp_relay.store import InMemorySessionStore, PendingInvocation, SessionStore

logger = logging.getLogger(__name__)

# Mirrors the @mcp-b relay defaults.
INVOKE_TIMEOUT_SECONDS = 30.0
HEARTBEAT_INTERVAL_SECONDS = 15.0

# Harness-liveness TTL: a session whose last /mcp call is older than this is
# considered detached and the harness_attached flag is reverted to false.
# Tunable: 90 seconds is long enough to survive a harness that pauses between
# calls but short enough to catch a crashed or disconnected harness promptly.
# Increase if your workflow has long quiet gaps between tool calls.
HARNESS_LIVENESS_TTL_SECONDS = 90.0


class WebSocketLike(Protocol):
    """Minimal duck-typed surface of ``fastapi.WebSocket`` used by the relay."""

    async def send_json(self, data: Any) -> None: ...


class RelayError(Exception):
    """Raised when a tool call cannot be routed or completed."""


class SessionRelay:
    """Coordinates browser sessions and harness tool-call routing.

    One instance is shared process-wide (see :data:`get_relay`).
    """

    def __init__(self, store: SessionStore | None = None) -> None:
        self._store: SessionStore = store or InMemorySessionStore()
        self._sockets: dict[str, WebSocketLike] = {}
        self._pending: dict[str, PendingInvocation] = {}
        # Mutating tool calls held for browser confirmation, keyed by call_id.
        self._pending_calls: dict[str, PendingCall] = {}

    @property
    def store(self) -> SessionStore:
        return self._store

    # -- browser WebSocket lifecycle ------------------------------------

    def attach_socket(self, session_id: str, websocket: WebSocketLike) -> None:
        """Bind a browser WebSocket to its session and mark it connected."""
        self._sockets[session_id] = websocket
        record = self._store.get(session_id)
        if record is not None:
            record.touch_connected()

    def detach_socket(self, session_id: str) -> None:
        """Drop the browser WebSocket and reject all of its in-flight calls.

        The session itself is not deleted: it enters the reconnect grace
        window so a quick browser reconnect restores it. In-flight calls are
        rejected (no resumption in v1).
        """
        self._sockets.pop(session_id, None)
        record = self._store.get(session_id)
        if record is not None and record.state == "connected":
            record.touch_disconnected()
        self._reject_pending(
            session_id,
            "Browser session disconnected during invocation",
        )
        self._reject_pending_confirmations(session_id)

    def handle_hello(self, hello: HelloMessage, session_id: str) -> HelloAcceptedMessage:
        """Validate the browser ``hello`` and record its tab metadata."""
        record = self._store.get(session_id)
        if record is None:
            raise RelayError("Unknown session")
        record.tab_id = hello.tab_id
        return HelloAcceptedMessage(session_id=session_id)

    @staticmethod
    def reject_hello(reason: str) -> HelloRejectedMessage:
        return HelloRejectedMessage(reason=reason)

    def set_tools(self, session_id: str, tools: list[ToolDefinition]) -> None:
        """Store the catalogue pushed by tools/list or tools/changed."""
        record = self._store.get(session_id)
        if record is not None:
            record.tools = tools
            record.touch_connected()

    def list_tools(self, session_id: str) -> list[ToolDefinition]:
        record = self._store.get(session_id)
        return list(record.tools) if record is not None else []

    def is_connected(self, session_id: str) -> bool:
        record = self._store.get(session_id)
        return record is not None and record.state == "connected" and session_id in self._sockets

    async def notify_activity(self, session_id: str, message: ToolActivityMessage) -> None:
        """Best-effort push of a tool-activity frame to the live browser socket.

        Never raises: the activity feed is observability, not part of the
        tool-call result path. No-op when no tab is connected.
        """
        socket = self._sockets.get(session_id)
        if socket is None:
            return
        try:
            await socket.send_json(message.model_dump())
        except Exception:  # noqa: BLE001 - activity is best-effort, never fail a call
            logger.debug("Failed to push tool_activity for %s", session_id, exc_info=True)

    # -- harness liveness (B2) ------------------------------------------

    def touch_harness(self, session_id: str) -> None:
        """Update harness last_seen timestamp on every /mcp call.

        Called unconditionally by the router on every authenticated /mcp
        request so the TTL sweep has a fresh timestamp to compare against.
        """
        record = self._store.get(session_id)
        if record is None:
            return
        record.harness_last_seen = time.monotonic()
        record.harness_last_seen_ms = int(time.time() * 1000)

    async def mark_harness_attached(self, session_id: str) -> None:
        """Mark a session harness-attached on initialize, emitting a status frame.

        Flips ``harness_attached`` from false to true and pushes a
        ``harness_status`` frame over the live browser WS (best-effort).
        If the harness was already attached, the frame is still pushed so the
        browser can update its ``last_activity_ms`` display.
        """
        record = self._store.get(session_id)
        if record is None:
            return
        was_attached = record.harness_attached
        record.harness_attached = True
        if not was_attached:
            logger.debug("Harness attached for session %s", session_id)
        await self._push_harness_status(session_id, record)

    async def sweep_harness_liveness(self, session_id: str) -> bool:
        """Revert harness-attached to false if the TTL has elapsed.

        Returns True if the status was reverted (i.e. the harness was previously
        attached but is now considered gone). Best-effort: if no socket is live
        the state is updated but no frame is pushed.
        """
        record = self._store.get(session_id)
        if record is None or not record.harness_attached:
            return False
        if record.harness_last_seen is None:
            # Attached but never seen (should not happen, but guard it).
            record.harness_attached = False
            await self._push_harness_status(session_id, record)
            return True
        age = time.monotonic() - record.harness_last_seen
        if age > HARNESS_LIVENESS_TTL_SECONDS:
            record.harness_attached = False
            logger.debug("Harness detached (TTL %.0fs elapsed) for session %s", age, session_id)
            await self._push_harness_status(session_id, record)
            return True
        return False

    async def _push_harness_status(self, session_id: str, record: Any) -> None:
        """Push a harness_status frame to the live browser socket (best-effort)."""
        socket = self._sockets.get(session_id)
        if socket is None:
            return
        msg = HarnessStatusMessage(
            attached=record.harness_attached,
            last_activity_ms=record.harness_last_seen_ms,
        )
        try:
            await socket.send_json(msg.model_dump())
        except Exception:  # noqa: BLE001 - best-effort; never fail a call on the status push
            logger.debug("Failed to push harness_status for %s", session_id, exc_info=True)

    # -- harness -> browser invocation ----------------------------------

    async def invoke(
        self,
        session_id: str,
        tool_name: str,
        args: dict[str, Any],
        *,
        timeout: float = INVOKE_TIMEOUT_SECONDS,
    ) -> Any:
        """Dispatch a tool call to the browser and await its result.

        Raises :class:`RelayError` if there is no live browser socket, the call
        times out, the socket disconnects, or the browser returns an error.
        """
        socket = self._sockets.get(session_id)
        if socket is None or not self.is_connected(session_id):
            raise RelayError("No live browser session for this connection")

        call_id = str(uuid.uuid4())
        message = InvokeMessage(call_id=call_id, tool_name=tool_name, args=args)
        loop = asyncio.get_running_loop()
        future: asyncio.Future[Any] = loop.create_future()
        pending = PendingInvocation(
            call_id=call_id,
            session_id=session_id,
            payload=message,
            future=future,
        )
        self._pending[call_id] = pending

        try:
            await socket.send_json(message.model_dump())
            pending.delivered_at = loop.time()
        except Exception as exc:  # noqa: BLE001 - surface any transport failure uniformly
            self._pending.pop(call_id, None)
            raise RelayError(f"Failed to dispatch tool call: {exc}") from exc

        try:
            return await asyncio.wait_for(future, timeout=timeout)
        except TimeoutError as exc:
            raise RelayError(f"Tool call timed out after {timeout:.0f}s") from exc
        finally:
            self._pending.pop(call_id, None)

    def resolve_result(self, result: ResultMessage) -> None:
        """Resolve the pending future for a ``result`` message from the browser."""
        pending = self._pending.get(result.call_id)
        if pending is None:
            logger.debug("Dropping result for unknown call_id %s", result.call_id)
            return
        if pending.future.done():
            return
        if result.error is not None:
            pending.future.set_exception(RelayError(result.error))
        else:
            pending.future.set_result(result.result)

    def _reject_pending(self, session_id: str, reason: str) -> None:
        for call_id, pending in list(self._pending.items()):
            if pending.session_id != session_id:
                continue
            if not pending.future.done():
                pending.future.set_exception(RelayError(reason))
            self._pending.pop(call_id, None)

    # -- mutation confirmation (human-in-the-loop) ----------------------

    def is_mutation(self, session_id: str, tool_name: str) -> bool:
        """Return whether ``tool_name`` is a guarded mutation for this session.

        A tool is a mutation if a server-side guarded write tool of that name
        exists in the registry, or if the browser-pushed catalogue tagged it
        ``mutation: true``.
        """
        from webmcp_relay.registry import get_guarded_write_tool

        if get_guarded_write_tool(tool_name) is not None:
            return True
        for tool in self.list_tools(session_id):
            if tool.name == tool_name:
                return tool.mutation
        return False

    async def confirm(
        self,
        session_id: str,
        tool_name: str,
        args: dict[str, Any],
        *,
        summary: str,
        timeout: float = CONFIRMATION_TIMEOUT_SECONDS,
    ) -> str:
        """Hold a mutation for browser approval; return the approved ``call_id``.

        Creates a :class:`PendingCall`, pushes a ``confirmation_request`` to the
        live browser socket, and blocks until the user approves or denies, or
        the call times out. Raises :class:`ConfirmationError` on denial,
        timeout, or when there is no live browser tab to confirm in.
        """
        socket = self._sockets.get(session_id)
        if socket is None or not self.is_connected(session_id):
            raise no_browser_error()

        call_id = str(uuid.uuid4())
        loop = asyncio.get_running_loop()
        future: asyncio.Future[bool] = loop.create_future()
        pending = PendingCall(
            call_id=call_id,
            session_id=session_id,
            tool_name=tool_name,
            tool_args=args,
            summary=summary,
            future=future,
        )
        self._pending_calls[call_id] = pending

        request = ConfirmationRequestMessage(
            call_id=call_id,
            tool_name=tool_name,
            summary=summary,
            args_preview=pending.args_preview(),
            expires_at=pending.expires_at_iso(),
        )
        try:
            await socket.send_json(request.model_dump())
        except Exception as exc:  # noqa: BLE001 - surface transport failure uniformly
            self._pending_calls.pop(call_id, None)
            raise no_browser_error() from exc

        try:
            approved = await asyncio.wait_for(future, timeout=timeout)
        except TimeoutError as exc:
            pending.status = "expired"
            await self._notify_expired(session_id, call_id)
            raise timeout_error(timeout) from exc
        finally:
            self._pending_calls.pop(call_id, None)

        if not approved:
            raise denied_error()
        return call_id

    def resolve_confirmation(self, message: ConfirmationResponseMessage) -> None:
        """Resolve a held mutation from a browser ``confirmation_response``."""
        pending = self._pending_calls.get(message.call_id)
        if pending is None:
            logger.debug("Dropping confirmation for unknown call_id %s", message.call_id)
            return
        if pending.future.done():
            return
        approved = message.decision == "approved"
        pending.status = "approved" if approved else "denied"
        pending.future.set_result(approved)

    def pending_calls_for(self, session_id: str) -> list[PendingCall]:
        """Return the still-pending mutations for a session (reconnect resurface)."""
        return [
            call
            for call in self._pending_calls.values()
            if call.session_id == session_id and call.status == "pending"
        ]

    async def _notify_expired(self, session_id: str, call_id: str) -> None:
        socket = self._sockets.get(session_id)
        if socket is None:
            return
        try:
            await socket.send_json(ConfirmationExpiredMessage(call_id=call_id).model_dump())
        except Exception:  # noqa: BLE001 - best-effort; the harness already saw the timeout
            logger.debug("Failed to push confirmation_expired for %s", session_id, exc_info=True)

    def _reject_pending_confirmations(self, session_id: str) -> None:
        for call_id, pending in list(self._pending_calls.items()):
            if pending.session_id != session_id:
                continue
            if not pending.future.done():
                pending.status = "denied"
                pending.future.set_exception(
                    ConfirmationError(
                        "Browser session disconnected before confirmation.",
                        code=-32003,
                    )
                )
            self._pending_calls.pop(call_id, None)

    # -- heartbeat ------------------------------------------------------

    async def heartbeat_loop(self, session_id: str, websocket: WebSocketLike) -> None:
        """Send a ``ping`` every interval until the socket is detached.

        The browser widget answers with ``pong``; absence of a pong is detected
        by the receive loop (a dead socket raises on the next receive) rather
        than tracked here, keeping this loop a simple keepalive.
        """
        ping = PingMessage().model_dump()
        try:
            while session_id in self._sockets:
                await asyncio.sleep(HEARTBEAT_INTERVAL_SECONDS)
                if session_id not in self._sockets:
                    return
                await websocket.send_json(ping)
        except asyncio.CancelledError:
            raise
        except Exception:  # noqa: BLE001 - dead socket; receive loop handles teardown
            logger.debug("Heartbeat loop ended for %s", session_id, exc_info=True)
            return

    def make_tools_message(
        self, session_id: str, *, changed: bool = False
    ) -> ToolsListMessage | ToolsChangedMessage:
        tools = self.list_tools(session_id)
        if changed:
            return ToolsChangedMessage(type="tools/changed", tools=tools)
        return ToolsListMessage(type="tools/list", tools=tools)


_relay: SessionRelay | None = None


def get_relay() -> SessionRelay:
    """Return the process-wide :class:`SessionRelay` singleton."""
    global _relay
    if _relay is None:
        _relay = SessionRelay()
    return _relay


def reset_relay() -> None:
    """Reset the singleton (test helper)."""
    global _relay
    if _relay is not None:
        for pending in list(_relay._pending.values()):  # noqa: SLF001 - test cleanup
            if not pending.future.done():
                with contextlib.suppress(Exception):
                    pending.future.cancel()
        for call in list(_relay._pending_calls.values()):  # noqa: SLF001 - test cleanup
            if not call.future.done():
                with contextlib.suppress(Exception):
                    call.future.cancel()
    _relay = None
