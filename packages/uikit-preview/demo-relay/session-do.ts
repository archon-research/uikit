/**
 * SessionDO: Cloudflare Durable Object implementing the relay host layer.
 *
 * One DO instance per session (keyed by session_id via idFromName).
 *
 * CORE vs HOST BOUNDARY
 * ---------------------
 * RelaySession (from @archon-research/mcp-relay) owns framing and state.
 * This DO owns:
 *   - The live WebSocket (browser back-channel), using the CF Hibernation API.
 *   - The async invoke round-trip: generates call_id, sends InvokeMessage,
 *     stores {resolve, reject, timer} in pendingCalls keyed by call_id,
 *     resolves on browser `result` frame, times out after INVOKE_TIMEOUT_MS.
 *   - Liveness TTL sweep via DO alarms (wakes every ALARM_INTERVAL_MS).
 *
 * WebSocket Hibernation: uses state.acceptWebSocket() + webSocketMessage()
 * handler methods so the DO can be evicted between messages and woken on
 * the next incoming frame. This is the recommended CF pattern.
 */

import {
  INVOKE_TIMEOUT_MS,
  RelaySession,
  parseBearer,
  sessionIdFromToken,
} from '@archon-research/mcp-relay';
import type {
  RelaySessionSnapshot,
  ToolDefinition,
} from '@archon-research/mcp-relay';

import type { Env } from './env.js';

interface PendingCall {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  timer: ReturnType<typeof setTimeout>;
}

const ALARM_INTERVAL_MS = 30_000;

