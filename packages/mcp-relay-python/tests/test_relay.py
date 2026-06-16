"""Tests for the session relay: token model, store, routing, lifecycle.

Async relay-core tests drive ``SessionRelay`` directly via ``asyncio.run`` (the
repo has no pytest-asyncio plugin). HTTP/WebSocket endpoint tests use FastAPI's
synchronous ``TestClient``.
"""

from __future__ import annotations

import asyncio
import time
from typing import Any

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from webmcp_relay import SessionRelay, get_relay, reset_relay, router
from webmcp_relay.confirm import ConfirmationError, GuardedWriteTool, get_guarded_write_tool
from webmcp_relay.protocol import (
    ConfirmationResponseMessage,
    HelloMessage,
    ResultMessage,
    ToolDefinition,
    ToolInputSchema,
)
from webmcp_relay.registry import (
    PromptSpec,
    ServerToolSpec,
    clear_registries,
    register_guarded_write,
    register_prompts,
    register_server_tool,
)
from webmcp_relay.store import (
    InMemorySessionStore,
    SessionRecord,
)
from webmcp_relay.tokens import (
    decode_connection_jwt,
    encode_connection_jwt,
    new_connection_id,
    new_pairing_token,
    new_session_id,
    parse_bearer,
)

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


def _make_echo_write_tool() -> GuardedWriteTool:
    """Build the echo_write demo guarded write tool (previously in confirm.py)."""
    return GuardedWriteTool(
        name="synome.demo.echo_write",
        description="Demo guarded write for testing confirmation path.",
        input_schema={
            "type": "object",
            "properties": {"message": {"type": "string"}},
            "required": ["message"],
        },
        handler=lambda args: {"written": True, "message": args.get("message", "")},
        confirmation_summary=lambda args: f"Record message: {args.get('message', '')!r}",
    )


@pytest.fixture(autouse=True)
def _fresh_relay() -> Any:
    reset_relay()
    clear_registries()
    # Register the echo_write demo so existing tests that reference
    # "synome.demo.echo_write" continue to work.
    register_guarded_write(_make_echo_write_tool())
    yield
    reset_relay()
    clear_registries()


@pytest.fixture
def client() -> TestClient:
    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


def _tool(name: str = "explorer.search") -> ToolDefinition:
    return ToolDefinition(
        name=name,
        description="search",
        input_schema=ToolInputSchema(properties={"q": {"type": "string"}}, required=["q"]),
    )


class _FakeSocket:
    """Captures invoke frames pushed by the relay."""

    def __init__(self) -> None:
        self.sent: list[dict[str, Any]] = []

    async def send_json(self, data: Any) -> None:
        self.sent.append(data)


# ---------------------------------------------------------------------------
# Tokens
# ---------------------------------------------------------------------------


def test_pairing_token_is_base58_and_unique() -> None:
    tokens = {new_pairing_token() for _ in range(200)}
    assert len(tokens) == 200
    ambiguous = set("0OIl")
    for token in tokens:
        assert len(token) == 12
        assert ambiguous.isdisjoint(token)


def test_parse_bearer() -> None:
    assert parse_bearer("Bearer abc123") == "abc123"
    assert parse_bearer("bearer abc123") == "abc123"
    assert parse_bearer("Basic abc123") is None
    assert parse_bearer(None) is None
    assert parse_bearer("Bearer ") is None


def test_connection_jwt_roundtrip_and_claims() -> None:
    token = encode_connection_jwt(subject="user", channel_id="chan", tab_id="tab")
    claims = decode_connection_jwt(token)
    assert claims is not None
    assert claims.channel_id == "chan"
    assert claims.tab_id == "tab"
    assert claims.aud == "synome-mcp"
    assert claims.scope == "mcp:tools"
    assert claims.exp > claims.iat


def test_connection_jwt_rejects_garbage() -> None:
    assert decode_connection_jwt("not.a.jwt") is None


# ---------------------------------------------------------------------------
# Session store: token roles
# ---------------------------------------------------------------------------


def test_pairing_token_single_use_exchange() -> None:
    store = InMemorySessionStore()
    pairing = new_pairing_token()
    record = SessionRecord(session_id=new_session_id(), tab_id="tab", pairing_token=pairing)
    store.create(record)

    conn = new_connection_id()
    bound = store.consume_pairing_token(pairing, conn)
    assert bound is record
    assert bound.pairing_token is None
    assert conn in bound.connection_tokens

    # Second use must fail (single-use).
    assert store.consume_pairing_token(pairing, new_connection_id()) is None
    # Connection token now resolves the session.
    assert store.get_by_connection_token(conn) is record


def test_purge_expired_drops_only_expired() -> None:
    store = InMemorySessionStore()
    live = SessionRecord(session_id="live", tab_id="t")
    dead = SessionRecord(session_id="dead", tab_id="t")
    dead.expires_at = time.monotonic() - 1
    store.create(live)
    store.create(dead)

    removed = store.purge_expired()
    assert removed == ["dead"]
    assert store.get("live") is live
    assert store.get("dead") is None


# ---------------------------------------------------------------------------
# Relay core: invoke routing and lifecycle
# ---------------------------------------------------------------------------


