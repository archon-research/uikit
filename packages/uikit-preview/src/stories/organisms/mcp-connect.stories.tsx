/* eslint-disable react/iframe-missing-sandbox -- the canvas embeds our own first-party, same-origin Ladle preview, which requires both allow-scripts (to run) and allow-same-origin (to read its own assets/meta). The combo is intentional for trusted same-origin content. */
/**
 * MCP Connect (live relay demo, Cloudflare).
 *
 * Unlike the other (static, prop-driven) stories, this one connects to the
 * DEPLOYED relay Worker and exposes browser-side tools that let a connected
 * harness drive THIS preview: search components, select one, and change the
 * theme. The selected component renders in an embedded canvas iframe, so the
 * relay connection in this panel stays alive while the canvas navigates.
 *
 * The tools are authored with @archon-research/webmcp (defineTool +
 * useRegisterTool) and wired to the relay by useRelaySession — the same stack
 * the Explorer uses. setTheme is a mutation, so its invoke is gated behind the
 * ConfirmToolCallDialog before it runs.
 */
import {
  ConfirmToolCallDialog,
  HarnessConnect,
  type PendingCallRecord,
} from '@archon-research/mcp-connect';
import {
  defineTool,
  useRegisterTool,
  useRelaySession,
  WebMCPProvider,
} from '@archon-research/webmcp';
import { useEffect, useRef, useState } from 'react';

import { css } from '../../../styled-system/css';

// The deployed relay Worker (see packages/uikit-preview/demo-relay).
const RELAY_BASE_URL = 'https://mcp-relay.archon-tech.workers.dev';

type StoryMeta = { name: string; levels: string[] };
type Stories = Record<string, StoryMeta>;
type Theme = 'light' | 'dark' | 'auto';

const DEFAULT_STORY = 'atoms--button--item';

// Persist the relay session so a token saved in a harness config keeps working
// across page reloads (the session DO retains its tools server-side). Without
// this, every reload would mint a fresh session and invalidate a saved token.
const SESSION_STORAGE_KEY = 'archon-relay-demo-session-v2';

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
  title: 'Organisms/MCP Connect',
};

export const ControlPreview = () => (
  <WebMCPProvider>
    <ControlPreviewInner />
  </WebMCPProvider>
);

