/**
 * Relay live demo (Cloudflare).
 *
 * Unlike the other (static, prop-driven) stories, this one connects to the
 * DEPLOYED relay Worker: it mints a session, opens the WebSocket back-channel,
 * registers a sample tool (demo.echo), and renders HarnessConnect so a visitor
 * can copy the connect command, attach their own harness (Claude Code / GitHub
 * Copilot CLI), and watch tool calls arrive live.
 *
 * This is a minimal browser-side relay client for demonstration. The full
 * Explorer uses the richer @archon-research/webmcp registry + session hooks.
 */
import {
  HarnessConnect,
  type HarnessIndicatorStatus,
} from '@archon-research/mcp-connect';
import { useEffect, useRef, useState } from 'react';

import { css } from '../../../styled-system/css';

// The deployed relay Worker (see packages/uikit-preview/cloudflare).
const RELAY_BASE_URL = 'https://mcp-relay.archon-tech.workers.dev';

const DEMO_TOOL = {
  name: 'demo.echo',
  description:
    'Echo back the provided text. A live demo tool served by this preview page.',
  input_schema: {
    type: 'object' as const,
    properties: { text: { type: 'string', description: 'Text to echo.' } },
    required: ['text'],
  },
};

export default {
  title: 'Organisms/Relay Live Demo (Cloudflare)',
};

const frameClassName = css({
  p: '6',
  display: 'flex',
  flexDirection: 'column',
  gap: '4',
  maxWidth: '3xl',
  fontFamily: 'sans',
});

const captionClassName = css({
  fontSize: 'sm',
  color: 'text.muted',
  lineHeight: 'relaxed',
});

const logClassName = css({
  fontFamily: 'mono',
  fontSize: 'xs',
  background: 'var(--colors-gray-50, #f9fafb)',
  border: '1px solid var(--colors-gray-200, #e5e7eb)',
  borderRadius: '6px',
  padding: '3',
  maxHeight: '320px',
  overflowY: 'auto',
  whiteSpace: 'pre-wrap',
});

export const LiveDemo = () => {
  const [status, setStatus] = useState<HarnessIndicatorStatus>('disconnected');
  const [token, setToken] = useState<string | null>(null);
  const [activity, setActivity] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let closed = false;
    const log = (line: string) =>
      setActivity((prev) =>
        [`${new Date().toLocaleTimeString()}  ${line}`, ...prev].slice(0, 50),
      );

    const connect = async () => {
      try {
        const res = await fetch(`${RELAY_BASE_URL}/api/sessions`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: '{}',
        });
        const session = (await res.json()) as {
          connection_token: string;
          ws_url: string;
        };
        if (closed) return;
        setToken(session.connection_token);
        setStatus('ready');
        log('Session minted; opening the back-channel...');

        const ws = new WebSocket(session.ws_url);
        wsRef.current = ws;

        ws.onopen = () => {
          ws.send(
            JSON.stringify({
              type: 'hello',
              tab_id: crypto.randomUUID(),
              origin: location.origin,
              url: location.href,
              title: 'uikit relay demo',
              connection_token: session.connection_token,
            }),
          );
        };

        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data as string) as {
            type: string;
            attached?: boolean;
            call_id?: string;
            tool_name?: string;
            args?: Record<string, unknown>;
          };
          switch (msg.type) {
            case 'hello/accepted':
              log('Back-channel connected. Registered tool: demo.echo');
              ws.send(
                JSON.stringify({ type: 'tools/list', tools: [DEMO_TOOL] }),
              );
              break;
            case 'harness_status':
              setStatus(msg.attached ? 'connected' : 'ready');
              log(
                msg.attached
                  ? 'A harness attached: status is now connected.'
                  : 'Harness detached: status is back to ready.',
              );
              break;
            case 'invoke': {
              const text = (msg.args?.text as string) ?? '';
              log(`invoke ${msg.tool_name}(${JSON.stringify(msg.args ?? {})})`);
              ws.send(
                JSON.stringify({
                  type: 'result',
                  call_id: msg.call_id,
                  result: { echoed: text, from: 'uikit Pages demo' },
                }),
              );
              log(`-> returned: echoed "${text}"`);
              break;
            }
            case 'ping':
              ws.send(JSON.stringify({ type: 'pong' }));
              break;
            default:
              break;
          }
        };

        ws.onclose = () => {
          if (!closed) setStatus('reconnecting');
        };
      } catch (err) {
        log(`Error: ${(err as Error).message}`);
        setStatus('disconnected');
      }
    };

    void connect();

    return () => {
      closed = true;
      wsRef.current?.close();
    };
  }, []);

  return (
    <div className={frameClassName}>
      <p className={captionClassName}>
        This story connects live to the deployed relay Worker at{' '}
        <code>{RELAY_BASE_URL}</code>. Open the connection modal, copy the add
        command for your harness (Claude Code or GitHub Copilot CLI), run it,
        then ask the harness to call the <code>demo.echo</code> tool with some
        text. You will see the indicator flip to connected and the call appear
        below. (The full Explorer registers its own tools; this page serves a
        single demo tool.)
      </p>

      <HarnessConnect
        indicatorStatus={status}
        relayBaseUrl={RELAY_BASE_URL}
        connectionToken={token}
        defaultOpen
      />

      <div className={captionClassName}>
        Back-channel status: <strong>{status}</strong>
      </div>

      <div>
        <div className={captionClassName} style={{ marginBottom: 6 }}>
          Live tool activity
        </div>
        <div className={logClassName}>
          {activity.length === 0
            ? 'Waiting for a harness to connect and call demo.echo...'
            : activity.join('\n')}
        </div>
      </div>
    </div>
  );
};