def test_invoke_routes_to_socket_and_resolves_future() -> None:
    async def scenario() -> Any:
        relay = SessionRelay()
        record = SessionRecord(session_id="s1", tab_id="t")
        relay.store.create(record)
        socket = _FakeSocket()
        relay.attach_socket("s1", socket)

        async def respond() -> None:
            # Wait until the invoke frame is pushed, then return a result.
            while not socket.sent:
                await asyncio.sleep(0)
            call_id = socket.sent[0]["call_id"]
            relay.resolve_result(ResultMessage(type="result", call_id=call_id, result={"ok": 1}))

        responder = asyncio.ensure_future(respond())
        result = await relay.invoke("s1", "explorer.search", {"q": "x"})
        await responder
        return result, socket.sent[0]

    result, frame = asyncio.run(scenario())
    assert result == {"ok": 1}
    assert frame["type"] == "invoke"
    assert frame["tool_name"] == "explorer.search"
    assert frame["args"] == {"q": "x"}


def test_invoke_without_socket_raises() -> None:
    async def scenario() -> None:
        relay = SessionRelay()
        relay.store.create(SessionRecord(session_id="s1", tab_id="t"))
        with pytest.raises(Exception, match="No live browser session"):
            await relay.invoke("s1", "explorer.search", {})

    asyncio.run(scenario())


def test_invoke_propagates_browser_error() -> None:
    async def scenario() -> None:
        relay = SessionRelay()
        relay.store.create(SessionRecord(session_id="s1", tab_id="t"))
        socket = _FakeSocket()
        relay.attach_socket("s1", socket)

        async def respond() -> None:
            while not socket.sent:
                await asyncio.sleep(0)
            call_id = socket.sent[0]["call_id"]
            relay.resolve_result(
                ResultMessage(type="result", call_id=call_id, result=None, error="boom")
            )

        responder = asyncio.ensure_future(respond())
        with pytest.raises(Exception, match="boom"):
            await relay.invoke("s1", "explorer.search", {})
        await responder

    asyncio.run(scenario())


def test_invoke_times_out() -> None:
    async def scenario() -> None:
        relay = SessionRelay()
        relay.store.create(SessionRecord(session_id="s1", tab_id="t"))
        relay.attach_socket("s1", _FakeSocket())
        with pytest.raises(Exception, match="timed out"):
            await relay.invoke("s1", "explorer.search", {}, timeout=0.01)

    asyncio.run(scenario())


def test_detach_rejects_pending_calls() -> None:
    async def scenario() -> None:
        relay = SessionRelay()
        relay.store.create(SessionRecord(session_id="s1", tab_id="t"))
        socket = _FakeSocket()
        relay.attach_socket("s1", socket)

        invoke_task = asyncio.ensure_future(relay.invoke("s1", "explorer.search", {}))
        # Let the invoke register its pending future.
        while not socket.sent:
            await asyncio.sleep(0)
        relay.detach_socket("s1")
        with pytest.raises(Exception, match="disconnected"):
            await invoke_task

    asyncio.run(scenario())


def test_detach_enters_reconnect_grace() -> None:
    relay = SessionRelay()
    relay.store.create(SessionRecord(session_id="s1", tab_id="t"))
    relay.attach_socket("s1", _FakeSocket())
    assert relay.is_connected("s1")
    relay.detach_socket("s1")
    record = relay.store.get("s1")
    assert record is not None
    assert record.state == "disconnected"
    # Grace window keeps the session alive (15 min) rather than deleting it.
    assert not record.is_expired()
    assert not relay.is_connected("s1")


def test_set_and_list_tools() -> None:
    relay = SessionRelay()
    relay.store.create(SessionRecord(session_id="s1", tab_id="t"))
    relay.attach_socket("s1", _FakeSocket())
    relay.set_tools("s1", [_tool("a"), _tool("b")])
    names = [t.name for t in relay.list_tools("s1")]
    assert names == ["a", "b"]


def test_notify_activity_sends_frame_to_live_socket() -> None:
    from webmcp_relay.protocol import ToolActivityMessage

    async def scenario() -> list[Any]:
        relay = SessionRelay()
        relay.store.create(SessionRecord(session_id="s1", tab_id="t"))
        socket = _FakeSocket()
        relay.attach_socket("s1", socket)
        await relay.notify_activity(
            "s1",
            ToolActivityMessage(
                activity_id="a1",
                tool_name="synome.branches.list",
                kind="data",
                status="started",
            ),
        )
        return socket.sent

    sent = asyncio.run(scenario())
    assert len(sent) == 1
    assert sent[0]["type"] == "tool_activity"
    assert sent[0]["tool_name"] == "synome.branches.list"
    assert sent[0]["status"] == "started"


def test_notify_activity_without_socket_is_noop() -> None:
    from webmcp_relay.protocol import ToolActivityMessage

    async def scenario() -> None:
        relay = SessionRelay()
        # No live socket: best-effort push must not raise.
        await relay.notify_activity(
            "missing",
            ToolActivityMessage(activity_id="a1", tool_name="x", kind="ui", status="ok"),
        )

    asyncio.run(scenario())


# ---------------------------------------------------------------------------
# HTTP endpoints
# ---------------------------------------------------------------------------


