/**
 * HS256 JWT issuance and verification using the Web Crypto API (crypto.subtle).
 *
 * async because SubtleCrypto operations are always Promise-based.
 * Works in Cloudflare Workers, Node >= 19, and browser (no Node-specific APIs).
 *
 * Mirrors the claim schema and constants from the Python tokens.py:
 *   iss  = "urn:webmcp-relay"
 *   aud  = "webmcp-relay"
 *   channel_id carries the session_id (stateless routing without a store lookup)
 *   scope = "mcp:tools"
 */

import type { ConnectionTokenClaims } from './protocol.js';

const JWT_ISSUER = 'urn:webmcp-relay';
const JWT_AUDIENCE = 'webmcp-relay';

/** 12 hours, matching CONNECTION_TOKEN_TTL_SECONDS in tokens.py. */
export const CONNECTION_TOKEN_TTL_SECONDS = 12 * 3600;

// ---------------------------------------------------------------------------
// Internal Web Crypto helpers
// ---------------------------------------------------------------------------

function base64UrlEncode(buf: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buf.byteLength; i++) {
    binary += String.fromCharCode(buf[i]!);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64UrlDecode(s: string): Uint8Array {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = (4 - (padded.length % 4)) % 4;
  const b64 = padded + '==='.slice(0, pad);
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Return type inferred from SubtleCrypto.importKey (avoids DOM lib dependency).
async function importHmacKey(secret: string) {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Mint a durable HS256 connection token for `sessionId`.
 *
 * The session_id is carried in `channel_id` so the relay can route
 * an authenticated request without any session-store lookup (stateless).
 */
export async function mintConnectionToken(
  sessionId: string,
  tabId: string,
  secret: string,
  ttlSeconds: number = CONNECTION_TOKEN_TTL_SECONDS,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const claims: ConnectionTokenClaims = {
    iss: JWT_ISSUER,
    sub: sessionId,
    aud: JWT_AUDIENCE,
    jti: crypto.randomUUID(),
    iat: now,
    exp: now + ttlSeconds,
    channel_id: sessionId,
    scope: 'mcp:tools',
    tab_id: tabId || sessionId,
  };

  const header = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
  );
  const payload = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(claims)),
  );
  const signingInput = `${header}.${payload}`;

  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(signingInput),
  );

  return `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;
}

/**
 * Verify an HS256 JWT and return its `channel_id` (= session_id) claim.
 * Returns null if the token is invalid, expired, or tampered.
 */
export async function sessionIdFromToken(
  token: string,
  secret: string,
): Promise<string | null> {
  const claims = await decodeConnectionToken(token, secret);
  return claims !== null ? claims.channel_id : null;
}

/**
 * Decode and verify an HS256 JWT, returning the full claims.
 * Returns null on any validation failure (bad signature, expired, wrong iss/aud).
 */
export async function decodeConnectionToken(
  token: string,
  secret: string,
): Promise<ConnectionTokenClaims | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, sigB64] = parts as [string, string, string];

  // Verify signature.
  const key = await importHmacKey(secret);
  const signingInput = `${headerB64}.${payloadB64}`;
  const sigBytes = base64UrlDecode(sigB64);
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    sigBytes,
    new TextEncoder().encode(signingInput),
  );
  if (!valid) return null;

  // Decode payload.
  let claims: ConnectionTokenClaims;
  try {
    claims = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(payloadB64)),
    ) as ConnectionTokenClaims;
  } catch {
    return null;
  }

  // Validate standard claims.
  const now = Math.floor(Date.now() / 1000);
  if (claims.exp !== undefined && claims.exp < now) return null;
  if (claims.iss !== JWT_ISSUER) return null;
  if (claims.aud !== JWT_AUDIENCE) return null;
  if (!claims.channel_id) return null;

  return claims;
}

/** Parse `Bearer <token>` from an Authorization header value. */
export function parseBearer(
  authorization: string | null | undefined,
): string | null {
  if (!authorization) return null;
  const idx = authorization.indexOf(' ');
  if (idx === -1) return null;
  const scheme = authorization.slice(0, idx).toLowerCase();
  const credential = authorization.slice(idx + 1).trim();
  if (scheme !== 'bearer' || !credential) return null;
  return credential;
}

/** ISO-8601 UTC string for `now + offsetSeconds`. */
export function isoFromNowPlusSeconds(offsetSeconds: number): string {
  return new Date(Date.now() + offsetSeconds * 1000).toISOString();
}

/** Generate a random URL-safe base-64 string (opaque pairing token). */
export function newPairingToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}