const ControlPreviewInner = () => {
  const [storyId, setStoryId] = useState(DEFAULT_STORY);
  const [theme, setTheme] = useState<Theme>('light');

  // The Ladle story catalogue (id -> {name, levels}); fetched once for search.
  const storiesRef = useRef<Stories>({});

  const titleOf = (id: string): string => {
    const meta = storiesRef.current[id];
    return meta ? [...meta.levels, meta.name].join(' / ') : id;
  };

  useEffect(() => {
    // Resolve against the app base so the catalogue loads whether the preview
    // is served at the origin root (local dev) or under a subpath (the deployed
    // PR preview, e.g. /uikit/pr/40/). An absolute "/meta.json" 404s on a subpath.
    const metaUrl = new URL('meta.json', new URL('.', window.location.href));
    fetch(metaUrl)
      .then((r) => r.json())
      .then((m: { stories?: Stories }) => {
        storiesRef.current = m.stories ?? {};
      })
      .catch(() => {
        console.warn('[mcp-connect demo] could not load the story catalogue');
      });
  }, []);

  // Tools the connected harness can call. Handlers run here in the browser and
  // drive the canvas below. Re-created each render is fine: useRegisterTool
  // registers once per tool name and always invokes the latest handler.
  useRegisterTool(
    defineTool({
      name: 'ladle.searchComponents',
      description:
        'Search the component preview for stories whose name or category matches a query. Returns matching story ids and titles.',
      schema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Text to match against component and story names.',
          },
        },
        required: ['query'],
      },
      handler: ({ query }: { query: string }) => {
        const q = String(query ?? '').toLowerCase();
        const matches = Object.entries(storiesRef.current)
          .filter(
            ([id, meta]) =>
              id.toLowerCase().includes(q) ||
              meta.name.toLowerCase().includes(q) ||
              meta.levels.join(' ').toLowerCase().includes(q),
          )
          .slice(0, 25)
          .map(([id]) => ({ id, title: titleOf(id) }));
        return { count: matches.length, matches };
      },
    }),
  );

  useRegisterTool(
    defineTool({
      name: 'ladle.selectComponent',
      description:
        'Display a component story in the preview canvas by its story id (from ladle.searchComponents).',
      schema: {
        type: 'object',
        properties: {
          componentId: {
            type: 'string',
            description:
              'The story id to display, e.g. "atoms--button--variants".',
          },
        },
        required: ['componentId'],
      },
      handler: ({ componentId }: { componentId: string }) => {
        const id = String(componentId ?? '');
        if (!storiesRef.current[id]) {
          return {
            error: `Unknown component id: ${id}. Use ladle.searchComponents first.`,
          };
        }
        setStoryId(id);
        return { selected: id, title: titleOf(id) };
      },
    }),
  );

  useRegisterTool(
    defineTool({
      name: 'ladle.setTheme',
      description: 'Set the preview theme.',
      schema: {
        type: 'object',
        properties: {
          theme: {
            type: 'string',
            enum: ['light', 'dark', 'auto'],
            description: 'Theme to apply to the preview canvas.',
          },
        },
        required: ['theme'],
      },
      mutation: true,
      confirmationSummary: ({ theme: next }: { theme: string }) =>
        `Switch the preview theme to "${next}".`,
      handler: ({ theme: next }: { theme: string }) => {
        if (next !== 'light' && next !== 'dark' && next !== 'auto') {
          return { error: `Unknown theme: ${next}. Use light, dark, or auto.` };
        }
        setTheme(next);
        return { theme: next };
      },
    }),
  );

  const {
    status,
    connectionToken,
    activity,
    pendingConfirmation,
    pendingQueueLength,
    approve,
    deny,
  } = useRelaySession({
    relayBaseUrl: RELAY_BASE_URL,
    storageKey: SESSION_STORAGE_KEY,
    title: 'uikit relay demo',
  });

  // Map the hook's prompt to the dialog's richer record shape.
  const pendingCall: PendingCallRecord | null = pendingConfirmation
    ? {
        callId: pendingConfirmation.callId,
        sessionId: '',
        toolName: pendingConfirmation.toolName,
        toolArgs: pendingConfirmation.argsPreview,
        summary: pendingConfirmation.summary,
        createdAt: pendingConfirmation.createdAt,
        expiresAt: pendingConfirmation.expiresAt,
        status: 'pending',
      }
    : null;

  // Resolve against the app base (not "/...") so the canvas iframe loads under
  // a deployed subpath as well as at the origin root.
  const canvasSrc = new URL(
    `?story=${encodeURIComponent(storyId)}&mode=preview&theme=${theme}`,
    new URL('.', window.location.href),
  ).href;

  return (
    <div className={frameClassName}>
      <p className={captionClassName}>
        This panel connects live to the deployed relay Worker at{' '}
        <code>{RELAY_BASE_URL}</code> and exposes three tools to a connected
        harness: <code>ladle.searchComponents</code>,{' '}
        <code>ladle.selectComponent</code>, and <code>ladle.setTheme</code>.
        Open the connection modal, copy the add command for your harness, run
        it, then ask the harness to (for example) "search for button, show the
        variants story, and switch to dark theme". Changing the theme is a
        mutation, so it pauses for your approval. The canvas below updates live
        while this connection stays open.
      </p>

      <HarnessConnect
        indicatorStatus={status}
        relayBaseUrl={RELAY_BASE_URL}
        connectionToken={connectionToken}
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

      <ConfirmToolCallDialog
        pendingCall={pendingCall}
        queueLength={pendingQueueLength}
        onApprove={approve}
        onDeny={deny}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Static, network-free stories (deterministic; snapshot-tested)
//
// ControlPreview above connects to a live relay and is excluded from visual
// snapshots. These prop-driven stories cover the same surface (the chat-bubble
// button and the connect modal) without any network, so they are safe to snapshot.
// ---------------------------------------------------------------------------

// A realistic-looking JWT-shaped dummy token (not a real credential).
const FAKE_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
  '.eyJzdWIiOiJzZXMtYWJjZCIsImNoYW5uZWxfaWQiOiJzZXMtYWJjZCIsImV4cCI6NDEwMjQ0NDgwMH0' +
  '.ZmFrZS1zaWduYXR1cmUtbm90LXJlYWw';

export const ChatButton = () => (
  <div className={frameClassName}>
    <p className={captionClassName}>
      The MCP Connect entry point: a chat-bubble button whose status dot
      reflects the relay connection. Click it to open the connect modal. This
      story is fully static (no relay connection).
    </p>
    <HarnessConnect
      indicatorStatus="ready"
      relayBaseUrl={RELAY_BASE_URL}
      connectionToken={FAKE_TOKEN}
    />
  </div>
);

export const ConnectModalOpen = () => (
  <div className={frameClassName}>
    <p className={captionClassName}>
      The connect modal pre-opened, showing the relay URL, connection token, and
      the per-harness add commands. Static (no relay connection).
    </p>
    <HarnessConnect
      indicatorStatus="ready"
      relayBaseUrl={RELAY_BASE_URL}
      connectionToken={FAKE_TOKEN}
      defaultOpen
    />
  </div>
);
