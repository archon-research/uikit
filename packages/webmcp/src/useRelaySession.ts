/**
 * useRelaySession
 *
 * Drives a relay back-channel from the browser using the tools registered via
 * `useRegisterTool`. This is the piece that lets a connected harness actually
 * call the page's tools:
 *
 *   - mints (or reuses) a session against the relay Worker and keeps the
 *     WebSocket open, reconnecting with exponential backoff;
 *   - advertises the registered tools (`tools/list`) and re-advertises when the
 *     registry changes;
 *   - on `invoke`, runs the registered tool's handler and returns a `result`;
 *   - gates any tool declared `mutation: true` behind a local confirmation: the
 *     invoke is held until the user approves (handler runs, result returned) or
 *     denies (a denial result is returned). The relay stays a dumb pipe — no
 *     confirmation frames cross the wire.
 *
 * Must be called inside <WebMCPProvider>.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import type { ToolDefinition } from './protocol.js';
import { useToolRegistryContext } from './provider.js';
import type { PendingCallPrompt, ToolSpec } from './types.js';

/** Connection state surfaced to the connect UI (mirrors the indicator states). */
export type RelaySessionStatus =
  | 'disconnected'
  | 'ready'
  | 'connected'
  | 'reconnecting';

export interface UseRelaySessionOptions {
  /** Base URL of the relay Worker, e.g. https://mcp-relay.example.workers.dev */
  relayBaseUrl: string;
  /** localStorage key for persisting the session across reloads. */
  storageKey: string;
  /** Human-readable title sent in the `hello` frame. */
  title?: string;
  /** Seconds a mutation confirmation stays open before it self-expires.
   *  Kept under the relay's invoke timeout so a late approval is not wasted. */
  confirmationWindowSeconds?: number;
}

export interface UseRelaySessionResult {
  status: RelaySessionStatus;
  /** Durable token the user pastes into their harness config; null until minted. */
  connectionToken: string | null;
  /** Most-recent-first activity log lines, capped. */
  activity: string[];
  /** The mutation awaiting approval (head of the queue), or null. */
  pendingConfirmation: PendingCallPrompt | null;
  /** Number of mutations waiting (including the active one). */
  pendingQueueLength: number;
  /** Approve the active mutation: run its handler and return the result. */
  approve: () => void;
  /** Deny the active mutation: return a denial result to the harness. */
  deny: () => void;
}

type StoredSession = {
  connection_token: string;
  ws_url: string;
  expires: number;
};

type HeldInvoke = {
  prompt: PendingCallPrompt;
  spec: ToolSpec;
  args: Record<string, unknown>;
};

function toWireTool(spec: ToolSpec): ToolDefinition {
  return {
    name: spec.name,
    description: spec.description,
    input_schema: spec.schema,
    ...(spec.mutation ? { mutation: true } : {}),
  };
}

