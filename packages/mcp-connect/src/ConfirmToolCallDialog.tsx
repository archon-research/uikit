/* eslint-disable jsx-a11y/prefer-tag-over-role -- this is a custom overlay with its own backdrop and focus handling, not a native dialog element (no showModal lifecycle), so the ARIA dialog role is intentional. */
import { Button } from '@archon-research/design-system';
import { AlertTriangle, ChevronDown, ChevronRight, X } from 'lucide-react';
import {
  useEffect,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react';

import type { PendingCallRecord } from './types.js';

// ---------------------------------------------------------------------------
// Countdown hook
// ---------------------------------------------------------------------------

/**
 * Seconds left before `expiresAt`, ticking once a second. `null` when
 * `expiresAt` does not parse: unknown, which is not the same as expired.
 *
 * The clock reading lives in state rather than being read during render:
 * render has to be pure, and `Date.now()` is not. The interval owns it.
 *
 * The interval is the only writer, and it stops itself at the deadline - so the
 * reading is only as fresh as the last tick, and it stops advancing once the
 * prompt it was mounted for has run out. Call this from a component that is
 * remounted per prompt (see `ConfirmToolCallCard`, keyed on `callId`), never
 * from one that outlives the prompt: the mount is what seeds a fresh reading.
 */
function useSecondsRemaining(expiresAt: string): number | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const deadline = new Date(expiresAt).getTime();
    // An unparseable stamp has no deadline to stop at: `NaN - reading <= 0` is
    // false forever, so the interval below would re-render the card every
    // second for the whole life of the prompt. Nothing to count, so no timer.
    if (!Number.isFinite(deadline)) {
      return;
    }

    const interval = setInterval(() => {
      const reading = Date.now();
      setNow(reading);
      // Stop at the deadline: the value is clamped at zero from here on, so
      // further ticks would only cost renders.
      if (deadline - reading <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const deadline = new Date(expiresAt).getTime();
  if (!Number.isFinite(deadline)) {
    return null;
  }
  return Math.max(0, Math.floor((deadline - now) / 1000));
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
  // Button does not forward ref; use a wrapper div for auto-focus
  const approveFocusRef = useRef<HTMLDivElement>(null);

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
    // oxlint-disable-next-line react/exhaustive-effect-dependencies -- `pendingCall?.callId` is a deliberate trigger-only dep; see the PR description.
  }, [isOpen, pendingCall?.callId]);

  if (!isOpen || !pendingCall) {
    return null;
  }

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

      {/*
        Keyed on the call: the card owns the countdown, and the countdown's
        clock reading is seeded at mount and then only advanced by an interval
        that stops itself at the deadline. Reusing the card across prompts would
        carry the previous prompt's reading into the next one and show it time
        that has already gone. Remounting is what makes the first frame honest.
      */}
      <ConfirmToolCallCard
        key={pendingCall.callId}
        pendingCall={pendingCall}
        queueLength={queueLength}
        approveFocusRef={approveFocusRef}
        onApprove={onApprove}
        onDeny={onDeny}
      />
    </div>
  );
}

type ConfirmToolCallCardProps = {
  pendingCall: PendingCallRecord;
  queueLength: number;
  approveFocusRef: RefObject<HTMLDivElement | null>;
  onApprove: () => void;
  onDeny: () => void;
};

/** The dialog card for one pending call. Mounted once per `callId`. */
function ConfirmToolCallCard({
  pendingCall,
  queueLength,
  approveFocusRef,
  onApprove,
  onDeny,
}: ConfirmToolCallCardProps) {
  const [detailsOpen, toggleDetails] = useReducer(
    (prev: boolean) => !prev,
    false,
  );

  const rawSecondsRemaining = useSecondsRemaining(pendingCall.expiresAt);

  const totalTimeout = Math.round(
    (new Date(pendingCall.expiresAt).getTime() -
      new Date(pendingCall.createdAt).getTime()) /
      1000,
  );

  // Both stamps are minted by the relay; `now` is this browser's clock. A
  // browser 30s behind the server reads 150s left of a 120s window - "Expires
  // in 150s" over a 125%-wide bar. The window the server granted is the
  // ceiling no honest reading can pass, so clamp to it. This bounds skew only:
  // the first frame of each prompt is made honest by the per-`callId` remount
  // above, not by this, and the clamp cannot stand in for it - a prompt that
  // waited in the queue is already part-spent when it reaches the head, so a
  // stale reading still lands on the window, not on what is actually left.
  const secondsRemaining =
    rawSecondsRemaining !== null && totalTimeout > 0
      ? Math.min(rawSecondsRemaining, totalTimeout)
      : rawSecondsRemaining;

  const progressPct =
    secondsRemaining !== null && totalTimeout > 0
      ? (secondsRemaining / totalTimeout) * 100
      : 0;

  const countdownStyle: CSSProperties = {
    width: `${progressPct}%`,
    transition: 'width 1s linear',
  };

  const argsJson = JSON.stringify(pendingCall.toolArgs, null, 2);

  return (
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

        <div style={expiryStyle}>{expiryLabel(secondsRemaining)}</div>

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
  );
}

/**
 * The countdown line. An unknown deadline reads as unknown: calling a call
 * "Expired" that the relay will still accept is the more misleading of the two.
 */
function expiryLabel(secondsRemaining: number | null): string {
  if (secondsRemaining === null) {
    return 'Expiry unknown';
  }
  return secondsRemaining > 0 ? `Expires in ${secondsRemaining}s` : 'Expired';
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
