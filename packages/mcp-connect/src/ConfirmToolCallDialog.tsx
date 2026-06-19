/* eslint-disable jsx-a11y/prefer-tag-over-role -- this is a custom overlay with its own backdrop and focus handling, not a native dialog element (no showModal lifecycle), so the ARIA dialog role is intentional. */
import { Button } from '@archon-research/design-system';
import { AlertTriangle, ChevronDown, ChevronRight, X } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
} from 'react';

import type { PendingCallRecord } from './types.js';

// ---------------------------------------------------------------------------
// Countdown hook
// ---------------------------------------------------------------------------

function useSecondsRemaining(expiresAt: string | null): number {
  const calc = useCallback(() => {
    if (!expiresAt) {
      return 0;
    }

    const diff = Math.floor(
      (new Date(expiresAt).getTime() - Date.now()) / 1000,
    );
    return Math.max(0, diff);
  }, [expiresAt]);

  const [secondsRemaining, setSecondsRemaining] = useState(calc);

  useEffect(() => {
    setSecondsRemaining(calc());

    if (!expiresAt) {
      return;
    }

    const interval = setInterval(() => {
      const next = calc();
      setSecondsRemaining(next);
      if (next <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [calc, expiresAt]);

  return secondsRemaining;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export type ConfirmToolCallDialogProps = {
  /** The call at the head of the confirmation queue. Null = dialog is closed. */
  pendingCall: PendingCallRecord | null;
  /** Total number of pending items in the queue (including this one). */
  queueLength: number;
  onApprove: () => void;
  onDeny: () => void;
};

/**
 * Full-screen modal overlay that surfaces a pending mutation tool call for
 * human approval.
 *
 * Mount this component at the App.tsx root (always present) so it fires
 * regardless of whether the connect modal is open.
 */
export function ConfirmToolCallDialog({
  pendingCall,
  queueLength,
  onApprove,
  onDeny,
}: ConfirmToolCallDialogProps) {
  const isOpen = pendingCall !== null;
  const [detailsOpen, toggleDetails] = useReducer(
    (prev: boolean) => !prev,
    false,
  );
  // Button does not forward ref; use a wrapper div for auto-focus
  const approveFocusRef = useRef<HTMLDivElement>(null);

  const secondsRemaining = useSecondsRemaining(pendingCall?.expiresAt ?? null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onDeny();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onDeny]);

  // Focus the approve button wrapper when the dialog opens
  useEffect(() => {
    if (isOpen) {
      const focusable =
        approveFocusRef.current?.querySelector<HTMLButtonElement>('button');
      focusable?.focus();
    }
  }, [isOpen, pendingCall?.callId]);

  if (!isOpen || !pendingCall) {
    return null;
  }

  const totalTimeout = pendingCall.expiresAt
    ? Math.round(
        (new Date(pendingCall.expiresAt).getTime() -
          new Date(pendingCall.createdAt).getTime()) /
          1000,
      )
    : 120;
  const progressPct =
    totalTimeout > 0 ? (secondsRemaining / totalTimeout) * 100 : 0;

  const countdownStyle: CSSProperties = {
    width: `${progressPct}%`,
    transition: 'width 1s linear',
  };

  const argsJson = JSON.stringify(pendingCall.toolArgs, null, 2);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Confirm tool call: ${pendingCall.toolName}`}
      aria-describedby="confirm-tool-call-summary"
      style={overlayStyle}
    >
      {/* Backdrop - clicking it denies (same semantics as Escape) */}
      <button
        type="button"
        aria-label="Deny and close"
        onClick={onDeny}
        style={backdropStyle}
      />

      <div style={cardStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={headerLeadingStyle}>
            <AlertTriangle
              size={16}
              aria-hidden
              style={{
                flexShrink: 0,
                color: 'var(--colors-warning-default, #d97706)',
              }}
            />
            <span style={toolNameStyle}>{pendingCall.toolName}</span>
            {queueLength > 1 ? (
              <span style={queueBadgeStyle}>1 of {queueLength} pending</span>
            ) : null}
          </div>
          <Button iconOnly aria-label="Deny and close" onClick={onDeny}>
            <X size={14} aria-hidden />
          </Button>
        </div>

        {/* Countdown progress bar */}
        <div style={progressTrackStyle} aria-hidden>
          <div style={{ ...progressBarStyle, ...countdownStyle }} />
        </div>

        {/* Body */}
        <div style={bodyStyle}>
          <p id="confirm-tool-call-summary" style={summaryStyle}>
            {pendingCall.summary}
          </p>

          <div style={expiryStyle}>
            {secondsRemaining > 0
              ? `Expires in ${secondsRemaining}s`
              : 'Expired'}
          </div>

          {/* Collapsible args preview */}
          <button
            type="button"
            style={detailsToggleStyle}
            onClick={toggleDetails}
            aria-expanded={detailsOpen}
          >
            {detailsOpen ? (
              <ChevronDown size={12} aria-hidden />
            ) : (
              <ChevronRight size={12} aria-hidden />
            )}
            <span>Show details</span>
          </button>

          {detailsOpen ? <pre style={argsPreStyle}>{argsJson}</pre> : null}
        </div>

        {/* Footer */}
        <div style={footerStyle}>
          <Button aria-label="Deny tool call" onClick={onDeny}>
            Deny
          </Button>
          <div ref={approveFocusRef} style={{ display: 'contents' }}>
            <Button aria-label="Approve tool call" onClick={onApprove}>
              Approve
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline styles
// ---------------------------------------------------------------------------

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 60,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '16px',
};

const backdropStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'rgba(15, 23, 42, 0.55)',
  border: 0,
  cursor: 'pointer',
};

const cardStyle: CSSProperties = {
  position: 'relative',
  zIndex: 1,
  width: 'min(560px, 95vw)',
  maxHeight: '80vh',
  background: 'var(--colors-surface-default, #fff)',
  border: '1px solid var(--colors-border-subtle, #e2e8f0)',
  borderRadius: '12px',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
};

const headerStyle: CSSProperties = {
  height: '48px',
  padding: '0 16px',
  borderBottom: '1px solid var(--colors-border-subtle, #e2e8f0)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '8px',
  flexShrink: 0,
};

const headerLeadingStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  minWidth: 0,
  flex: 1,
};

const toolNameStyle: CSSProperties = {
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  fontSize: '13px',
  fontWeight: 600,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const queueBadgeStyle: CSSProperties = {
  fontSize: '11px',
  background: 'var(--colors-surface-subtle, #f1f5f9)',
  border: '1px solid var(--colors-border-subtle, #e2e8f0)',
  borderRadius: '4px',
  padding: '1px 6px',
  whiteSpace: 'nowrap',
  flexShrink: 0,
};

const progressTrackStyle: CSSProperties = {
  height: '3px',
  background: 'var(--colors-border-subtle, #e2e8f0)',
  flexShrink: 0,
};

const progressBarStyle: CSSProperties = {
  height: '100%',
  background: 'var(--colors-warning-default, #d97706)',
};

const bodyStyle: CSSProperties = {
  padding: '20px 20px 16px',
  overflowY: 'auto',
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const summaryStyle: CSSProperties = {
  margin: 0,
  fontSize: '14px',
  lineHeight: '1.55',
  color: 'var(--colors-text-default, #0f172a)',
};

const expiryStyle: CSSProperties = {
  fontSize: '12px',
  color: 'var(--colors-text-muted, #64748b)',
};

const detailsToggleStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  fontSize: '12px',
  color: 'var(--colors-text-muted, #64748b)',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '2px 0',
  alignSelf: 'flex-start',
};

const argsPreStyle: CSSProperties = {
  margin: 0,
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  fontSize: '12px',
  background: 'var(--colors-surface-subtle, #f8fafc)',
  border: '1px solid var(--colors-border-subtle, #e2e8f0)',
  borderRadius: '8px',
  padding: '10px',
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
};

const footerStyle: CSSProperties = {
  padding: '12px 16px',
  borderTop: '1px solid var(--colors-border-subtle, #e2e8f0)',
  display: 'flex',
  justifyContent: 'space-between',
  gap: '8px',
  flexShrink: 0,
};
