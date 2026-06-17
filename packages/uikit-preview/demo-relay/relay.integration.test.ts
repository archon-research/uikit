/**
 * Integration tests for the Cloudflare Workers MCP relay.
 *
 * Runs in the Workers runtime via @cloudflare/vitest-pool-workers (Miniflare).
 * Tests drive the worker end-to-end: HTTP + WebSocket + Durable Object.
 *
 * The JWT secret is set to "test-secret-for-vitest-only" via miniflare bindings
 * in vitest.config.ts.
 */

import { SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

const TEST_SECRET = 'test-secret-for-vitest-only';

// ---------------------------------------------------------------------------
// Helper: POST /api/sessions
// ---------------------------------------------------------------------------

interface SessionResponse {
  session_id: string;
  pairing_token: string;
  connection_token: string;
  connection_token_expires_at: string;
  ws_url: string;
  expires_at: string;
}

async function createSession(): Promise<SessionResponse> {
  const res = await SELF.fetch('http://localhost/api/sessions', {
    method: 'POST',
  });
  expect(res.status).toBe(201);
  return res.json() as Promise<SessionResponse>;
}

// ---------------------------------------------------------------------------
// Helper: WebSocket handshake
// ---------------------------------------------------------------------------

/**
 * Opens a WebSocket to /ws/sessions/:id, sends hello, and returns the raw
 * WebSocket plus a helper to read the next message.
 *
 * Note: Miniflare supports WebSocket upgrade via fetch() returning status 101
 * with a webSocket field in the response.
 */
async function openBrowserSocket(
  sessionId: string,
  connectionToken: string,
): Promise<{ ws: WebSocket; nextMessage: () => Promise<string> }> {
  const res = await SELF.fetch(`http://localhost/ws/sessions/${sessionId}`, {
    headers: { upgrade: 'websocket' },
  });
  expect(res.status).toBe(101);

  const ws = res.webSocket!;
  ws.accept();

  const messages: string[] = [];
  const waiters: ((msg: string) => void)[] = [];

  ws.addEventListener('message', (event: MessageEvent) => {
    const msg = event.data as string;
    const waiter = waiters.shift();
    if (waiter) {
      waiter(msg);
    } else {
      messages.push(msg);
    }
  });

  const nextMessage = (): Promise<string> => {
    if (messages.length > 0) {
      return Promise.resolve(messages.shift()!);
    }
    return new Promise((resolve) => waiters.push(resolve));
  };

  // Send hello.
  ws.send(
    JSON.stringify({
      type: 'hello',
      tab_id: 'test-tab-1',
      origin: 'http://localhost',
      url: 'http://localhost',
      connection_token: connectionToken,
    }),
  );

  return { ws, nextMessage };
}

// ---------------------------------------------------------------------------
// Helper: POST /mcp
// ---------------------------------------------------------------------------

async function mcpCall(
  connectionToken: string,
  method: string,
  params?: Record<string, unknown>,
  id: number = 1,
) {
  const body = { jsonrpc: '2.0', id, method, ...(params ? { params } : {}) };
  const res = await SELF.fetch('http://localhost/mcp', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${connectionToken}`,
    },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<Record<string, unknown>>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/sessions', () => {
  it('returns a session with the required fields', async () => {
    const session = await createSession();
    expect(session.session_id).toBeTruthy();
    expect(session.connection_token).toBeTruthy();
    expect(session.pairing_token).toBeTruthy();
    expect(session.ws_url).toMatch(/ws:\/\/localhost\/ws\/sessions\//);
    expect(session.connection_token_expires_at).toBeTruthy();
  });
});

describe('WebSocket: hello handshake', () => {
  it('replies hello/accepted for a valid token', async () => {
    const session = await createSession();
    const { nextMessage } = await openBrowserSocket(
      session.session_id,
      session.connection_token,
    );
    const raw = await nextMessage();
    const msg = JSON.parse(raw) as { type: string; session_id: string };
    expect(msg.type).toBe('hello/accepted');
    expect(msg.session_id).toBe(session.session_id);
  });

  it('replies hello/rejected for a missing token', async () => {
    const session = await createSession();
    const res = await SELF.fetch(
      `http://localhost/ws/sessions/${session.session_id}`,
      {
        headers: { upgrade: 'websocket' },
      },
    );
    expect(res.status).toBe(101);
    const ws = res.webSocket!;
    ws.accept();

    const nextMessage = () =>
      new Promise<string>((resolve) => {
        ws.addEventListener(
          'message',
          (e: MessageEvent) => resolve(e.data as string),
          { once: true },
        );
      });

    ws.send(
      JSON.stringify({
        type: 'hello',
        tab_id: 'test-tab',
        origin: 'http://localhost',
        url: 'http://localhost',
        // No connection_token
      }),
    );

    const raw = await nextMessage();
    const msg = JSON.parse(raw) as { type: string };
    expect(msg.type).toBe('hello/rejected');
  });
});