def test_create_session_issues_pairing_token(client: TestClient) -> None:
    response = client.post("/api/sessions", json={})
    assert response.status_code == 200
    body = response.json()
    assert body["session_id"]
    assert len(body["pairing_token"]) == 12
    assert body["ws_url"].startswith("ws")
    # The pairing token resolves a pending session in the shared relay.
    assert get_relay().store.get_by_pairing_token(body["pairing_token"]) is not None


def test_mcp_requires_bearer(client: TestClient) -> None:
    response = client.post("/mcp", json={"method": "initialize", "id": 1})
    assert response.status_code == 401


def test_mcp_rejects_unknown_token(client: TestClient) -> None:
    response = client.post(
        "/mcp",
        json={"method": "initialize", "id": 1},
        headers={"Authorization": "Bearer nope"},
    )
    assert response.status_code == 401


def test_mcp_initialize_with_connection_token(client: TestClient) -> None:
    sess = client.post("/api/sessions", json={}).json()
    token = sess["connection_token"]

    response = client.post(
        "/mcp",
        json={"method": "initialize", "id": 1},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["result"]["_synome"]["session_id"] == sess["session_id"]

    # Stateless auth: the same connection token keeps working (not single-use).
    again = client.post(
        "/mcp",
        json={"method": "tools/list", "id": 2},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert again.status_code == 200


def test_websocket_hello_accept_and_tools_ingest(client: TestClient) -> None:
    """The browser WS handshake accepts hello and ingests the tools catalogue."""
    sess = client.post("/api/sessions", json={}).json()
    session_id = sess["session_id"]
    relay = get_relay()

    with client.websocket_connect(f"/ws/sessions/{session_id}") as ws:
        ws.send_json(
            HelloMessage(
                type="hello",
                tab_id="tab",
                origin="http://x",
                url="http://x",
                title="t",
                connection_token=sess["connection_token"],
            ).model_dump()
        )
        accepted = ws.receive_json()
        assert accepted["type"] == "hello/accepted"
        assert accepted["session_id"] == session_id

        ws.send_json({"type": "tools/list", "tools": [_tool().model_dump()]})
        # Heartbeat or echo-free; poll the relay state until the catalogue lands.
        deadline = time.monotonic() + 2
        while not relay.list_tools(session_id) and time.monotonic() < deadline:
            time.sleep(0.01)

    assert [t.name for t in relay.list_tools(session_id)] == ["explorer.search"]
    # After the context exits, the WS is detached and the session is in grace.
    grace = relay.store.get(session_id)
    assert grace is not None
    assert grace.state == "disconnected"


def test_websocket_rejects_hello_without_valid_token(client: TestClient) -> None:
    """A hello lacking a valid connection token gets a clean hello/rejected.

    (Not an opaque pre-accept close -- that is what made the client retry
    forever after a backend restart.)
    """
    session_id = client.post("/api/sessions", json={}).json()["session_id"]
    with client.websocket_connect(f"/ws/sessions/{session_id}") as ws:
        ws.send_json(
            HelloMessage(
                type="hello", tab_id="t", origin="http://x", url="http://x"
            ).model_dump()  # no connection_token
        )
        msg = ws.receive_json()
        assert msg["type"] == "hello/rejected"


def test_mcp_tools_call_without_browser_returns_tool_error(client: TestClient) -> None:
    """A tools/call with no live browser socket returns an MCP isError result.

    (Concurrent invoke-then-resolve routing is covered at the asyncio core
    level by ``test_invoke_routes_to_socket_and_resolves_future``; the
    TestClient portal cannot pump a concurrent WS receive loop.)
    """
    sess = client.post("/api/sessions", json={}).json()
    session_id = sess["session_id"]
    relay = get_relay()
    relay.attach_socket(session_id, _FakeSocket())
    relay.set_tools(session_id, [_tool()])
    # Drop the socket reference but keep state connected to hit the
    # "No live browser session" branch inside invoke().
    relay._sockets.pop(session_id)  # noqa: SLF001 - exercise routing failure

    response = client.post(
        "/mcp",
        json={
            "method": "tools/call",
            "id": 9,
            "params": {"name": "explorer.search", "arguments": {"q": "x"}},
        },
        headers={"Authorization": f"Bearer {sess['connection_token']}"},
    )
    assert response.status_code == 200
    result = response.json()["result"]
    assert result["isError"] is True
    assert "No live browser session" in result["content"][0]["text"]


def test_token_refresh_requires_valid_connection_token(client: TestClient) -> None:
    response = client.post("/mcp/token/refresh", headers={"Authorization": "Bearer unknown"})
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# Edit-confirmation protocol (BE-CONFIRM)
# ---------------------------------------------------------------------------


def _mutation_tool(name: str = "explorer.delete") -> ToolDefinition:
    return ToolDefinition(
        name=name,
        description="delete",
        input_schema=ToolInputSchema(properties={"id": {"type": "string"}}, required=["id"]),
        mutation=True,
    )


def test_guarded_write_tool_registered() -> None:
    tool = get_guarded_write_tool("synome.demo.echo_write")
    assert tool is not None
    assert tool.mutation is True
    assert "message" in tool.input_schema["properties"]


def test_is_mutation_detects_server_and_browser_tools() -> None:
    relay = SessionRelay()
    relay.store.create(SessionRecord(session_id="s1", tab_id="t"))
    relay.attach_socket("s1", _FakeSocket())
    relay.set_tools("s1", [_tool("explorer.search"), _mutation_tool("explorer.delete")])

    assert relay.is_mutation("s1", "synome.demo.echo_write") is True  # server-side guarded
    assert relay.is_mutation("s1", "explorer.delete") is True  # browser, mutation=True
    assert relay.is_mutation("s1", "explorer.search") is False  # browser, read-only


def test_confirm_approve_pushes_request_and_returns_call_id() -> None:
    async def scenario() -> Any:
        relay = SessionRelay()
        relay.store.create(SessionRecord(session_id="s1", tab_id="t"))
        socket = _FakeSocket()
        relay.attach_socket("s1", socket)

        async def respond() -> None:
            while not socket.sent:
                await asyncio.sleep(0)
            call_id = socket.sent[0]["call_id"]
            relay.resolve_confirmation(
                ConfirmationResponseMessage(
                    type="confirmation_response", call_id=call_id, decision="approved"
                )
            )

        responder = asyncio.ensure_future(respond())
        call_id = await relay.confirm("s1", "x.write", {"a": 1}, summary="do it")
        await responder
        return call_id, socket.sent[0]

    call_id, frame = asyncio.run(scenario())
    assert call_id == frame["call_id"]
    assert frame["type"] == "confirmation_request"
    assert frame["summary"] == "do it"
    assert frame["args_preview"] == {"a": 1}


def test_confirm_deny_raises_user_denied() -> None:
    async def scenario() -> None:
        relay = SessionRelay()
        relay.store.create(SessionRecord(session_id="s1", tab_id="t"))
        socket = _FakeSocket()
        relay.attach_socket("s1", socket)

        async def respond() -> None:
            while not socket.sent:
                await asyncio.sleep(0)
            call_id = socket.sent[0]["call_id"]
            relay.resolve_confirmation(
                ConfirmationResponseMessage(
                    type="confirmation_response", call_id=call_id, decision="denied"
                )
            )

        responder = asyncio.ensure_future(respond())
        with pytest.raises(ConfirmationError) as exc_info:
            await relay.confirm("s1", "x.write", {}, summary="do it")
        await responder
        assert exc_info.value.code == -32002

    asyncio.run(scenario())


def test_confirm_timeout_raises_and_notifies_browser() -> None:
    async def scenario() -> Any:
        relay = SessionRelay()
        relay.store.create(SessionRecord(session_id="s1", tab_id="t"))
        socket = _FakeSocket()
        relay.attach_socket("s1", socket)
        with pytest.raises(ConfirmationError) as exc_info:
            await relay.confirm("s1", "x.write", {}, summary="do it", timeout=0.01)
        return exc_info.value, socket.sent

    error, sent = asyncio.run(scenario())
    assert error.code == -32001
    types = [frame["type"] for frame in sent]
    assert "confirmation_request" in types
    assert "confirmation_expired" in types


def test_confirm_without_browser_raises_no_browser() -> None:
    async def scenario() -> None:
        relay = SessionRelay()
        relay.store.create(SessionRecord(session_id="s1", tab_id="t"))
        with pytest.raises(ConfirmationError) as exc_info:
            await relay.confirm("s1", "x.write", {}, summary="do it")
        assert exc_info.value.code == -32003

    asyncio.run(scenario())


def test_detach_rejects_pending_confirmations() -> None:
    async def scenario() -> None:
        relay = SessionRelay()
        relay.store.create(SessionRecord(session_id="s1", tab_id="t"))
        socket = _FakeSocket()
        relay.attach_socket("s1", socket)

        confirm_task = asyncio.ensure_future(relay.confirm("s1", "x.write", {}, summary="do it"))
        while not socket.sent:
            await asyncio.sleep(0)
        relay.detach_socket("s1")
        with pytest.raises(ConfirmationError):
            await confirm_task

    asyncio.run(scenario())


def test_pending_calls_for_lists_only_pending() -> None:
    async def scenario() -> Any:
        relay = SessionRelay()
        relay.store.create(SessionRecord(session_id="s1", tab_id="t"))
        socket = _FakeSocket()
        relay.attach_socket("s1", socket)

        confirm_task = asyncio.ensure_future(
            relay.confirm("s1", "x.write", {"a": 1}, summary="pending one")
        )
        while not socket.sent:
            await asyncio.sleep(0)
        pending = relay.pending_calls_for("s1")
        # Resolve so the task does not leak.
        call_id = socket.sent[0]["call_id"]
        relay.resolve_confirmation(
            ConfirmationResponseMessage(
                type="confirmation_response", call_id=call_id, decision="approved"
            )
        )
        await confirm_task
        return pending

    pending = asyncio.run(scenario())
    assert len(pending) == 1
    assert pending[0].summary == "pending one"


def test_mcp_mutation_without_browser_returns_no_browser_error(client: TestClient) -> None:
    """A mutating tools/call with no live browser returns a structured error."""
    pairing = client.post("/api/sessions", json={}).json()["pairing_token"]
    relay = get_relay()
    record = relay.store.get_by_pairing_token(pairing)
    assert record is not None
    # Connected state so _resolve_session passes, but no live socket: confirm()
    # must short-circuit to no_browser rather than block.
    relay.attach_socket(record.session_id, _FakeSocket())
    relay._sockets.pop(record.session_id)  # noqa: SLF001 - exercise no-browser branch

    response = client.post(
        "/mcp",
        json={
            "method": "tools/call",
            "id": 1,
            "params": {
                "name": "synome.demo.echo_write",
                "arguments": {"message": "hello"},
            },
        },
        headers={"Authorization": f"Bearer {pairing}"},
    )
    assert response.status_code == 200
    result = response.json()["result"]
    assert result["isError"] is True
    assert "browser" in result["content"][0]["text"].lower()


def test_mcp_tools_list_includes_guarded_write_tool(client: TestClient) -> None:
    pairing = client.post("/api/sessions", json={}).json()["pairing_token"]
    relay = get_relay()
    record = relay.store.get_by_pairing_token(pairing)
    assert record is not None
    relay.attach_socket(record.session_id, _FakeSocket())

    response = client.post(
        "/mcp",
        json={"method": "tools/list", "id": 1},
        headers={"Authorization": f"Bearer {pairing}"},
    )
    assert response.status_code == 200
    names = [t["name"] for t in response.json()["result"]["tools"]]
    assert "synome.demo.echo_write" in names


def test_pending_calls_endpoint_empty_by_default(client: TestClient) -> None:
    session_id = client.post("/api/sessions", json={}).json()["session_id"]
    response = client.get("/api/mcp/pending-calls", params={"session_id": session_id})
    assert response.status_code == 200
    assert response.json() == {"pending_calls": []}


# ---------------------------------------------------------------------------
# Relay lifecycle: expiry/401 and reconnect-within-grace
# ---------------------------------------------------------------------------


def test_mcp_returns_401_for_expired_connection_token(client: TestClient) -> None:
    """A harness presenting an expired connection JWT gets 401 (stateless check)."""
    from webmcp_relay.tokens import encode_connection_jwt

    expired = encode_connection_jwt(subject="s", channel_id="s", tab_id="s", ttl_seconds=-10)
    response = client.post(
        "/mcp",
        json={"method": "tools/list", "id": 1},
        headers={"Authorization": f"Bearer {expired}"},
    )
    assert response.status_code == 401


def test_mcp_authenticates_even_when_browser_disconnected(client: TestClient) -> None:
    """Stateless auth has no 409 grace gate: a valid token authenticates whether
    or not a browser is live. (UI-tool liveness is enforced later, at invoke
    time, so read-only/list calls still work tab-less.)"""
    sess = client.post("/api/sessions", json={}).json()
    session_id = sess["session_id"]
    relay = get_relay()
    relay.attach_socket(session_id, _FakeSocket())
    relay.detach_socket(session_id)
    record = relay.store.get(session_id)
    assert record is not None and record.state == "disconnected"

    response = client.post(
        "/mcp",
        json={"method": "tools/list", "id": 1},
        headers={"Authorization": f"Bearer {sess['connection_token']}"},
    )
    assert response.status_code == 200


def test_reconnect_within_grace_restores_connected_state() -> None:
    """Attaching a new socket to a disconnected session transitions it back to connected."""
    relay = SessionRelay()
    relay.store.create(SessionRecord(session_id="s1", tab_id="t"))
    socket1 = _FakeSocket()
    relay.attach_socket("s1", socket1)
    relay.set_tools("s1", [_tool("explorer.search")])

    # Disconnect; enter grace.
    relay.detach_socket("s1")
    record = relay.store.get("s1")
    assert record is not None
    assert record.state == "disconnected"

    # Re-attach within the grace window - simulates browser reconnect.
    socket2 = _FakeSocket()
    relay.attach_socket("s1", socket2)
    # set_tools is called again after reconnect (the browser resends tools/list).
    relay.set_tools("s1", [_tool("explorer.search")])

    assert relay.is_connected("s1")
    assert record.state == "connected"
    assert [t.name for t in relay.list_tools("s1")] == ["explorer.search"]


def test_websocket_rejects_expired_token(client: TestClient) -> None:
    """A WS hello carrying an expired connection JWT gets hello/rejected."""
    from webmcp_relay.tokens import encode_connection_jwt

    session_id = client.post("/api/sessions", json={}).json()["session_id"]
    expired = encode_connection_jwt(
        subject=session_id, channel_id=session_id, tab_id=session_id, ttl_seconds=-10
    )
    with client.websocket_connect(f"/ws/sessions/{session_id}") as ws:
        ws.send_json(
            HelloMessage(
                type="hello",
                tab_id="t",
                origin="http://x",
                url="http://x",
                connection_token=expired,
            ).model_dump()
        )
        msg = ws.receive_json()
        assert msg["type"] == "hello/rejected"


def test_session_expiry_removes_all_tokens(client: TestClient) -> None:  # noqa: ARG001
    """After purge_expired, both the pairing and connection tokens are gone."""
    from webmcp_relay.store import InMemorySessionStore

    store = InMemorySessionStore()
    pairing = new_pairing_token()
    session_id = new_session_id()
    record = SessionRecord(session_id=session_id, tab_id="t", pairing_token=pairing)
    conn = new_connection_id()
    store.create(record)
    store.bind_connection_token(session_id, conn)

    # Force expiry.
    record.expires_at = time.monotonic() - 1
    purged = store.purge_expired()

    assert session_id in purged
    assert store.get(session_id) is None
    assert store.get_by_pairing_token(pairing) is None
    assert store.get_by_connection_token(conn) is None


def test_revoke_connection_token_removes_lookup() -> None:
    """Revoking a connection token makes it unresolvable."""
    from webmcp_relay.store import InMemorySessionStore

    store = InMemorySessionStore()
    sess = SessionRecord(session_id=new_session_id(), tab_id="t")
    conn = new_connection_id()
    store.create(sess)
    store.bind_connection_token(sess.session_id, conn)
    assert store.get_by_connection_token(conn) is not None

    store.revoke_connection_token(conn)
    assert store.get_by_connection_token(conn) is None
    # But the session itself is still alive.
    assert store.get(sess.session_id) is sess


# ---------------------------------------------------------------------------
# B1: Registration interface
# ---------------------------------------------------------------------------


def test_register_server_tool_routes_call_without_synome_import(client: TestClient) -> None:
    """The host can register a server tool; the relay routes calls to it with no
    synome.mcp import needed inside the relay core."""
    clear_registries()  # start clean (autouse fixture already did this, but be explicit)
    called_with: list[dict] = []

    def _handler(**kwargs: Any) -> dict[str, Any]:
        called_with.append(kwargs)
        return {"result": "ok", "q": kwargs.get("q")}

    register_server_tool(
        ServerToolSpec(
            name="test.search",
            description="A test server tool.",
            input_schema={
                "type": "object",
                "properties": {"q": {"type": "string"}},
                "required": ["q"],
            },
            handler=_handler,
            mutation=False,
        )
    )

    sess = client.post("/api/sessions", json={}).json()
    token = sess["connection_token"]

    # tools/list must advertise the registered server tool.
    resp = client.post(
        "/mcp",
        json={"method": "tools/list", "id": 1},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    names = [t["name"] for t in resp.json()["result"]["tools"]]
    assert "test.search" in names

    # tools/call executes the handler directly (no browser socket needed).
    resp = client.post(
        "/mcp",
        json={
            "method": "tools/call",
            "id": 2,
            "params": {"name": "test.search", "arguments": {"q": "hello"}},
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    content = resp.json()["result"]["content"][0]["text"]
    assert "ok" in content
    assert called_with and called_with[0]["q"] == "hello"


def test_register_prompt_routes_list_and_get(client: TestClient) -> None:
    """The host can register prompts; the relay routes prompts/list and
    prompts/get without importing synome.mcp."""
    clear_registries()

    def _list() -> list[dict]:
        return [{"name": "my-prompt", "description": "A test prompt.", "arguments": []}]

    def _get(name: str, arguments: dict) -> dict:  # noqa: ARG001
        if name != "my-prompt":
            raise KeyError(name)
        return {
            "description": "A test prompt.",
            "messages": [{"role": "user", "content": {"type": "text", "text": "Do the thing."}}],
        }

    register_prompts(PromptSpec(list_fn=_list, get_fn=_get))

    sess = client.post("/api/sessions", json={}).json()
    token = sess["connection_token"]

    resp = client.post(
        "/mcp",
        json={"method": "prompts/list", "id": 1},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    names = [p["name"] for p in resp.json()["result"]["prompts"]]
    assert "my-prompt" in names

    resp = client.post(
        "/mcp",
        json={"method": "prompts/get", "id": 2, "params": {"name": "my-prompt"}},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    messages = resp.json()["result"]["messages"]
    assert messages[0]["content"]["text"] == "Do the thing."


def test_register_guarded_write_advertised_and_requires_confirmation(
    client: TestClient,
) -> None:
    """The host can register a guarded-write tool; the relay advertises it and
    routes calls through the confirmation gate (no browser -> no_browser error)."""
    clear_registries()

    register_guarded_write(
        GuardedWriteTool(
            name="test.write",
            description="A test guarded write.",
            input_schema={
                "type": "object",
                "properties": {"val": {"type": "string"}},
                "required": ["val"],
            },
            handler=lambda args: {"written": args.get("val")},
            confirmation_summary=lambda args: f"Write {args.get('val')!r}",
        )
    )

    sess = client.post("/api/sessions", json={}).json()
    token = sess["connection_token"]

    # Advertised in tools/list.
    resp = client.post(
        "/mcp",
        json={"method": "tools/list", "id": 1},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    names = [t["name"] for t in resp.json()["result"]["tools"]]
    assert "test.write" in names

    # tools/call with no live browser gets a no_browser error (not a 5xx).
    resp = client.post(
        "/mcp",
        json={
            "method": "tools/call",
            "id": 2,
            "params": {"name": "test.write", "arguments": {"val": "x"}},
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    result = resp.json()["result"]
    assert result["isError"] is True
    assert "browser" in result["content"][0]["text"].lower()


def test_no_synome_imports_in_relay_core() -> None:
    """Sanity check: none of the relay core modules import synome.*."""
    import importlib
    import sys

    # Force reload to get a clean module state for the import check.
    relay_modules = [
        "webmcp_relay.router",
        "webmcp_relay.relay",
        "webmcp_relay.confirm",
        "webmcp_relay.store",
        "webmcp_relay.protocol",
        "webmcp_relay.tokens",
        "webmcp_relay.registry",
    ]
    for mod_name in relay_modules:
        mod = sys.modules.get(mod_name)
        if mod is None:
            mod = importlib.import_module(mod_name)
        # Walk the module's globals: no name should reference synome.
        for attr_name in dir(mod):
            attr = getattr(mod, attr_name, None)
            if attr is None:
                continue
            attr_module = getattr(attr, "__module__", "") or ""
            assert not attr_module.startswith("synome"), (
                f"{mod_name}.{attr_name} references {attr_module} (synome import leaked)"
            )


# ---------------------------------------------------------------------------
# B2: Harness-liveness tracking
# ---------------------------------------------------------------------------


def test_initialize_marks_harness_attached_and_emits_status(client: TestClient) -> None:
    """A harness initialize call marks the session harness-attached and pushes
    a harness_status frame to the live browser WS."""
    sess = client.post("/api/sessions", json={}).json()
    session_id = sess["session_id"]
    relay = get_relay()

    with client.websocket_connect(f"/ws/sessions/{session_id}") as ws:
        ws.send_json(
            HelloMessage(
                type="hello",
                tab_id="tab",
                origin="http://x",
                url="http://x",
                connection_token=sess["connection_token"],
            ).model_dump()
        )
        accepted = ws.receive_json()
        assert accepted["type"] == "hello/accepted"

        # Before initialize, harness should not be attached.
        record = relay.store.get(session_id)
        assert record is not None
        assert record.harness_attached is False

        # Harness sends initialize over /mcp.
        resp = client.post(
            "/mcp",
            json={"method": "initialize", "id": 1},
            headers={"Authorization": f"Bearer {sess['connection_token']}"},
        )
        assert resp.status_code == 200

        # Record should now be harness-attached.
        assert record.harness_attached is True
        assert record.harness_last_seen is not None
        assert record.harness_last_seen_ms is not None

        # Browser WS should have received a harness_status frame.
        # Drain any frames (heartbeat may or may not have fired).
        deadline = time.monotonic() + 2.0
        status_frames = []
        while time.monotonic() < deadline:
            try:
                frame = ws.receive_json()
                if frame.get("type") == "harness_status":
                    status_frames.append(frame)
                    break
            except Exception:
                break

        assert len(status_frames) == 1, "Expected exactly one harness_status frame"
        assert status_frames[0]["attached"] is True
        assert status_frames[0]["last_activity_ms"] is not None


def test_touch_harness_updates_last_seen() -> None:
    """Every /mcp call updates last_seen so the TTL has a fresh timestamp."""
    relay = SessionRelay()
    relay.store.create(SessionRecord(session_id="s1", tab_id="t"))

    rec0 = relay.store.get("s1")
    assert rec0 is not None
    assert rec0.harness_last_seen is None

    relay.touch_harness("s1")
    record = relay.store.get("s1")
    assert record is not None
    assert record.harness_last_seen is not None
    assert record.harness_last_seen_ms is not None

    first_seen = record.harness_last_seen
    time.sleep(0.01)
    relay.touch_harness("s1")
    assert record.harness_last_seen > first_seen


def test_mark_harness_attached_flips_flag_and_pushes_frame() -> None:
    """mark_harness_attached sets harness_attached=True and pushes harness_status."""

    async def scenario() -> tuple[bool, list[Any]]:
        relay = SessionRelay()
        relay.store.create(SessionRecord(session_id="s1", tab_id="t"))
        socket = _FakeSocket()
        relay.attach_socket("s1", socket)

        relay.touch_harness("s1")
        await relay.mark_harness_attached("s1")

        record = relay.store.get("s1")
        assert record is not None
        return record.harness_attached, socket.sent

    attached, sent = asyncio.run(scenario())
    assert attached is True
    status_frames = [f for f in sent if f.get("type") == "harness_status"]
    assert len(status_frames) == 1
    assert status_frames[0]["attached"] is True
    assert status_frames[0]["last_activity_ms"] is not None


def test_ttl_sweep_reverts_attached_and_pushes_frame() -> None:
    """sweep_harness_liveness flips attached->False after TTL and emits a frame."""
    from webmcp_relay.relay import HARNESS_LIVENESS_TTL_SECONDS

    async def scenario() -> tuple[bool, bool, list[Any]]:
        relay = SessionRelay()
        relay.store.create(SessionRecord(session_id="s1", tab_id="t"))
        socket = _FakeSocket()
        relay.attach_socket("s1", socket)

        relay.touch_harness("s1")
        await relay.mark_harness_attached("s1")
        socket.sent.clear()  # clear the attach frame so we only see the revert frame

        # Check that sweep does NOT revert when within TTL.
        reverted_early = await relay.sweep_harness_liveness("s1")
        assert reverted_early is False

        # Force last_seen into the past to exceed the TTL.
        record = relay.store.get("s1")
        assert record is not None
        record.harness_last_seen = time.monotonic() - (HARNESS_LIVENESS_TTL_SECONDS + 1)

        reverted = await relay.sweep_harness_liveness("s1")
        return reverted, record.harness_attached, socket.sent

    reverted, still_attached, sent = asyncio.run(scenario())
    assert reverted is True
    assert still_attached is False
    status_frames = [f for f in sent if f.get("type") == "harness_status"]
    assert len(status_frames) == 1
    assert status_frames[0]["attached"] is False


def test_ttl_sweep_no_socket_updates_state_only() -> None:
    """When no browser socket is live, the sweep still updates state (best-effort)."""
    from webmcp_relay.relay import HARNESS_LIVENESS_TTL_SECONDS

    async def scenario() -> tuple[bool, bool]:
        relay = SessionRelay()
        relay.store.create(SessionRecord(session_id="s1", tab_id="t"))
        relay.touch_harness("s1")
        # Mark attached without a socket (direct state write).
        record = relay.store.get("s1")
        assert record is not None
        record.harness_attached = True
        record.harness_last_seen = time.monotonic() - (HARNESS_LIVENESS_TTL_SECONDS + 1)

        reverted = await relay.sweep_harness_liveness("s1")
        return reverted, record.harness_attached

    reverted, still_attached = asyncio.run(scenario())
    assert reverted is True
    assert still_attached is False


def test_harness_status_not_attached_when_no_initialize(client: TestClient) -> None:
    """Without an initialize call, harness_attached remains False."""
    sess = client.post("/api/sessions", json={}).json()
    session_id = sess["session_id"]
    relay = get_relay()

    # Only call tools/list, not initialize.
    client.post(
        "/mcp",
        json={"method": "tools/list", "id": 1},
        headers={"Authorization": f"Bearer {sess['connection_token']}"},
    )

    record = relay.store.get(session_id)
    assert record is not None
    # last_seen is updated by touch_harness on every /mcp call.
    assert record.harness_last_seen is not None
    # But harness_attached should still be False (no initialize yet).
    assert record.harness_attached is False


# ---------------------------------------------------------------------------
# I1: Relay is the sole /mcp handler; FastMCP server path is gone
# ---------------------------------------------------------------------------


def test_relay_tools_list_advertises_atlas_search(client: TestClient) -> None:
    """tools/list via the relay must include synome.atlas.search (registered
    server-side by the host) and must NOT include any of the 11 data tools
    (those are now UI-registered in the Explorer)."""
    from synome.mcp.skills import atlas_search_tool

    # Register atlas.search as the host does in app._register_relay_capabilities.
    register_server_tool(
        ServerToolSpec(
            name=atlas_search_tool.name,
            description=atlas_search_tool.description,
            input_schema=atlas_search_tool.input_schema,
            handler=atlas_search_tool.handler,
            mutation=atlas_search_tool.mutation,
        )
    )

    sess = client.post("/api/sessions", json={}).json()
    token = sess["connection_token"]

    resp = client.post(
        "/mcp",
        json={"method": "tools/list", "id": 1},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    names = [t["name"] for t in resp.json()["result"]["tools"]]

    # Atlas search must appear via the relay.
    assert "synome.atlas.search" in names

    # None of the 11 data tools (now UI-registered) must appear here.
    ui_migrated = {
        "synome.branches.list",
        "synome.identities.list",
        "synome.identities.get",
        "synome.identities.dependencies",
        "synome.identities.dependents",
        "synome.content_nodes.list",
        "synome.content_nodes.get",
        "synome.content_nodes.children",
        "synome.identities.history",
        "synome.commits.changes",
        "synome.branches.compare",
    }
    for name in ui_migrated:
        assert name not in names, f"{name} should not be server-registered (it is UI-migrated)"


def test_no_fastmcp_mount_in_synome_mcp() -> None:
    """Sanity: synome.mcp no longer exports mcp_asgi or mcp_server.
    Importing the package must not create a FastMCP ASGI application."""
    import synome.mcp as mcp_pkg

    assert not hasattr(mcp_pkg, "mcp_asgi"), (
        "mcp_asgi found in synome.mcp - the FastMCP mount should have been removed"
    )
    assert not hasattr(mcp_pkg, "mcp_server"), (
        "mcp_server found in synome.mcp - the FastMCP server should have been removed"
    )


def test_relay_is_sole_mcp_handler(client: TestClient) -> None:
    """The relay router must handle /mcp POST directly (not delegate to a
    FastMCP ASGI sub-mount). Verified by checking that tools/call for a
    server-registered tool is handled end-to-end without a FastMCP mount."""
    called: list[dict] = []

    def _handler(**kwargs):  # type: ignore[no-untyped-def]
        called.append(kwargs)
        return {"echo": kwargs.get("msg")}

    register_server_tool(
        ServerToolSpec(
            name="test.echo",
            description="Echo test.",
            input_schema={
                "type": "object",
                "properties": {"msg": {"type": "string"}},
                "required": ["msg"],
            },
            handler=_handler,
            mutation=False,
        )
    )

    sess = client.post("/api/sessions", json={}).json()
    token = sess["connection_token"]

    resp = client.post(
        "/mcp",
        json={
            "method": "tools/call",
            "id": 1,
            "params": {"name": "test.echo", "arguments": {"msg": "ping"}},
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    result = resp.json()["result"]
    assert result.get("isError") is not True
    assert called and called[0]["msg"] == "ping"
