"""In-memory session store for the relay.

Holds the authoritative state binding browser sessions, pairing codes,
connection tokens, and in-flight invocations.  Defined behind the
:class:`SessionStore` abstract interface so a shared backend (Redis/Postgres)
can be dropped in for multi-process deployments without changing
:class:`~webmcp_relay.relay.SessionRelay`.

Lifecycle (see ``.notes/web-mcp-investigations/relay.md`` §4-5):

* ``pending``      - session issued, browser WebSocket not yet connected.
* ``connected``    - browser WebSocket open; tools pushed.
* ``disconnected`` - WebSocket closed; 15-minute reconnect grace before expiry.
"""

from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any, Literal, Protocol, runtime_checkable

from webmcp_relay.protocol import ToolDefinition

if TYPE_CHECKING:
    from webmcp_relay.protocol import InvokeMessage

SessionState = Literal["pending", "connected", "disconnected"]

# TTLs (seconds).  Pending sessions get a short window to attach a browser WS;
# disconnected sessions get the locked 15-minute reconnect grace.
PENDING_TTL_SECONDS = 600
RECONNECT_GRACE_SECONDS = 900  # 15 minutes (locked)
# Durable connection-token life: an open/connected tab keeps its session alive
# for this long so the token the user pasted into their harness stays valid
# (static-header harnesses like Claude Code cannot swap tokens mid-session).
CONNECTION_TOKEN_TTL_SECONDS = 12 * 3600  # 12 hours


@dataclass(slots=True)
class PendingInvocation:
    """A tool call dispatched to the browser, awaiting a ``result``.

    The ``payload`` and ``delivered_at`` fields are the no-op resumption slot:
    v1 rejects these on disconnect, but persisting them means re-delivery can
    be added later without a schema change.
    """

    call_id: str
    session_id: str
    payload: InvokeMessage
    future: asyncio.Future[Any]
    created_at: float = field(default_factory=time.monotonic)
    delivered_at: float | None = None


@dataclass(slots=True)
class SessionRecord:
    """Authoritative state for one browser session (one tab)."""

    session_id: str
    tab_id: str
    state: SessionState = "pending"
    created_at: float = field(default_factory=time.monotonic)
    expires_at: float = field(default_factory=lambda: time.monotonic() + PENDING_TTL_SECONDS)

    # Single-use pairing token; cleared (set to None) the instant it is consumed.
    pairing_token: str | None = None
    # Durable connection tokens bound to this session (one per harness).
    connection_tokens: set[str] = field(default_factory=set)
    # Absolute monotonic deadline for the durable connection token(s). The
    # harness bearer stops validating past this, independent of the WebSocket
    # reconnect lifecycle. Set when a connection token is minted/refreshed.
    connection_token_expires_at: float | None = None

    # Last full catalogue pushed by the browser via tools/list / tools/changed.
    tools: list[ToolDefinition] = field(default_factory=list)

    # Harness-liveness state (B2): true once the harness sends initialize,
    # reverted to false after the inactivity TTL sweep.
    harness_attached: bool = False
    # Monotonic timestamp of the last /mcp call from the harness (None = never).
    harness_last_seen: float | None = None
    # Wall-clock millisecond timestamp matching harness_last_seen, for the
    # harness_status wire frame sent to the browser.
    harness_last_seen_ms: int | None = None

    def is_expired(self, now: float | None = None) -> bool:
        return (now if now is not None else time.monotonic()) >= self.expires_at

    def is_connection_token_expired(self, now: float | None = None) -> bool:
        """Whether the durable connection token has passed its 12h deadline."""
        if self.connection_token_expires_at is None:
            return False
        moment = now if now is not None else time.monotonic()
        return moment >= self.connection_token_expires_at

    def touch_connected(self) -> None:
        """Mark connected and extend expiry while the WebSocket is live."""
        self.state = "connected"
        # Keep an open tab's session alive for the durable token's full life so
        # the harness bearer does not lapse while the user is working.
        self.expires_at = time.monotonic() + CONNECTION_TOKEN_TTL_SECONDS

    def touch_disconnected(self) -> None:
        """Enter the reconnect grace window after a WebSocket close.

        Keep the session resolvable for at least as long as the durable
        connection token is valid, so a page reload within the token's life can
        re-attach to the same session rather than landing in a dead state.
        """
        self.state = "disconnected"
        grace = time.monotonic() + RECONNECT_GRACE_SECONDS
        if self.connection_token_expires_at is not None:
            self.expires_at = max(grace, self.connection_token_expires_at)
        else:
            self.expires_at = grace


