"""Three-role token issuance and validation for the session relay.

The relay binds an external harness to a live browser session using three
distinct token roles (see ``.notes/web-mcp-investigations/tokens.md``):

* **Session/channel token** - opaque UUID v4, browser-internal, one per tab,
  re-issued on every Explorer load.  Used to authenticate the browser
  WebSocket upgrade.  Never seen by the user or the harness.
* **Pairing token** - opaque single-use base-58 code (~64 bits), 10-minute
  TTL.  This is the *only* token the user copies, pasting it into their
  harness config as ``Authorization: Bearer <pairing>``.  Consumed on first
  use and exchanged for a connection token.
* **Connection token** - durable per-harness credential issued after pairing.
  In v1 it is validated against the opaque session table; the HS256 JWT claim
  schema is defined so the validator is a pluggable swap (HMAC -> JWKS) rather
  than a migration.

The JWT path is intentionally *not* signature-validated in v1: the connection
token is looked up in the session store.  ``encode_connection_jwt`` and
``decode_connection_jwt`` exist so the claim schema is exercised and the swap
to real verification is a single call-site change.

JWT secret resolution order (most to least specific):
  1. Explicitly-configured value set via ``configure_jwt_secret()``.
  2. ``WEBMCP_RELAY_JWT_SECRET`` environment variable.
  3. Per-process random fallback (tokens survive only the current process).
"""

from __future__ import annotations

import os
import secrets
import time
import uuid
from typing import Final

from jose import JWTError, jwt

from webmcp_relay.protocol import ConnectionTokenClaims

# Base-58 alphabet (Bitcoin variant): no 0/O/I/l to avoid transcription errors.
_BASE58_ALPHABET: Final = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

# v1 self-issued JWT settings. The secret is configurable; a deployment
# override belongs in the host's startup call to configure_jwt_secret().
_JWT_ALGORITHM: Final = "HS256"
_JWT_ISSUER: Final = "urn:webmcp-relay"
_JWT_AUDIENCE: Final = "webmcp-relay"

# Per-process fallback secret. Used only when neither configure_jwt_secret()
# has been called nor WEBMCP_RELAY_JWT_SECRET is set. Regenerated on restart,
# so previously-issued tokens stop verifying after a restart. Set the env var
# (or call configure_jwt_secret) to make tokens survive restarts.
_FALLBACK_JWT_SECRET: Final = secrets.token_urlsafe(32)

# Module-level override installed by configure_jwt_secret().
_configured_jwt_secret: str | None = None


def configure_jwt_secret(secret: str | None) -> None:
    """Set the HS256 signing secret for this process.

    Call once at application startup, before any tokens are issued or
    verified. Passing ``None`` clears the configured value and falls back
    to the env-var / per-process secret resolution chain.

    Typical host usage::

        import webmcp_relay
        webmcp_relay.configure_jwt_secret(app_config.jwt_secret)
    """
    global _configured_jwt_secret  # noqa: PLW0603
    _configured_jwt_secret = secret


def _jwt_secret() -> str:
    """Resolve the active HS256 secret.

    Resolution order:
      1. Value set via ``configure_jwt_secret()`` (highest priority).
      2. ``WEBMCP_RELAY_JWT_SECRET`` environment variable.
      3. Per-process random fallback (tokens survive only the current process).
    """
    if _configured_jwt_secret is not None:
        return _configured_jwt_secret
    env_secret = os.environ.get("WEBMCP_RELAY_JWT_SECRET")  # noqa: TID251
    if env_secret:
        return env_secret
    return _FALLBACK_JWT_SECRET


PAIRING_TOKEN_TTL_SECONDS: Final = 600  # 10 minutes
# 12 hours: long enough to cover most working sessions with one paste. The UI
# surfaces an expired state with a manual refresh rather than rotating silently.
CONNECTION_TOKEN_TTL_SECONDS: Final = 12 * 3600  # 12 hours


