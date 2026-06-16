"""conftest.py for mcp-relay-python standalone tests.

Tests that import ``synome.*`` are integration tests that only run when synome
is installed alongside this package. Skip them gracefully in a standalone run.
"""

from __future__ import annotations

import importlib.util

import pytest

# True when synome is resolvable in the current environment.
_SYNOME_AVAILABLE = importlib.util.find_spec("synome") is not None

# Names of tests that directly import synome and must be skipped standalone.
_SYNOME_TESTS = {
    "test_relay_tools_list_advertises_atlas_search",
    "test_no_fastmcp_mount_in_synome_mcp",
    "test_relay_is_sole_mcp_handler",
}


def pytest_collection_modifyitems(items: list[pytest.Item]) -> None:
    """Skip synome-dependent tests when synome is not installed."""
    if _SYNOME_AVAILABLE:
        return
    skip = pytest.mark.skip(reason="synome not installed in standalone mcp-relay-python env")
    for item in items:
        if item.name in _SYNOME_TESTS:
            item.add_marker(skip)
