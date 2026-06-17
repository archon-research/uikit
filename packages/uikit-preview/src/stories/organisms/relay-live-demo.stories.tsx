/* eslint-disable react/iframe-missing-sandbox -- the canvas embeds our own first-party, same-origin Ladle preview, which requires both allow-scripts (to run) and allow-same-origin (to read its own assets/meta). The combo is intentional for trusted same-origin content. */
/**
 * Relay live demo (Cloudflare).
 *
 * Unlike the other (static, prop-driven) stories, this one connects to the
 * DEPLOYED relay Worker, then registers tools that let a connected harness
 * drive THIS preview: search components, select a component, and change the
 * theme. The selected component renders in an embedded canvas iframe, so the
 * relay connection in this panel stays alive while the canvas navigates.
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

type StoryMeta = { name: string; levels: string[] };
type Stories = Record<string, StoryMeta>;
type Theme = 'light' | 'dark' | 'auto';

const DEFAULT_STORY = 'atoms--button--item';

// Persist the relay session so a token saved in a harness config keeps working
// across page reloads (the session DO retains its tools server-side). Without
// this, every reload would mint a fresh session and invalidate a saved token.
const SESSION_STORAGE_KEY = 'archon-relay-demo-session-v2';

type StoredSession = {
  connection_token: string;
  ws_url: string;
  expires: number;
};

function loadStoredSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as StoredSession;
    if (!s.connection_token || !s.ws_url) return null;
    if (s.expires && Date.now() > s.expires) return null;
    return s;
  } catch {
    return null;
  }
}

// Tools the connected harness can call to drive this preview. The handlers run
// in the browser (this panel) and manipulate the canvas iframe below.
const PREVIEW_TOOLS = [
  {
    name: 'ladle.searchComponents',
    description:
      'Search the component preview for stories whose name or category matches a query. Returns matching story ids and titles.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Text to match against component and story names.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'ladle.selectComponent',
    description:
      'Display a component story in the preview canvas by its story id (from ladle.searchComponents).',
    input_schema: {
      type: 'object' as const,
      properties: {
        componentId: {
          type: 'string',
          description:
            'The story id to display, e.g. "atoms--button--variants".',
        },
      },
      required: ['componentId'],
    },
  },
  {
    name: 'ladle.setTheme',
    description: 'Set the preview theme.',
    input_schema: {
      type: 'object' as const,
      properties: {
        theme: {
          type: 'string',
          enum: ['light', 'dark', 'auto'],
          description: 'Theme to apply to the preview canvas.',
        },
      },
      required: ['theme'],
    },
  },
];

const frameClassName = css({
  p: '6',
  display: 'flex',
  flexDirection: 'column',
  gap: '4',
  maxWidth: '5xl',
  fontFamily: 'sans',
});

const captionClassName = css({
  fontSize: 'sm',
  color: 'text.muted',
  lineHeight: 'relaxed',
});

const canvasClassName = css({
  width: '100%',
  height: '420px',
  border: '1px solid var(--colors-gray-200, #e5e7eb)',
  borderRadius: '8px',
  background: 'var(--colors-gray-50, #f9fafb)',
});

const logClassName = css({
  fontFamily: 'mono',
  fontSize: 'xs',
  background: 'var(--colors-gray-50, #f9fafb)',
  border: '1px solid var(--colors-gray-200, #e5e7eb)',
  borderRadius: '6px',
  padding: '3',
  maxHeight: '220px',
  overflowY: 'auto',
  whiteSpace: 'pre-wrap',
});

export default {
  title: 'Organisms/Relay Live Demo (Cloudflare)',
};

export const LiveDemo = () => {
  const [status, setStatus] = useState<HarnessIndicatorStatus>('disconnected');
  const [token, setToken] = useState<string | null>(null);
  const [activity, setActivity] = useState<string[]>([]);
  const [storyId, setStoryId] = useState(DEFAULT_STORY);
  const [theme, setTheme] = useState<Theme>('light');

  // Refs so the persistent WebSocket handler reads current values.
  const storiesRef = useRef<Stories>({});
  const wsRef = useRef<WebSocket | null>(null);

  const titleOf = (id: string): string => {
    const meta = storiesRef.current[id];
    return meta ? [...meta.levels, meta.name].join(' / ') : id;
  };

  // Dispatch a tool call to a local handler; returns the JSON result.
  const runTool = (name: string, args: Record<string, unknown>): unknown => {
    if (name === 'ladle.searchComponents') {
      const q = String(args.query ?? '').toLowerCase();
      const matches = Object.entries(storiesRef.current)
        .filter(
          ([id, meta]) =>
            id.toLowerCase().includes(q) ||
            meta.name.toLowerCase().includes(q) ||
            meta.levels.join(' ').toLowerCase().includes(q),
        )
        .slice(0, 25)
        .map(([id, meta]) => ({
          id,
          title: [...meta.levels, meta.name].join(' / '),
        }));
      return { count: matches.length, matches };
    }
    if (name === 'ladle.selectComponent') {
      const id = String(args.componentId ?? '');
      if (!storiesRef.current[id]) {
        return {
          error: `Unknown component id: ${id}. Use ladle.searchComponents first.`,
        };
      }
      setStoryId(id);
      return { selected: id, title: titleOf(id) };
    }
    if (name === 'ladle.setTheme') {
      const next = String(args.theme ?? 'light');
      if (next !== 'light' && next !== 'dark' && next !== 'auto') {
        return { error: `Unknown theme: ${next}. Use light, dark, or auto.` };
      }
      setTheme(next);
      return { theme: next };
    }
    return { error: `Unknown tool: ${name}` };
  };

  // Fetch the Ladle story catalogue (id -> {name, levels}) for search.
  useEffect(() => {
    fetch('/meta.json')
      .then((r) => r.json())
      .then((m: { stories?: Stories }) => {
        storiesRef.current = m.stories ?? {};
      })
      .catch(() => {
        /* leave empty; search will return nothing */
      });
  }, []);

  // Connect to the deployed relay and keep the back-channel open.
  useEffect(() => {
    let closed = false;
    const log = (line: string) =>
      setActivity((prev) =>
        [`${new Date().toLocaleTimeString()}  ${line}`, ...prev].slice(0, 50),
      );

    const connect = async () => {
      try {
        let stored = loadStoredSession();
        if (!stored) {
          const res = await fetch(`${RELAY_BASE_URL}/api/sessions`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: '{}',
          });
          const minted = (await res.json()) as {
            connection_token: string;
            ws_url: string;
          };
          // Re-mint shortly before the 12h connection-token TTL.
          stored = {
            connection_token: minted.connection_token,
            ws_url: minted.ws_url,
            expires: Date.now() + 11 * 60 * 60 * 1000,
          };
          try {
            localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(stored));
          } catch {
            /* storage disabled/full: fall back to an in-memory session */
          }
          if (closed) return;
          log('Minted a new session (saved for reuse across reloads).');
        } else {
          if (closed) return;
          log(
            'Reusing the saved session: the connect token is stable across reloads.',
          );
        }
        setToken(stored.connection_token);
        setStatus('ready');

        const ws = new WebSocket(stored.ws_url);
        wsRef.current = ws;

        ws.onopen = () => {
          ws.send(
            JSON.stringify({
              type: 'hello',
              tab_id: crypto.randomUUID(),
              origin: location.origin,
              url: location.href,
              title: 'uikit relay demo',
              connection_token: stored.connection_token,
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
              log(
                'Back-channel connected. Tools: searchComponents, selectComponent, setTheme.',
              );
              ws.send(
                JSON.stringify({ type: 'tools/list', tools: PREVIEW_TOOLS }),
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
              log(`invoke ${msg.tool_name}(${JSON.stringify(msg.args ?? {})})`);
              const result = runTool(msg.tool_name ?? '', msg.args ?? {});
              ws.send(
                JSON.stringify({
                  type: 'result',
                  call_id: msg.call_id,
                  result,
                }),
              );
              log(`-> ${JSON.stringify(result).slice(0, 160)}`);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canvasSrc = `/?story=${encodeURIComponent(storyId)}&mode=preview&theme=${theme}`;

  return (
    <div className={frameClassName}>
      <p className={captionClassName}>
        This panel connects live to the deployed relay Worker at{' '}
        <code>{RELAY_BASE_URL}</code> and exposes three tools to a connected
        harness: <code>ladle.searchComponents</code>,{' '}
        <code>ladle.selectComponent</code>, and <code>ladle.setTheme</code>.
        Open the connection modal, copy the add command for your harness, run
        it, then ask the harness to (for example) "search for button, show the
        variants story, and switch to dark theme". The canvas below updates live
        while this connection stays open.
      </p>

      <HarnessConnect
        indicatorStatus={status}
        relayBaseUrl={RELAY_BASE_URL}
        connectionToken={token}
        defaultOpen
      />

      <div className={captionClassName}>
        Status: <strong>{status}</strong> &middot; Showing:{' '}
        <strong>{titleOf(storyId)}</strong> &middot; Theme:{' '}
        <strong>{theme}</strong>
      </div>

      <iframe
        title="component preview canvas"
        src={canvasSrc}
        className={canvasClassName}
        // Same-origin Ladle preview: needs scripts to render and same-origin to
        // read its own assets. No allow-forms/popups/top-navigation.
        sandbox="allow-scripts allow-same-origin"
      />

      <div>
        <div className={captionClassName} style={{ marginBottom: 6 }}>
          Live tool activity
        </div>
        <div className={logClassName}>
          {activity.length === 0
            ? 'Waiting for a harness to connect and drive the preview...'
            : activity.join('\n')}
        </div>
      </div>
    </div>
  );
};