def new_session_id() -> str:
    """Issue an opaque per-tab session/channel token (UUID v4)."""
    return str(uuid.uuid4())


def new_tab_id() -> str:
    """Issue an opaque per-tab identifier carried in the JWT ``tab_id`` claim."""
    return str(uuid.uuid4())


def new_pairing_token(length: int = 12) -> str:
    """Issue a single-use, short, copy-friendly base-58 pairing code.

    Twelve base-58 characters give ~70 bits of entropy, comfortably above the
    64-bit floor for a 10-minute single-use code.
    """
    return "".join(secrets.choice(_BASE58_ALPHABET) for _ in range(length))


def new_connection_id() -> str:
    """Issue an opaque durable connection token (the harness's bearer value).

    v1 validates this against the session store. It is a URL-safe random
    string rather than a JWT so it is cheap to revoke and never leaks claims if
    logged; the JWT claim schema below is the forward-compatible alternative.
    """
    return secrets.token_urlsafe(32)


def encode_connection_jwt(
    *,
    subject: str,
    channel_id: str,
    tab_id: str,
    scope: str = "mcp:tools",
    ttl_seconds: int = CONNECTION_TOKEN_TTL_SECONDS,
) -> str:
    """Encode a connection token as an HS256 JWT (forward-compatible path).

    Not used for validation in v1, but exercised so the claim schema in
    :class:`ConnectionTokenClaims` stays in sync. When JWKS verification is
    enabled this becomes the issued bearer value.
    """
    issued_at = int(time.time())
    claims = ConnectionTokenClaims(
        iss=_JWT_ISSUER,
        sub=subject,
        aud=_JWT_AUDIENCE,
        jti=str(uuid.uuid4()),
        iat=issued_at,
        exp=issued_at + ttl_seconds,
        channel_id=channel_id,
        scope=scope,
        tab_id=tab_id,
    )
    return jwt.encode(claims.model_dump(), _jwt_secret(), algorithm=_JWT_ALGORITHM)


def decode_connection_jwt(token: str) -> ConnectionTokenClaims | None:
    """Decode and verify a connection JWT, or ``None`` if invalid/expired.

    The pluggable validator slot: swap ``_JWT_SECRET``/algorithm for a JWKS
    key resolver to support IdP-issued tokens without touching callers.
    """
    try:
        payload = jwt.decode(
            token,
            _jwt_secret(),
            algorithms=[_JWT_ALGORITHM],
            audience=_JWT_AUDIENCE,
            issuer=_JWT_ISSUER,
        )
    except JWTError:
        return None
    try:
        return ConnectionTokenClaims.model_validate(payload)
    except ValueError:
        return None


def mint_connection_token(session_id: str, tab_id: str = "") -> str:
    """Issue a durable connection JWT for a session.

    The session id is carried in the ``channel_id`` claim so the relay can route
    a verified token to its browser channel without any server-side lookup. This
    is the bearer the user pastes into their harness config.
    """
    return encode_connection_jwt(
        subject=session_id,
        channel_id=session_id,
        tab_id=tab_id or session_id,
        ttl_seconds=CONNECTION_TOKEN_TTL_SECONDS,
    )


def session_id_from_token(token: str) -> str | None:
    """Verify a connection JWT and return its session id, or ``None`` if invalid.

    Stateless: validates signature + expiry only. Knowing the token is valid is
    sufficient for *auth*; whether a live UI session exists is a separate
    liveness check the relay does against its in-memory socket map.
    """
    claims = decode_connection_jwt(token)
    return claims.channel_id if claims is not None else None


def parse_bearer(authorization: str | None) -> str | None:
    """Extract the bearer credential from an ``Authorization`` header value."""
    if not authorization:
        return None
    scheme, _, credential = authorization.partition(" ")
    if scheme.lower() != "bearer" or not credential:
        return None
    return credential.strip()
