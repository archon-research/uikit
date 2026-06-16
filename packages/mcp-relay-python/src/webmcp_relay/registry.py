"""Relay registration interface: server tools, prompts, and guarded writes.

The relay core is generic; the host (e.g. Synome) populates these registries
at startup with its own capabilities. No Synome imports live here.

Registration functions (called by the host at startup):

* ``register_server_tool(spec)``   -- read-only server-side data tools.
* ``register_prompt(spec)``        -- agentic prompt specs.
* ``register_guarded_write(spec)`` -- server-side mutations gated by browser
  confirmation.

The router consults the registries at request time; the registries are
module-level dicts so they are process-wide singletons. Tests reset them via
``clear_registries()``.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from webmcp_relay.confirm import GuardedWriteTool

# ---------------------------------------------------------------------------
# Server tool spec (minimal, relay-owned)
# ---------------------------------------------------------------------------


@dataclass
class ServerToolSpec:
    """Minimal spec for a relay-registered server-side data tool.

    Carries only what the relay router needs: name, description, input_schema
    (raw JSON Schema dict), handler, and mutation flag. Deliberately thin so the
    relay package does not depend on synome.mcp.contract.
    """

    name: str
    description: str
    input_schema: dict[str, Any]
    handler: Any
    mutation: bool = False


# ---------------------------------------------------------------------------
# Prompt spec (relay-owned)
# ---------------------------------------------------------------------------


@dataclass
class PromptSpec:
    """Minimal spec for a relay-registered prompt.

    The host provides ``list_fn`` and ``get_fn`` callbacks that implement the
    MCP ``prompts/list`` and ``prompts/get`` payloads respectively. This keeps
    the relay agnostic about how prompts are stored or rendered.
    """

    list_fn: Any
    get_fn: Any


# ---------------------------------------------------------------------------
# Module-level registries
# ---------------------------------------------------------------------------

# Keyed by tool name. Non-mutation (read-only) server-side tools.
_SERVER_TOOLS: dict[str, ServerToolSpec] = {}

# Keyed by tool name. Server-side mutations gated by browser confirmation.
_GUARDED_WRITES: dict[str, GuardedWriteTool] = {}

# Single optional prompt provider (the host registers one bundle of prompts).
_PROMPT_SPEC: PromptSpec | None = None


# ---------------------------------------------------------------------------
# Registration API (called by the host at startup)
# ---------------------------------------------------------------------------


def register_server_tool(spec: ServerToolSpec) -> None:
    """Register a read-only server-side data tool into the relay."""
    _SERVER_TOOLS[spec.name] = spec


def register_guarded_write(spec: GuardedWriteTool) -> None:
    """Register a server-side mutation gated by browser confirmation."""
    _GUARDED_WRITES[spec.name] = spec


def register_prompts(spec: PromptSpec) -> None:
    """Register the host's prompt provider (list + get callbacks)."""
    global _PROMPT_SPEC  # noqa: PLW0603
    _PROMPT_SPEC = spec


# ---------------------------------------------------------------------------
# Accessor API (called by the router at request time)
# ---------------------------------------------------------------------------


def get_server_tools() -> dict[str, ServerToolSpec]:
    """Return all registered server-side data tools, keyed by name."""
    return dict(_SERVER_TOOLS)


def get_server_tool(name: str) -> ServerToolSpec | None:
    """Return a server-side data tool by name, or None if not registered."""
    return _SERVER_TOOLS.get(name)


def get_guarded_write_tool(name: str) -> GuardedWriteTool | None:
    """Return a registered guarded-write tool by name, or None."""
    return _GUARDED_WRITES.get(name)


def get_all_guarded_writes() -> dict[str, GuardedWriteTool]:
    """Return all registered guarded-write tools, keyed by name."""
    return dict(_GUARDED_WRITES)


def get_prompt_spec() -> PromptSpec | None:
    """Return the registered prompt provider, or None if none registered."""
    return _PROMPT_SPEC


# ---------------------------------------------------------------------------
# Test helper
# ---------------------------------------------------------------------------


def clear_registries() -> None:
    """Reset all registries to empty (use in tests only)."""
    global _PROMPT_SPEC  # noqa: PLW0603
    _SERVER_TOOLS.clear()
    _GUARDED_WRITES.clear()
    _PROMPT_SPEC = None