describe('POST /mcp initialize', () => {
  it('marks harness attached and pushes harness_status{attached:true} over WS', async () => {
    const session = await createSession();
    const { nextMessage } = await openBrowserSocket(
      session.session_id,
      session.connection_token,
    );

    // Wait for hello/accepted.
    const helloRaw = await nextMessage();
    const hello = JSON.parse(helloRaw) as { type: string };
    expect(hello.type).toBe('hello/accepted');

    // Initialize harness concurrently with reading the WS frame.
    const [initResult, wsRaw] = await Promise.all([
      mcpCall(session.connection_token, 'initialize'),
      nextMessage(),
    ]);

    // The MCP response must include protocolVersion.
    const result = (initResult['result'] as Record<string, unknown>) ?? {};
    expect(result['protocolVersion']).toBeTruthy();

    // The WS must receive harness_status{attached:true}.
    const statusMsg = JSON.parse(wsRaw) as { type: string; attached: boolean };
    // The DO may push a touch frame (harness_status) before the init frame;
    // collect up to 2 frames and find the one with attached:true.
    const frames: { type: string; attached?: boolean }[] = [statusMsg];
    // Try a short second read (non-blocking).
    const extraRaw = await Promise.race([
      nextMessage(),
      new Promise<null>((r) => setTimeout(() => r(null), 50)),
    ]);
    if (extraRaw) {
      frames.push(JSON.parse(extraRaw) as { type: string; attached?: boolean });
    }

    const attachedFrame = frames.find(
      (f) => f.type === 'harness_status' && f.attached === true,
    );
    expect(attachedFrame).toBeTruthy();
  });
});

