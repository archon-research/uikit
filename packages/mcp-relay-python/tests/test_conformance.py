"""Conformance harness: wire-contract fixtures vs. webmcp_relay Python core.

Loads the language-neutral JSON fixtures from conformance/ and verifies that
the Python core (webmcp_relay protocol models + tokens) produces exactly the
same wire JSON that the fixtures encode.

Path resolution: this file lives at
  packages/mcp-relay-python/tests/test_conformance.py
The conformance directory is at the uikit root:
  conformance/
So the relative path from this file is ../../../conformance/.
We use __file__ for robust resolution so the tests work regardless of cwd.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from webmcp_relay.protocol import (
    CreateSessionResponse,
    HarnessStatusMessage,
    HelloAcceptedMessage,
    HelloRejectedMessage,
    InvokeMessage,
    ToolActivityMessage,
)
from webmcp_relay.tokens import configure_jwt_secret, session_id_from_token

# ---------------------------------------------------------------------------
# Fixture loading
# ---------------------------------------------------------------------------

_HERE = Path(__file__).parent
_CONFORMANCE_DIR = (_HERE / "../../../conformance").resolve()


def _load(filename: str) -> dict[str, Any]:
    path = _CONFORMANCE_DIR / filename
    if not path.exists():
        pytest.skip(f"Conformance fixture not found: {path}")
    return json.loads(path.read_text())


@pytest.fixture(scope="module")
def tokens_fixture() -> dict[str, Any]:
    return _load("tokens.json")


@pytest.fixture(scope="module")
def frames_fixture() -> dict[str, Any]:
    return _load("frames.json")


# ---------------------------------------------------------------------------
# Token conformance: sessionIdFromToken must agree with the fixture
# ---------------------------------------------------------------------------


def test_valid_token_returns_expected_session_id(tokens_fixture: dict[str, Any]) -> None:
    configure_jwt_secret(tokens_fixture["secret"])
    result = session_id_from_token(tokens_fixture["valid"]["token"])
    assert result == tokens_fixture["valid"]["expected_session_id"]


def test_expired_token_returns_none(tokens_fixture: dict[str, Any]) -> None:
    configure_jwt_secret(tokens_fixture["secret"])
    result = session_id_from_token(tokens_fixture["expired"]["token"])
    assert result == tokens_fixture["expired"]["expected_session_id"]  # None


def test_tampered_token_returns_none(tokens_fixture: dict[str, Any]) -> None:
    configure_jwt_secret(tokens_fixture["secret"])
    result = session_id_from_token(tokens_fixture["tampered"]["token"])
    assert result == tokens_fixture["tampered"]["expected_session_id"]  # None


# ---------------------------------------------------------------------------
# Frame conformance: each protocol model must serialise to the fixture wire JSON
# ---------------------------------------------------------------------------


def test_hello_accepted_frame(frames_fixture: dict[str, Any]) -> None:
    inputs = frames_fixture["inputs"]
    frame = HelloAcceptedMessage(session_id=inputs["session_id"])
    assert frame.model_dump() == frames_fixture["hello_accepted"]


def test_hello_rejected_frame(frames_fixture: dict[str, Any]) -> None:
    expected = frames_fixture["hello_rejected"]
    frame = HelloRejectedMessage(reason=expected["reason"])
    assert frame.model_dump() == expected


def test_harness_status_attached_frame(frames_fixture: dict[str, Any]) -> None:
    inputs = frames_fixture["inputs"]
    frame = HarnessStatusMessage(
        attached=True,
        last_activity_ms=inputs["last_activity_ms"],
    )
    assert frame.model_dump() == frames_fixture["harness_status_attached"]


def test_harness_status_detached_frame(frames_fixture: dict[str, Any]) -> None:
    frame = HarnessStatusMessage(attached=False, last_activity_ms=None)
    assert frame.model_dump() == frames_fixture["harness_status_detached"]


def test_tool_activity_started_frame(frames_fixture: dict[str, Any]) -> None:
    inputs = frames_fixture["inputs"]
    frame = ToolActivityMessage(
        activity_id=inputs["activity_id"],
        tool_name=inputs["tool_name"],
        kind="ui",
        status="started",
        args=inputs["args"],
        result_preview=None,
        error=None,
    )
    assert frame.model_dump() == frames_fixture["tool_activity_started"]


def test_tool_activity_ok_frame(frames_fixture: dict[str, Any]) -> None:
    inputs = frames_fixture["inputs"]
    expected = frames_fixture["tool_activity_ok"]
    frame = ToolActivityMessage(
        activity_id=inputs["activity_id"],
        tool_name=inputs["tool_name"],
        kind="ui",
        status="ok",
        args=inputs["args"],
        result_preview=expected["result_preview"],
        error=None,
    )
    assert frame.model_dump() == expected


def test_tool_activity_error_frame(frames_fixture: dict[str, Any]) -> None:
    inputs = frames_fixture["inputs"]
    expected = frames_fixture["tool_activity_error"]
    frame = ToolActivityMessage(
        activity_id=inputs["activity_id"],
        tool_name=inputs["tool_name"],
        kind="ui",
        status="error",
        args=inputs["args"],
        result_preview=None,
        error=expected["error"],
    )
    assert frame.model_dump() == expected


def test_invoke_frame(frames_fixture: dict[str, Any]) -> None:
    inputs = frames_fixture["inputs"]
    frame = InvokeMessage(
        call_id=inputs["call_id"],
        tool_name=inputs["tool_name"],
        args=inputs["args"],
    )
    assert frame.model_dump() == frames_fixture["invoke"]


def test_create_session_response_fields(frames_fixture: dict[str, Any]) -> None:
    """CreateSessionResponse must expose exactly the fields listed in the fixture."""
    expected_fields = set(frames_fixture["create_session_response_fields"])
    actual_fields = set(CreateSessionResponse.model_fields.keys())
    assert actual_fields == expected_fields
