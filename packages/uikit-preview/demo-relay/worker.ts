/**
 * Cloudflare Worker entry point for the WebMCP relay.
 *
 * Routes:
 *   POST /api/sessions         - mint a session + connection JWT
 *   GET  /ws/sessions/:id      - WebSocket upgrade, forwarded to SessionDO
 *   POST /mcp                  - harness MCP endpoint, forwarded to SessionDO
 *
 * The JWT secret is read from env.WEBMCP_RELAY_JWT_SECRET.
 * Set it in .dev.vars locally and via `wrangler secret put` in production.
 *
 * This Worker backs the live "Relay Live Demo" story in the published preview.
 * See demo-relay/README.md for the deploy + GitHub Pages wiring.
 */

import {
  CONNECTION_TOKEN_TTL_SECONDS,
  isoFromNowPlusSeconds,
  mintConnectionToken,
  newPairingToken,
  parseBearer,
  sessionIdFromToken,
} from '@archon-research/mcp-relay';

import type { Env } from './env.js';

export type { Env };

// CORS: the relay authenticates with a bearer JWT (not cookies), so cross-origin
// access is safe, but we still scope the allowed origin to the configured Pages
// deployment so only our own demo can drive the relay from a browser. The origin
// allow-list comes from env.ALLOWED_ORIGINS (comma-separated); when unset (local
// `wrangler dev`) it falls back to "*". The browser WebSocket is not subject to
// CORS, so the /ws upgrade response is returned untouched (a 101 cannot be
// rewrapped).
function resolveAllowedOrigin(request: Request, env: Env): string {
  const configured = (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (configured.length === 0) return '*';
  const origin = request.headers.get('Origin');
  if (origin && configured.includes(origin)) return origin;
  // Disallowed/absent origin: respond with the canonical origin so the browser
  // blocks the cross-origin read rather than receiving a usable wildcard.
  return configured[0]!;
}

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const allowOrigin = resolveAllowedOrigin(request, env);
  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
  };
  // When the origin is reflected (not "*"), caches must vary on it.
  if (allowOrigin !== '*') headers.Vary = 'Origin';
  return headers;
}

function withCors(res: Response, request: Request, env: Env): Response {
  const headers = new Headers(res.headers);
  for (const [key, value] of Object.entries(corsHeaders(request, env))) {
    headers.set(key, value);
  }
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request, env),
      });
    }

    const url = new URL(request.url);

    // GET /ws/sessions/:id  (WebSocket upgrade) - return untouched (no rewrap).
    const wsMatch = url.pathname.match(/^\/ws\/sessions\/([^/]+)$/);
    if (wsMatch) {
      return forwardToDO(env, wsMatch[1]!, request);
    }

    // POST /api/sessions
    if (request.method === 'POST' && url.pathname === '/api/sessions') {
      return withCors(await handleCreateSession(request, env), request, env);
    }

    // POST /mcp  (harness entry)
    if (request.method === 'POST' && url.pathname === '/mcp') {
      return withCors(await handleMcpEntry(request, env), request, env);
    }

    return withCors(new Response('Not found', { status: 404 }), request, env);
  },
} satisfies ExportedHandler<Env>;

// ---------------------------------------------------------------------------
// POST /api/sessions
// ---------------------------------------------------------------------------

async function handleCreateSession(
  _request: Request,
  env: Env,
): Promise<Response> {
  const secret = requireSecret(env);
  const sessionId = crypto.randomUUID();
  const tabId = crypto.randomUUID();
  const pairingToken = newPairingToken();

  const connectionToken = await mintConnectionToken(
    sessionId,
    tabId,
    secret,
    CONNECTION_TOKEN_TTL_SECONDS,
  );

  // Derive the WS URL from the request origin.
  const origin = new URL(_request.url).origin.replace(/^http/, 'ws');
  const wsUrl = `${origin}/ws/sessions/${sessionId}`;

  const body = {
    session_id: sessionId,
    pairing_token: pairingToken,
    connection_token: connectionToken,
    connection_token_expires_at: isoFromNowPlusSeconds(
      CONNECTION_TOKEN_TTL_SECONDS,
    ),
    ws_url: wsUrl,
    expires_at: isoFromNowPlusSeconds(CONNECTION_TOKEN_TTL_SECONDS),
  };

  return jsonResponse(body, 201);
}

// ---------------------------------------------------------------------------
// POST /mcp
// ---------------------------------------------------------------------------

async function handleMcpEntry(request: Request, env: Env): Promise<Response> {
  const secret = requireSecret(env);
  const bearer = parseBearer(request.headers.get('authorization'));
  if (!bearer) {
    return jsonResponse({ error: 'Missing bearer token.' }, 401);
  }

  const sessionId = await sessionIdFromToken(bearer, secret);
  if (!sessionId) {
    return jsonResponse({ error: 'Invalid or expired token.' }, 401);
  }

  return forwardToDO(env, sessionId, request);
}

// ---------------------------------------------------------------------------
// Forward to SessionDO
// ---------------------------------------------------------------------------

function forwardToDO(
  env: Env,
  sessionId: string,
  request: Request,
): Promise<Response> {
  const id = env.SESSION_DO.idFromName(sessionId);
  const stub = env.SESSION_DO.get(id);
  // The DO receives the original request with the session_id in a custom header
  // so it does not need to re-parse the URL. The JWT secret is NOT forwarded;
  // the DO reads it from its own env binding.
  const forwarded = new Request(request.url, {
    method: request.method,
    headers: {
      ...Object.fromEntries(request.headers.entries()),
      'x-session-id': sessionId,
    },
    body:
      request.method !== 'GET' && request.method !== 'HEAD'
        ? request.body
        : null,
  });
  return stub.fetch(forwarded);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function requireSecret(env: Env): string {
  if (!env.WEBMCP_RELAY_JWT_SECRET) {
    throw new Error('WEBMCP_RELAY_JWT_SECRET is not set.');
  }
  return env.WEBMCP_RELAY_JWT_SECRET;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export { SessionDO } from './session-do.js';