describe('tools/call end-to-end flow', () => {
  it('sends invoke, receives result, returns it to MCP caller, emits tool_activity ok', async () => {
    const session = await createSession();
    const { ws, nextMessage } = await openBrowserSocket(
      session.session_id,
      session.connection_token,
    );

    // Consume hello/accepted.
    const helloRaw = await nextMessage();
    expect(JSON.parse(helloRaw)).toMatchObject({ type: 'hello/accepted' });

    // Register one tool via tools/list.
    ws.send(
      JSON.stringify({
        type: 'tools/list',
        tools: [
          {
            name: 'click_button',
            description: 'Clicks a button on the page',
            input_schema: {
              type: 'object',
              properties: { selector: { type: 'string' } },
              required: ['selector'],
            },
          },
        ],
      }),
    );

    // Initialize so harness is attached.
    await Promise.all([
      mcpCall(session.connection_token, 'initialize'),
      nextMessage(),
    ]);
    // Consume extra harness_status frame if any.
    await Promise.race([nextMessage(), new Promise((r) => setTimeout(r, 30))]);

    // tools/list: verify the tool is visible.
    const listResult = await mcpCall(
      session.connection_token,
      'tools/list',
      undefined,
      2,
    );
    const tools =
      ((listResult['result'] as Record<string, unknown>)?.['tools'] as {
        name: string;
      }[]) ?? [];
    expect(tools.some((t) => t.name === 'click_button')).toBe(true);

    // tools/call: start the call, browser answers with result.
    const callPromise = mcpCall(
      session.connection_token,
      'tools/call',
      { name: 'click_button', arguments: { selector: '#submit' } },
      3,
    );

    // Drain frames until we get the invoke (skip tool_activity started).
    let invokeFrame: {
      type: string;
      call_id: string;
      tool_name: string;
    } | null = null;
    const activityFrames: { type: string; status: string }[] = [];

    for (let i = 0; i < 5; i++) {
      const raw = await Promise.race([
        nextMessage(),
        new Promise<null>((r) => setTimeout(() => r(null), 200)),
      ]);
      if (raw === null) break;
      const frame = JSON.parse(raw) as {
        type: string;
        call_id?: string;
        tool_name?: string;
        status?: string;
      };
      if (frame.type === 'invoke') {
        invokeFrame = frame as {
          type: string;
          call_id: string;
          tool_name: string;
        };
        break;
      }
      if (frame.type === 'tool_activity') {
        activityFrames.push(frame as { type: string; status: string });
      }
    }

    expect(invokeFrame).not.toBeNull();
    expect(invokeFrame!.tool_name).toBe('click_button');

    // Browser replies with result.
    ws.send(
      JSON.stringify({
        type: 'result',
        call_id: invokeFrame!.call_id,
        result: { clicked: true },
      }),
    );

    // Wait for the MCP response.
    const callResult = await callPromise;
    const content =
      ((callResult['result'] as Record<string, unknown>)?.['content'] as {
        text: string;
      }[]) ?? [];
    expect(content[0]?.text).toContain('clicked');

    // Wait for the ok tool_activity frame.
    let okActivity: { type: string; status: string } | null = null;
    for (let i = 0; i < 5; i++) {
      const raw = await Promise.race([
        nextMessage(),
        new Promise<null>((r) => setTimeout(() => r(null), 200)),
      ]);
      if (raw === null) break;
      const frame = JSON.parse(raw) as { type: string; status?: string };
      if (frame.type === 'tool_activity' && frame.status === 'ok') {
        okActivity = frame as { type: string; status: string };
        break;
      }
    }
    expect(okActivity).not.toBeNull();
    expect(okActivity!.status).toBe('ok');
  });
});

describe('POST /mcp auth', () => {
  it('returns 401 for a missing bearer', async () => {
    const res = await SELF.fetch('http://localhost/mcp', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 401 for an invalid bearer', async () => {
    const res = await SELF.fetch('http://localhost/mcp', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer not-a-valid-jwt',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize' }),
    });
    expect(res.status).toBe(401);
  });
});

describe('CORS allow-list', () => {
  // vitest.config.ts binds ALLOWED_ORIGINS to two origins.
  const ALLOWED = 'https://allowed.example';
  const DISALLOWED = 'https://evil.example';

  it('echoes an allowed Origin on the preflight', async () => {
    const res = await SELF.fetch('http://localhost/api/sessions', {
      method: 'OPTIONS',
      headers: { Origin: ALLOWED },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ALLOWED);
    expect(res.headers.get('Vary')).toBe('Origin');
  });

  it('does not echo a disallowed Origin (browser blocks the read)', async () => {
    const res = await SELF.fetch('http://localhost/api/sessions', {
      method: 'OPTIONS',
      headers: { Origin: DISALLOWED },
    });
    // Falls back to the canonical (first) configured origin, never the wildcard
    // and never the requester's origin.
    const allow = res.headers.get('Access-Control-Allow-Origin');
    expect(allow).not.toBe(DISALLOWED);
    expect(allow).not.toBe('*');
    expect(allow).toBe(ALLOWED);
  });

  it('reflects an allowed Origin on the actual POST response', async () => {
    const res = await SELF.fetch('http://localhost/api/sessions', {
      method: 'POST',
      headers: { Origin: ALLOWED },
    });
    expect(res.status).toBe(201);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ALLOWED);
  });
});

void TEST_SECRET; // referenced in vitest.config.ts; suppress unused warning
