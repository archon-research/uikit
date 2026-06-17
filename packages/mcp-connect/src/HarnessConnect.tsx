/**
 * HarnessConnect
 *
 * A chat-bubble icon button carrying a status Indicator reflecting the relay
 * connection + harness attachment state. Clicking the button opens a Dialog
 * (ark-ui via design-system) with setup instructions for connecting Claude
 * Code or GitHub Copilot CLI as a harness.
 *
 * State mapping from props to Indicator status:
 *   no session / token expired          -> idle     (disconnected)
 *   session + WS up, no harness         -> ready
 *   harness attached (harness_status)   -> active   (connected)
 *   WS reconnecting                     -> pending
 */

import {
  Button,
  Dialog,
  Indicator,
  Tabs,
} from '@archon-research/design-system';
import { Check, Copy, MessageCircle, X } from 'lucide-react';
import { useState, type CSSProperties } from 'react';

import type { HarnessIndicatorStatus } from './types.js';

// ---------------------------------------------------------------------------
// Copy-to-clipboard affordance
// ---------------------------------------------------------------------------

function CopyButton({
  text,
  label = 'Copy to clipboard',
}: {
  text: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable; silently ignore.
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? 'Copied!' : label}
      title={copied ? 'Copied!' : label}
      style={copyBtnStyle}
    >
      {copied ? (
        <Check size={12} aria-hidden />
      ) : (
        <Copy size={12} aria-hidden />
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Command display block
// ---------------------------------------------------------------------------

function CommandBlock({ command }: { command: string }) {
  return (
    <div style={cmdWrapStyle}>
      <code style={cmdCodeStyle}>{command}</code>
      <CopyButton text={command} label="Copy command" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export type HarnessConnectProps = {
  /**
   * Indicator status derived from relay connection + harness_status frame.
   * See types.ts for the full mapping.
   */
  indicatorStatus: HarnessIndicatorStatus;
  /**
   * Relay base URL used to construct harness add commands.
   * e.g. "https://example.com" or "" for same-origin.
   */
  relayBaseUrl: string;
  /**
   * Durable connection token the user pastes into their harness config.
   * Null while not connected or expired.
   */
  connectionToken: string | null;
  /**
   * Human-readable name for this connection, used in the add command.
   * Defaults to "uikit-preview".
   */
  serverName?: string;
  /**
   * When true the connection modal starts open. Useful for static story
   * previews that want to show the modal content without requiring a click.
   * Defaults to false.
   */
  defaultOpen?: boolean;
};

/**
 * Drop-in connect UI: a chat icon with a status dot. Clicking it opens the
 * connection setup modal. The modal shows Claude Code and Copilot CLI setup
 * commands with copy affordances.
 */
export function HarnessConnect({
  indicatorStatus,
  relayBaseUrl,
  connectionToken,
  serverName = 'uikit-preview',
  defaultOpen = false,
}: HarnessConnectProps) {
  const [open, setOpen] = useState(defaultOpen);

  const mcpUrl = `${relayBaseUrl}/mcp`;
  const token = connectionToken ?? '<connection-token>';

  const claudeCodeCmd =
    `claude mcp add --transport http ${serverName} ${mcpUrl} ` +
    `--header "Authorization: Bearer ${token}"`;

  // GitHub Copilot CLI uses a JSON config file; provide the config snippet.
  const copilotConfig = JSON.stringify(
    {
      mcpServers: {
        [serverName]: {
          type: 'http',
          url: mcpUrl,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      },
    },
    null,
    2,
  );

  const indicatorDsStatus = mapToDsStatus(indicatorStatus);
  const statusLabel = statusLabels[indicatorStatus];

  return (
    <>
      {/* Chat icon trigger with status dot overlay */}
      <div style={triggerWrapStyle}>
        <Button
          onClick={() => setOpen(true)}
          aria-label={`Open harness connect modal (${statusLabel})`}
          iconOnly
        >
          <MessageCircle size={14} aria-hidden />
        </Button>
        <span style={dotOverlayStyle} aria-hidden>
          <Indicator status={indicatorDsStatus} />
        </span>
      </div>

      {/* Connection modal */}
      <Dialog.Root
        open={open}
        onOpenChange={(details: { open: boolean }) => setOpen(details.open)}
      >
        <Dialog.Backdrop style={backdropStyle} />
        <Dialog.Positioner style={positionerStyle}>
          <Dialog.Content style={dialogStyle}>
            {/* Header */}
            <div style={dialogHeaderStyle}>
              <Dialog.Title style={dialogTitleStyle}>
                Connect a harness
              </Dialog.Title>
              <div style={headerStatusStyle}>
                <Indicator status={indicatorDsStatus}>{statusLabel}</Indicator>
              </div>
              <Dialog.CloseTrigger asChild>
                <Button iconOnly aria-label="Close">
                  <X size={14} aria-hidden />
                </Button>
              </Dialog.CloseTrigger>
            </div>

            {/* Body */}
            <div style={dialogBodyStyle}>
              <Dialog.Description style={dialogDescStyle}>
                Add this relay as an MCP server in your harness configuration.
                The connection token grants access for 12 hours; refresh it from
                this dialog if it expires.
              </Dialog.Description>

              {!connectionToken ? (
                <p style={noTokenStyle}>
                  Connect the session first to generate a connection token.
                </p>
              ) : null}

              {/* Relay URL chip */}
              <div style={fieldGroupStyle}>
                <span style={fieldLabelStyle}>Relay URL</span>
                <div style={cmdWrapStyle}>
                  <code style={cmdCodeStyle}>{mcpUrl}</code>
                  <CopyButton text={mcpUrl} label="Copy relay URL" />
                </div>
              </div>

              {connectionToken ? (
                <div style={fieldGroupStyle}>
                  <span style={fieldLabelStyle}>Connection token</span>
                  <div style={cmdWrapStyle}>
                    <code style={{ ...cmdCodeStyle, wordBreak: 'break-all' }}>
                      {connectionToken}
                    </code>
                    <CopyButton
                      text={connectionToken}
                      label="Copy connection token"
                    />
                  </div>
                </div>
              ) : null}

              {/* Segmented control for harness type */}
              <div style={fieldGroupStyle}>
                <span style={fieldLabelStyle}>Add command</span>
                <Tabs.Root defaultValue="claude-code">
                  <Tabs.List style={tabListStyle}>
                    <Tabs.Trigger value="claude-code" style={tabTriggerStyle}>
                      Claude Code
                    </Tabs.Trigger>
                    <Tabs.Trigger value="copilot" style={tabTriggerStyle}>
                      GitHub Copilot CLI
                    </Tabs.Trigger>
                    <Tabs.Indicator style={tabIndicatorStyle} />
                  </Tabs.List>

                  <Tabs.Content value="claude-code" style={tabContentStyle}>
                    <p style={tabDescStyle}>
                      Run this command to add the relay as a remote MCP server:
                    </p>
                    <CommandBlock command={claudeCodeCmd} />
                    <p style={tabNoteStyle}>
                      Requires Claude Code 1.x with Streamable HTTP MCP support.
                    </p>
                  </Tabs.Content>

                  <Tabs.Content value="copilot" style={tabContentStyle}>
                    <p style={tabDescStyle}>
                      Add the following to your{' '}
                      <code style={inlineCodeStyle}>
                        .github/copilot/mcp.json
                      </code>{' '}
                      (or VS Code settings under{' '}
                      <code style={inlineCodeStyle}>github.copilot.mcp</code>):
                    </p>
                    <CommandBlock command={copilotConfig} />
                    <p style={tabNoteStyle}>
                      Requires GitHub Copilot CLI / Copilot in VS Code with MCP
                      support.
                    </p>
                  </Tabs.Content>
                </Tabs.Root>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </>
  );
}

// ---------------------------------------------------------------------------
// Status mapping helpers
// ---------------------------------------------------------------------------

type DsIndicatorStatus = 'idle' | 'ready' | 'active' | 'pending' | 'error';

function mapToDsStatus(status: HarnessIndicatorStatus): DsIndicatorStatus {
  switch (status) {
    case 'disconnected':
      return 'idle';
    case 'ready':
      return 'ready';
    case 'connected':
      return 'active';
    case 'reconnecting':
      return 'pending';
  }
}

const statusLabels: Record<HarnessIndicatorStatus, string> = {
  disconnected: 'Disconnected',
  ready: 'Ready',
  connected: 'Connected',
  reconnecting: 'Reconnecting',
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const triggerWrapStyle: CSSProperties = {
  position: 'relative',
  display: 'inline-flex',
  // Shrink to the icon button: as a flex/grid child the default align-stretch
  // would otherwise widen this wrapper and push the absolutely-positioned dot
  // to the far edge instead of onto the icon's corner.
  alignSelf: 'flex-start',
  width: 'fit-content',
  flex: 'none',
};

const dotOverlayStyle: CSSProperties = {
  position: 'absolute',
  top: -2,
  right: -2,
  pointerEvents: 'none',
};

const backdropStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15, 23, 42, 0.45)',
  zIndex: 50,
};

const positionerStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '16px',
  zIndex: 51,
  pointerEvents: 'none',
};

const dialogStyle: CSSProperties = {
  background: 'var(--colors-surface-default, #fff)',
  border: '1px solid var(--colors-border-subtle, #e2e8f0)',
  borderRadius: '12px',
  width: 'min(600px, 96vw)',
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
  pointerEvents: 'auto',
};

const dialogHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '14px 16px',
  borderBottom: '1px solid var(--colors-border-subtle, #e2e8f0)',
  flexShrink: 0,
};

const dialogTitleStyle: CSSProperties = {
  flex: 1,
  fontSize: '15px',
  fontWeight: 600,
  color: 'var(--colors-text-default, #111827)',
  margin: 0,
};

const headerStatusStyle: CSSProperties = {
  marginRight: '4px',
};

const dialogBodyStyle: CSSProperties = {
  padding: '20px',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

const dialogDescStyle: CSSProperties = {
  margin: 0,
  fontSize: '13px',
  lineHeight: 1.6,
  color: 'var(--colors-text-muted, #64748b)',
};

const noTokenStyle: CSSProperties = {
  margin: 0,
  fontSize: '13px',
  color: 'var(--colors-warning-default, #d97706)',
};

const fieldGroupStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
};

const fieldLabelStyle: CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--colors-text-muted, #64748b)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const cmdWrapStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '8px',
  background: 'var(--colors-surface-subtle, #f8fafc)',
  border: '1px solid var(--colors-border-subtle, #e2e8f0)',
  borderRadius: '8px',
  padding: '10px 12px',
};

const cmdCodeStyle: CSSProperties = {
  flex: 1,
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  fontSize: '12px',
  lineHeight: 1.55,
  color: 'var(--colors-text-default, #111827)',
  wordBreak: 'break-word',
  whiteSpace: 'pre-wrap',
};

const copyBtnStyle: CSSProperties = {
  flexShrink: 0,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '24px',
  height: '24px',
  borderRadius: '4px',
  border: 'none',
  background: 'transparent',
  color: 'var(--colors-text-muted, #64748b)',
  cursor: 'pointer',
};

const tabListStyle: CSSProperties = {
  display: 'flex',
  gap: '2px',
  background: 'var(--colors-surface-subtle, #f1f5f9)',
  borderRadius: '8px',
  padding: '3px',
  marginBottom: '12px',
  position: 'relative',
};

const tabTriggerStyle: CSSProperties = {
  flex: 1,
  padding: '5px 10px',
  fontSize: '12px',
  fontWeight: 500,
  border: 'none',
  borderRadius: '6px',
  background: 'transparent',
  cursor: 'pointer',
  color: 'var(--colors-text-muted, #64748b)',
  position: 'relative',
  zIndex: 1,
};

const tabIndicatorStyle: CSSProperties = {
  background: 'var(--colors-surface-default, #fff)',
  borderRadius: '6px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
};

const tabContentStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const tabDescStyle: CSSProperties = {
  margin: 0,
  fontSize: '13px',
  color: 'var(--colors-text-muted, #64748b)',
  lineHeight: 1.55,
};

const tabNoteStyle: CSSProperties = {
  margin: 0,
  fontSize: '11px',
  color: 'var(--colors-text-muted, #94a3b8)',
  fontStyle: 'italic',
};

const inlineCodeStyle: CSSProperties = {
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  fontSize: '12px',
  background: 'var(--colors-surface-subtle, #f1f5f9)',
  padding: '1px 4px',
  borderRadius: '3px',
};
