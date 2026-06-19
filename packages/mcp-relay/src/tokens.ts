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

  // Validate the JWT header before trusting the signature. Pinning alg to HS256
  // closes the classic alg-confusion gap: a token whose header claims alg:none
  // or an asymmetric alg must never verify against the symmetric secret here.
  // Mirrors the Python core, which pins algorithms=[HS256] via python-jose.
  let header: { alg?: unknown; typ?: unknown };
  try {
    header = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(headerB64)),
    ) as { alg?: unknown; typ?: unknown };
  } catch {
    return null;
  }
  if (header.alg !== 'HS256') return null;

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

/**
 * Base-58 alphabet (Bitcoin variant): no 0/O/I/l to avoid transcription errors.
 * Matches the Python core's _BASE58_ALPHABET so both relays mint pairing codes
 * with the same alphabet, length, and entropy.
 */
const BASE58_ALPHABET =
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/**
 * Issue a single-use, short, copy-friendly base-58 pairing code.
 *
 * Twelve base-58 characters give ~70 bits of entropy, comfortably above the
 * 64-bit floor for a 10-minute single-use code. The alphabet/length match the
 * Python core's `new_pairing_token` so the two implementations are interchangeable.
 */
export function newPairingToken(length = 12): string {
  // Rejection-sample random bytes so each character is uniform over the 58-char
  // alphabet (a plain `byte % 58` would bias the first 22 characters).
  const out: string[] = [];
  const limit = 256 - (256 % BASE58_ALPHABET.length);
  while (out.length < length) {
    const buf = new Uint8Array(length - out.length);
    crypto.getRandomValues(buf);
    for (const b of buf) {
      if (b < limit) out.push(BASE58_ALPHABET[b % BASE58_ALPHABET.length]!);
      if (out.length === length) break;
    }
  }
  return out.join('');
}
