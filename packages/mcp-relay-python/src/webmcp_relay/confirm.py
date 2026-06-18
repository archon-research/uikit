"""Edit-confirmation protocol: pending mutations + guarded write tools.

This is the BE-CONFIRM workstream. It layers a human-in-the-loop gate over the
relay so that every tool tagged ``mutation: true`` is held server-side until the
user approves it in the browser (decision 6: no silent writes).

Pieces:

* :class:`PendingCall` - the server-side record for a held mutation, carrying
  the future the harness ``tools/call`` blocks on.
* :class:`ConfirmationError` - raised when a mutation is denied or times out, so
  the router can map it to a structured MCP error.
* :class:`GuardedWriteTool` - a server-side write tool spec gated by browser
  confirmation. Instances are registered via
  ``webmcp_relay.registry.register_guarded_write`` at host startup.

The wire shape (``confirmation_request`` / ``confirmation_response`` /
``confirmation_expired``) lives in :mod:`webmcp_relay.protocol`. The routing
and lifecycle live in :class:`webmcp_relay.relay.SessionRelay`.

Note: the ``echo_write`` demo tool was previously defined here. It has been
moved to the host application or test fixtures, so the relay package itself
registers no write tools by default.
"""

from __future__ import annotations

import asyncio
import time
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any, Literal

ConfirmationStatus = Literal["pending", "approved", "denied", "expired"]

# Default confirmation window (see confirm note §4): generous for a human to
# read the dialog, short enough that a stale tab does not block a harness.
CONFIRMATION_TIMEOUT_SECONDS = 120.0


class ConfirmationError(Exception):
    """Raised when a guarded mutation is not approved.

    ``code`` mirrors the JSON-RPC error codes chosen in the confirm note:
    ``-32001`` for timeout, ``-32002`` for an explicit user denial, ``-32003``
    when there is no live browser tab to confirm in.
    """

    def __init__(self, message: str, *, code: int) -> None:
        super().__init__(message)
        self.code = code


def denied_error() -> ConfirmationError:
    return ConfirmationError("User denied this action.", code=-32002)


def timeout_error(seconds: float) -> ConfirmationError:
    return ConfirmationError(f"Confirmation timed out after {seconds:.0f}s.", code=-32001)


def no_browser_error() -> ConfirmationError:
    return ConfirmationError(
        "No live browser session to confirm this action; open the Explorer tab.",
        code=-32003,
    )


@dataclass(slots=True)
class PendingCall:
    """A mutating tool call held for browser confirmation.

    The harness ``tools/call`` request blocks on :attr:`future` until the user
    approves/denies in the browser or the call expires.
    """

    call_id: str
    session_id: str
    tool_name: str
    tool_args: dict[str, Any]
    summary: str
    future: asyncio.Future[bool]
    created_at: float = field(default_factory=time.monotonic)
    expires_at: float = field(
        default_factory=lambda: time.monotonic() + CONFIRMATION_TIMEOUT_SECONDS
    )
    status: ConfirmationStatus = "pending"

    def expires_at_iso(self) -> str:
        """Wall-clock ISO-8601 expiry, derived from the monotonic deadline.

        Millisecond precision with a trailing Z to match the TS core's
        Date.toISOString() so both relays emit identically-shaped timestamps.
        """
        seconds_from_now = max(0.0, self.expires_at - time.monotonic())
        moment = datetime.fromtimestamp(time.time() + seconds_from_now, tz=UTC)
        return moment.strftime("%Y-%m-%dT%H:%M:%S.") + f"{moment.microsecond // 1000:03d}Z"

    def args_preview(self) -> dict[str, Any]:
        """A shallow, JSON-safe-ish view of the arguments for the dialog."""
        return dict(self.tool_args)


# ---------------------------------------------------------------------------
# Guarded server-side write tools
# ---------------------------------------------------------------------------


@dataclass(slots=True)
class GuardedWriteTool:
    """A server-executed write tool gated behind browser confirmation.

    These complement the browser-hosted UI tools: a guarded write tool is
    declared server-side (so it works even when the browser is only the
    confirmation surface, not the executor) but still requires approval.

    ``confirmation_summary`` turns the raw arguments into the one plain-English
    sentence the dialog shows (confirm note §3). ``handler`` runs only after
    approval; it may be sync or async.

    Register instances via ``webmcp_relay.registry.register_guarded_write``
    at host startup.
    """

    name: str
    description: str
    input_schema: dict[str, Any]
    handler: Callable[[dict[str, Any]], Any | Awaitable[Any]]
    confirmation_summary: Callable[[dict[str, Any]], str]
    mutation: bool = True

    async def execute(self, args: dict[str, Any]) -> Any:
        result = self.handler(args)
        if asyncio.iscoroutine(result):
            return await result
        return result


def get_guarded_write_tool(name: str) -> GuardedWriteTool | None:
    """Look up a registered guarded-write tool by name.

    Delegates to the registry so callers do not need to import it directly.
    """
    from webmcp_relay.registry import get_guarded_write_tool as _registry_get

    return _registry_get(name)