@runtime_checkable
class SessionStore(Protocol):
    """Pluggable session-store interface.

    Methods are synchronous because the in-memory implementation needs no I/O;
    a networked backend would wrap these or expose async variants behind the
    same shape.
    """

    def create(self, record: SessionRecord) -> None: ...
    def get(self, session_id: str) -> SessionRecord | None: ...
    def delete(self, session_id: str) -> None: ...
    def all_sessions(self) -> list[SessionRecord]: ...

    def get_by_pairing_token(self, token: str) -> SessionRecord | None: ...
    def get_by_connection_token(self, token: str) -> SessionRecord | None: ...

    def consume_pairing_token(self, token: str, connection_token: str) -> SessionRecord | None: ...
    def bind_connection_token(self, session_id: str, connection_token: str) -> None: ...
    def revoke_connection_token(self, token: str) -> None: ...

    def purge_expired(self, now: float | None = None) -> list[str]: ...


class InMemorySessionStore:
    """Single-process :class:`SessionStore` backed by plain dicts.

    Sufficient for one uvicorn worker. Multi-process deployments need a shared
    backend plus sticky WebSocket routing (out of scope for v1).
    """

    def __init__(self) -> None:
        self._sessions: dict[str, SessionRecord] = {}
        self._pairing_index: dict[str, str] = {}
        self._connection_index: dict[str, str] = {}

    def create(self, record: SessionRecord) -> None:
        self._sessions[record.session_id] = record
        if record.pairing_token:
            self._pairing_index[record.pairing_token] = record.session_id

    def get(self, session_id: str) -> SessionRecord | None:
        return self._sessions.get(session_id)

    def delete(self, session_id: str) -> None:
        record = self._sessions.pop(session_id, None)
        if record is None:
            return
        if record.pairing_token:
            self._pairing_index.pop(record.pairing_token, None)
        for token in record.connection_tokens:
            self._connection_index.pop(token, None)

    def all_sessions(self) -> list[SessionRecord]:
        return list(self._sessions.values())

    def get_by_pairing_token(self, token: str) -> SessionRecord | None:
        session_id = self._pairing_index.get(token)
        return self._sessions.get(session_id) if session_id else None

    def get_by_connection_token(self, token: str) -> SessionRecord | None:
        session_id = self._connection_index.get(token)
        return self._sessions.get(session_id) if session_id else None

    def consume_pairing_token(self, token: str, connection_token: str) -> SessionRecord | None:
        """Single-use exchange: pairing token -> connection token.

        Returns the bound session, or ``None`` if the pairing token is unknown
        or already consumed. The pairing token is removed atomically so a
        concurrent second presentation cannot double-pair.
        """
        session_id = self._pairing_index.pop(token, None)
        if session_id is None:
            return None
        record = self._sessions.get(session_id)
        if record is None:
            return None
        record.pairing_token = None
        record.connection_tokens.add(connection_token)
        self._connection_index[connection_token] = session_id
        return record

    def bind_connection_token(self, session_id: str, connection_token: str) -> None:
        """Attach an additional connection token to a session (refresh/rotate)."""
        record = self._sessions.get(session_id)
        if record is None:
            return
        record.connection_tokens.add(connection_token)
        self._connection_index[connection_token] = session_id

    def revoke_connection_token(self, token: str) -> None:
        session_id = self._connection_index.pop(token, None)
        if session_id is None:
            return
        record = self._sessions.get(session_id)
        if record is not None:
            record.connection_tokens.discard(token)

    def purge_expired(self, now: float | None = None) -> list[str]:
        """Drop expired sessions; return the ids removed."""
        moment = now if now is not None else time.monotonic()
        expired = [s.session_id for s in self._sessions.values() if s.is_expired(moment)]
        for session_id in expired:
            self.delete(session_id)
        return expired
