"""Public glue for the relay session store: exposes ``validate_connection_token``.

This function is used by any bearer-auth layer that needs to validate a
connection token against the relay's in-memory session table. The relay owns
the store; this module is the single access point.

Function exported:
  ``validate_connection_token(token)`` - async, returns a FastMCP
  ``AccessToken`` if the token is a live connection token in the relay's
  session table, or ``None`` if it is unknown/expired/revoked.
"""

from __future__ import annotations

from fastmcp.server.auth import AccessToken

from webmcp_relay.relay import get_relay


async def validate_connection_token(token: str) -> AccessToken | None:
    """Validate a bearer token against the relay's in-memory session table.

    Returns an ``AccessToken`` on success so any FastMCP-compatible auth layer
    can authorize the request, or ``None`` on any failure (unknown token,
    expired session).
    """
    if not token:
        return None
    relay = get_relay()
    record = relay.store.get_by_connection_token(token)
    if record is None or record.is_expired():
        return None
    return AccessToken(
        token=token,
        client_id="synome-mcp",
        scopes=["mcp:tools"],
    )