export function useRelaySession({
  relayBaseUrl,
  storageKey,
  title = 'webmcp relay session',
  confirmationWindowSeconds = 25,
}: UseRelaySessionOptions): UseRelaySessionResult {
  const registry = useToolRegistryContext();

  const [status, setStatus] = useState<RelaySessionStatus>('disconnected');
  const [connectionToken, setConnectionToken] = useState<string | null>(null);
  const [activity, setActivity] = useState<string[]>([]);
  const [pendingQueue, setPendingQueue] = useState<PendingCallPrompt[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const acceptedRef = useRef(false);
  // Invokes held awaiting a confirmation decision, keyed by call_id.
  const heldRef = useRef<Map<string, HeldInvoke>>(new Map());
  // Always read the freshest registry accessor from the WS handler.
  const listToolsRef = useRef(registry.listTools);
  listToolsRef.current = registry.listTools;

  const log = useCallback((line: string) => {
    setActivity((prev) =>
      [`${new Date().toLocaleTimeString()}  ${line}`, ...prev].slice(0, 50),
    );
  }, []);

  const send = useCallback((frame: unknown) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(frame));
    }
  }, []);

  const advertiseTools = useCallback(() => {
    send({
      type: 'tools/list',
      tools: listToolsRef.current().map(toWireTool),
    });
  }, [send]);

  // Run a (non-mutation, or already-approved) tool and return its result frame.
  const runAndRespond = useCallback(
    async (callId: string, spec: ToolSpec, args: Record<string, unknown>) => {
      let result: unknown;
      try {
        result = await spec.handler(args as never);
      } catch (err) {
        result = { error: (err as Error).message };
      }
      send({ type: 'result', call_id: callId, result });
      log(`-> ${JSON.stringify(result).slice(0, 160)}`);
    },
    [send, log],
  );

  const resolveHead = useCallback(
    (decision: 'approved' | 'denied') => {
      setPendingQueue((prev) => {
        const head = prev[0];
        if (!head) return prev;
        const held = heldRef.current.get(head.callId);
        heldRef.current.delete(head.callId);
        if (held) {
          if (decision === 'approved') {
            log(`approved ${held.spec.name}`);
            void runAndRespond(head.callId, held.spec, held.args);
          } else {
            log(`denied ${held.spec.name}`);
            send({
              type: 'result',
              call_id: head.callId,
              result: { denied: true, message: 'The user denied this call.' },
            });
          }
        }
        return prev.slice(1);
      });
    },
    [log, runAndRespond, send],
  );

  const approve = useCallback(() => resolveHead('approved'), [resolveHead]);
  const deny = useCallback(() => resolveHead('denied'), [resolveHead]);

  // Connect + keep the back-channel open, reconnecting with backoff.
  useEffect(() => {
    let closed = false;
    let attempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    function loadStored(): StoredSession | null {
      try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return null;
        const s = JSON.parse(raw) as StoredSession;
        if (!s.connection_token || !s.ws_url) return null;
        if (s.expires && Date.now() > s.expires) return null;
        return s;
      } catch {
        return null;
      }
    }

    async function mintSession(): Promise<StoredSession | null> {
      const res = await fetch(`${relayBaseUrl}/api/sessions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      });
      // A 4xx/5xx body is the Worker's { error } shape, not a session: surface
      // it instead of connecting to ws_url=undefined.
      if (!res.ok) {
        log(`Session mint failed (HTTP ${res.status}); will retry.`);
        return null;
      }
      const minted = (await res.json()) as Partial<StoredSession>;
      if (!minted.connection_token || !minted.ws_url) {
        log('Session mint returned an unexpected response; will retry.');
        return null;
      }
      // Re-mint shortly before the 12h connection-token TTL.
      const stored: StoredSession = {
        connection_token: minted.connection_token,
        ws_url: minted.ws_url,
        expires: Date.now() + 11 * 60 * 60 * 1000,
      };
      try {
        localStorage.setItem(storageKey, JSON.stringify(stored));
      } catch {
        /* storage disabled/full: fall back to an in-memory session */
      }
      log('Minted a new session (saved for reuse across reloads).');
      return stored;
    }

    function scheduleReconnect() {
      if (closed) return;
      attempt += 1;
      const delay = Math.min(30_000, 1000 * 2 ** (attempt - 1));
      setStatus('reconnecting');
      log(`Reconnecting in ${Math.round(delay / 1000)}s (attempt ${attempt}).`);
      reconnectTimer = setTimeout(() => void connect(), delay);
    }

    function handleInvoke(
      callId: string,
      toolName: string,
      args: Record<string, unknown>,
    ) {
      log(`invoke ${toolName}(${JSON.stringify(args)})`);
      const spec = listToolsRef.current().find((t) => t.name === toolName);
      if (!spec) {
        send({
          type: 'result',
          call_id: callId,
          result: { error: `Unknown tool: ${toolName}` },
        });
        return;
      }
      if (!spec.mutation) {
        void runAndRespond(callId, spec, args);
        return;
      }
      // Mutation: hold the invoke and surface a confirmation prompt.
      const now = new Date();
      const prompt: PendingCallPrompt = {
        callId,
        toolName,
        summary: spec.confirmationSummary?.(args as never) ?? toolName,
        argsPreview: args,
        createdAt: now.toISOString(),
        expiresAt: new Date(
          now.getTime() + confirmationWindowSeconds * 1000,
        ).toISOString(),
      };
      heldRef.current.set(callId, { prompt, spec, args });
      setPendingQueue((prev) =>
        prev.some((p) => p.callId === callId) ? prev : [...prev, prompt],
      );
      log(`awaiting confirmation for ${toolName}`);
      // Self-expire so a never-answered prompt does not wedge the dialog.
      setTimeout(() => {
        if (!heldRef.current.has(callId)) return;
        heldRef.current.delete(callId);
        setPendingQueue((prev) => prev.filter((p) => p.callId !== callId));
        log(`confirmation for ${toolName} expired`);
      }, confirmationWindowSeconds * 1000);
    }

    async function connect() {
      try {
        acceptedRef.current = false;
        let stored = loadStored();
        if (stored) {
          log('Reusing the saved session (token is stable across reloads).');
        } else {
          stored = await mintSession();
          if (!stored) {
            scheduleReconnect();
            return;
          }
        }
        if (closed) return;
        setConnectionToken(stored.connection_token);
        setStatus('ready');

        const session = stored;
        const ws = new WebSocket(session.ws_url);
        wsRef.current = ws;

        ws.onopen = () => {
          ws.send(
            JSON.stringify({
              type: 'hello',
              tab_id: crypto.randomUUID(),
              origin: location.origin,
              url: location.href,
              title,
              connection_token: session.connection_token,
            }),
          );
        };

        ws.onmessage = (event) => {
          let msg: Record<string, unknown>;
          try {
            msg = JSON.parse(event.data as string);
          } catch {
            log('Ignored a malformed frame from the relay.');
            return;
          }
          switch (msg['type']) {
            case 'hello/accepted':
              attempt = 0; // back-channel established: reset backoff
              acceptedRef.current = true;
              log('Back-channel connected; advertising tools.');
              advertiseTools();
              break;
            case 'hello/rejected':
              // Stale/invalid token: drop the saved session so the next
              // reconnect mints a fresh one rather than looping on a bad token.
              log('Session rejected by relay; clearing it and re-pairing.');
              try {
                localStorage.removeItem(storageKey);
              } catch {
                /* storage disabled: nothing to clear */
              }
              break;
            case 'harness_status':
              setStatus(msg['attached'] ? 'connected' : 'ready');
              break;
            case 'invoke':
              handleInvoke(
                msg['call_id'] as string,
                (msg['tool_name'] as string) ?? '',
                (msg['args'] as Record<string, unknown>) ?? {},
              );
              break;
            case 'ping':
              send({ type: 'pong' });
              break;
            default:
              break;
          }
        };

        ws.onerror = () => {
          log('WebSocket error; the connection will be retried.');
        };

        ws.onclose = () => {
          acceptedRef.current = false;
          if (!closed) scheduleReconnect();
        };
      } catch (err) {
        log(`Error: ${(err as Error).message}`);
        scheduleReconnect();
      }
    }

    void connect();

    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, [
    relayBaseUrl,
    storageKey,
    title,
    confirmationWindowSeconds,
    log,
    send,
    advertiseTools,
    runAndRespond,
  ]);

  // Re-advertise when the registered tool set changes mid-connection.
  const toolSignature = registry.tools.map((t) => t.name).join(',');
  useEffect(() => {
    if (acceptedRef.current) {
      advertiseTools();
    }
  }, [toolSignature, advertiseTools]);

  return {
    status,
    connectionToken,
    activity,
    pendingConfirmation: pendingQueue[0] ?? null,
    pendingQueueLength: pendingQueue.length,
    approve,
    deny,
  };
}
