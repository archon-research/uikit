"""Session relay: WebSocket back-channel + Streamable HTTP harness transport.

This package owns the relay core: it binds an external harness to a live
browser session via the three-role token model and routes tool calls to the
browser over a WebSocket back-channel.

The relay core has no host imports. The host registers capabilities via
the registration interface at startup:

  from webmcp_relay.registry import (
      register_server_tool, register_guarded_write, register_prompts,
      ServerToolSpec, PromptSpec,
  )

Public surface:

* :data:`router`                 - FastAPI router (wired into ``app.py``).
* :class:`SessionRelay`          - the routing/lifecycle core.
* :func:`get_relay`              - process-wide relay singleton accessor.
* :func:`configure_jwt_secret`   - set the HS256 signing secret at startup.
"""

from __future__ import annotations

from webmcp_relay.confirm import (
    ConfirmationError,
    GuardedWriteTool,
    PendingCall,
    get_guarded_write_tool,
)
from webmcp_relay.registry import (
    PromptSpec,
    ServerToolSpec,
    clear_registries,
    get_all_guarded_writes,
    get_prompt_spec,
    get_server_tool,
    get_server_tools,
    register_guarded_write,
    register_prompts,
    register_server_tool,
)
from webmcp_relay.relay import RelayError, SessionRelay, get_relay, reset_relay
from webmcp_relay.router import router
from webmcp_relay.store import (
    InMemorySessionStore,
    PendingInvocation,
    SessionRecord,
    SessionStore,
)
from webmcp_relay.tokens import configure_jwt_secret

__all__ = [
    "ConfirmationError",
    "GuardedWriteTool",
    "InMemorySessionStore",
    "PendingCall",
    "PendingInvocation",
    "PromptSpec",
    "RelayError",
    "ServerToolSpec",
    "SessionRecord",
    "SessionRelay",
    "SessionStore",
    "clear_registries",
    "configure_jwt_secret",
    "get_all_guarded_writes",
    "get_guarded_write_tool",
    "get_prompt_spec",
    "get_relay",
    "get_server_tool",
    "get_server_tools",
    "register_guarded_write",
    "register_prompts",
    "register_server_tool",
    "reset_relay",
    "router",
]