export class SessionDO implements DurableObject {
  private readonly state: DurableObjectState;
  private session: RelaySession | null = null;
  private readonly pendingCalls = new Map<string, PendingCall>();
  /** Read from the DO's own env binding; used to verify the hello token. */
  private readonly jwtSecret: string;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.jwtSecret = env.WEBMCP_RELAY_JWT_SECRET;
    if (!this.jwtSecret) {
      // The DO is the security boundary (it is independently addressable), so a
      // missing secret must fail closed at the request layer (see handleMcp /
      // onBrowserMessage). Log loudly here so a deploy that forgot
      // `wrangler secret put` is diagnosable rather than silently authorizing.
      console.error(
        '[relay] WEBMCP_RELAY_JWT_SECRET is not set; all authenticated requests will be rejected.',
      );
    }
    // Rehydrate the in-memory session from storage before any request/message
    // runs. The DO is evicted between events under WebSocket Hibernation, so
    // the registered tools + liveness state must survive in storage, not just
    // memory. blockConcurrencyWhile guarantees this completes before handlers.
    state.blockConcurrencyWhile(async () => {
      const snap = await state.storage.get<RelaySessionSnapshot>('session');
      if (snap) {
        this.session = RelaySession.fromSnapshot(snap);
      }
    });
  }

  /** Persist the durable session state so it survives DO eviction. */
  private async persist(): Promise<void> {
    if (this.session) {
      await this.state.storage.put('session', this.session.toSnapshot());
    }
  }

  // Invoked by the CF runtime, not app code.
  // fallow-ignore-next-line unused-class-member
  async fetch(request: Request): Promise<Response> {
    const sessionId = request.headers.get('x-session-id') ?? '';
    const jwtSecret = this.jwtSecret;

    if (!this.session) {
      this.session = new RelaySession(sessionId);
      await this.state.storage.setAlarm(Date.now() + ALARM_INTERVAL_MS);
      await this.persist();
    }

    const upgradeHeader = request.headers.get('upgrade');
    if (upgradeHeader?.toLowerCase() === 'websocket') {
      return this.handleWebSocketUpgrade(request);
    }

    if (request.method === 'POST') {
      return this.handleMcp(request, jwtSecret);
    }

    return new Response('Not found', { status: 404 });
  }

  // ---------------------------------------------------------------------------
  // Hibernation WebSocket handler methods (called by the CF runtime)
  // ---------------------------------------------------------------------------

  // Invoked by the CF runtime, not app code.
  // fallow-ignore-next-line unused-class-member
  async webSocketMessage(
    ws: WebSocket,
    message: string | ArrayBuffer,
  ): Promise<void> {
    if (!this.session) return;
    const raw =
      typeof message === 'string' ? message : new TextDecoder().decode(message);
    await this.onBrowserMessage(ws, raw);
  }

  // Invoked by the CF runtime, not app code.
  // fallow-ignore-next-line unused-class-member
  async webSocketClose(
    ws: WebSocket,
    _code: number,
    _reason: string,
    _wasClean: boolean,
  ): Promise<void> {
    ws.close();
    this.session?.onDisconnect();
    this.rejectAllPending('Browser disconnected.');
    await this.persist();
  }

  // Invoked by the CF runtime, not app code.
  // fallow-ignore-next-line unused-class-member
  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    // Surface the underlying cause: without this, a browser socket dying
    // mid-invocation leaves no trace and production WS issues are undebuggable.
    console.error('[relay] browser WebSocket error', error);
    ws.close();
    this.session?.onDisconnect();
    this.rejectAllPending('Browser WebSocket error.');
    await this.persist();
  }

  // ---------------------------------------------------------------------------
  // DO alarm
  // ---------------------------------------------------------------------------

  // Invoked by the CF runtime, not app code.
  // fallow-ignore-next-line unused-class-member
  async alarm(): Promise<void> {
    if (!this.session) return;
    const now = Date.now();
    // Always re-arm the alarm, even if the sweep throws: otherwise a single
    // failure would permanently stop liveness sweeps and the harness indicator
    // would stay "connected" forever after a transient error.
    try {
      const statusFrame = this.session.sweep(now);
      if (statusFrame) {
        this.broadcastToAccepted(JSON.stringify(statusFrame));
        await this.persist();
      }
    } catch (err: unknown) {
      console.error('[relay] alarm sweep failed', err);
    } finally {
      await this.state.storage.setAlarm(now + ALARM_INTERVAL_MS);
    }
  }

  // ---------------------------------------------------------------------------
  // WebSocket upgrade
  // ---------------------------------------------------------------------------

  private handleWebSocketUpgrade(_request: Request): Response {
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    // Use hibernatable API: the DO will be woken on incoming messages.
    this.state.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  // ---------------------------------------------------------------------------
  // Browser message dispatch (called from webSocketMessage)
  // ---------------------------------------------------------------------------

  private async onBrowserMessage(ws: WebSocket, raw: string): Promise<void> {
    if (!this.session) return;

    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return;
    }

    const type = msg['type'] as string;

    if (type === 'hello') {
      const token = (msg['connection_token'] as string | undefined) ?? null;
      let tokenValid = false;
      if (token && this.jwtSecret) {
        const sid = await sessionIdFromToken(token, this.jwtSecret);
        tokenValid = sid === this.session.sessionId;
      }
      const reply = this.session.onHello(
        msg as unknown as Parameters<RelaySession['onHello']>[0],
        tokenValid,
      );
      this.wsSend(ws, JSON.stringify(reply));
      await this.persist();
      return;
    }

    if (type === 'tools/list' || type === 'tools/changed') {
      this.session.setTools((msg['tools'] as ToolDefinition[]) ?? []);
      await this.persist();
      return;
    }

    if (type === 'result') {
      const callId = msg['call_id'] as string;
      const pending = this.pendingCalls.get(callId);
      if (pending) {
        clearTimeout(pending.timer);
        this.pendingCalls.delete(callId);
        if (msg['error']) {
          pending.reject(new Error(msg['error'] as string));
        } else {
          pending.resolve(msg['result']);
        }
      } else {
        // No pending call: a malformed/duplicate result, or one that already
        // timed out. Log it so the cause is visible rather than letting the
        // original call silently hit its 30s timeout with a generic message.
        console.warn('[relay] result frame for unknown call_id', callId);
      }
      return;
    }

    // pong, confirmation_response, unknown: ignore in MVP
  }

  // ---------------------------------------------------------------------------
  // MCP JSON-RPC
  // ---------------------------------------------------------------------------

  private async handleMcp(
    request: Request,
    jwtSecret: string,
  ): Promise<Response> {
    if (!this.session) {
      return jsonResponse({ error: 'Session not initialised.' }, 500);
    }

    // Fail closed: the DO is independently addressable, so it enforces auth
    // itself rather than trusting that the Worker validated before forwarding.
    if (!jwtSecret) {
      return jsonResponse(
        { error: 'Relay misconfigured: signing secret is not set.' },
        500,
      );
    }
    const bearer = parseBearer(request.headers.get('authorization'));
    if (!bearer) {
      return jsonResponse({ error: 'Missing bearer token.' }, 401);
    }
    const sid = await sessionIdFromToken(bearer, jwtSecret);
    if (sid !== this.session.sessionId) {
      return jsonResponse({ error: 'Token does not match session.' }, 401);
    }

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return jsonResponse({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Parse error' },
      });
    }

    const method = body['method'] as string;
    const id = body['id'];
    const params = (body['params'] as Record<string, unknown>) ?? {};
    const now = Date.now();

    // Touch harness on every /mcp call.
    const touchFrame = this.session.touch(now);
    this.broadcastToAccepted(JSON.stringify(touchFrame));
    await this.persist();

    if (method === 'initialize') {
      const { harnessStatus } = this.session.onInitialize(now);
      this.broadcastToAccepted(JSON.stringify(harnessStatus));
      await this.persist();
      return jsonResponse({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2025-03-26',
          serverInfo: { name: 'mcp-relay-cf', version: '1' },
          capabilities: { tools: { listChanged: true } },
          _relay: { session_id: this.session.sessionId },
        },
      });
    }

    if (method === 'tools/list') {
      return jsonResponse(this.session.listToolsResult(id));
    }

    if (method === 'tools/call') {
      return this.handleToolsCall(id, params);
    }

    return jsonResponse({
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Method not found: ${method}` },
    });
  }

  private async handleToolsCall(
    requestId: unknown,
    params: Record<string, unknown>,
  ): Promise<Response> {
    if (!this.session) {
      return jsonResponse(toolErrorResult(requestId, 'Session not available.'));
    }
    const toolName = params['name'] as string | undefined;
    const args = (params['arguments'] as Record<string, unknown>) ?? {};

    if (!toolName) {
      return jsonResponse({
        jsonrpc: '2.0',
        id: requestId,
        error: { code: -32602, message: 'Missing tool name' },
      });
    }

    const sockets = this.state.getWebSockets();
    if (sockets.length === 0) {
      return jsonResponse(
        toolErrorResult(
          requestId,
          'No live browser session for this connection.',
        ),
      );
    }

    const callId = crypto.randomUUID();
    const activityId = crypto.randomUUID();

    // Emit started activity.
    const startedFrame = this.session.buildToolActivity(
      activityId,
      toolName,
      'started',
      { args },
    );
    this.broadcastToAccepted(JSON.stringify(startedFrame));

    // Send invoke to browser. Unlike the best-effort activity frames, the
    // invoke MUST reach a live socket; if every send fails, surface the error
    // now rather than letting the call hang until the 30s timeout.
    const invokeFrame = this.session.buildInvoke(callId, toolName, args);
    const delivered = this.broadcastToAccepted(JSON.stringify(invokeFrame));
    if (delivered === 0) {
      const errMsg =
        'Failed to deliver tool call to the browser (no live socket accepted the frame).';
      const errorFrame = this.session.buildToolActivity(
        activityId,
        toolName,
        'error',
        { error: errMsg },
      );
      this.broadcastToAccepted(JSON.stringify(errorFrame));
      return jsonResponse(toolErrorResult(requestId, errMsg));
    }

    // Await result with timeout.
    let result: unknown;
    try {
      result = await new Promise<unknown>((resolve, reject) => {
        const timer = setTimeout(() => {
          this.pendingCalls.delete(callId);
          reject(
            new Error(`Tool call timed out after ${INVOKE_TIMEOUT_MS / 1000}s`),
          );
        }, INVOKE_TIMEOUT_MS);
        this.pendingCalls.set(callId, { resolve, reject, timer });
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const errorFrame = this.session.buildToolActivity(
        activityId,
        toolName,
        'error',
        { error: errMsg },
      );
      this.broadcastToAccepted(JSON.stringify(errorFrame));
      return jsonResponse(toolErrorResult(requestId, errMsg));
    }

    // Emit ok activity with truncated preview.
    const preview = truncate(JSON.stringify(result), 2000);
    const okFrame = this.session.buildToolActivity(activityId, toolName, 'ok', {
      resultPreview: preview,
    });
    this.broadcastToAccepted(JSON.stringify(okFrame));

    return jsonResponse({
      jsonrpc: '2.0',
      id: requestId,
      result: {
        content: [
          {
            type: 'text',
            text: typeof result === 'string' ? result : JSON.stringify(result),
          },
        ],
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /** Send to a specific WebSocket. Returns false if the send threw. */
  private wsSend(ws: WebSocket, payload: string): boolean {
    try {
      ws.send(payload);
      return true;
    } catch (err: unknown) {
      console.error('[relay] ws send failed', err);
      return false;
    }
  }

  /**
   * Broadcast to all accepted (hibernatable) WebSockets.
   * Returns the number of sockets that accepted the frame.
   */
  private broadcastToAccepted(payload: string): number {
    let delivered = 0;
    for (const ws of this.state.getWebSockets()) {
      if (this.wsSend(ws, payload)) delivered += 1;
    }
    return delivered;
  }

  private rejectAllPending(reason: string): void {
    for (const [callId, pending] of this.pendingCalls) {
      clearTimeout(pending.timer);
      pending.reject(new Error(reason));
      this.pendingCalls.delete(callId);
    }
  }
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function toolErrorResult(requestId: unknown, message: string): object {
  return {
    jsonrpc: '2.0',
    id: requestId,
    result: { isError: true, content: [{ type: 'text', text: message }] },
  };
}

function truncate(text: string, limit: number): string {
  return text.length <= limit ? text : text.slice(0, limit) + '...(truncated)';
}
