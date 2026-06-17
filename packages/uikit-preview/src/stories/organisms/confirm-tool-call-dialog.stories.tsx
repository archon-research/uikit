/**
 * ConfirmToolCallDialog stories
 *
 * Static state previews of the confirmation dialog shown when a harness
 * invokes a mutation tool that requires human approval.
 *
 * Note: these are purely prop-driven previews. onApprove and onDeny are
 * no-ops. The live countdown is functional (expiresAt is computed at render
 * time) but no relay connection is used.
 *
 * The live ready -> connected transition and real tool-call flow are driven
 * by an actual harness over the relay and are not exercised on the static
 * preview site.
 */

import { ConfirmToolCallDialog } from '@archon-research/mcp-connect';
import type { PendingCall } from '@archon-research/mcp-connect';

import { css } from '../../../styled-system/css';

export default {
  title: 'Organisms/Confirm Tool Call Dialog',
};

const frameClassName = css({
  position: 'relative',
  height: '400px',
  border: '1px dashed token(colors.border.subtle)',
  borderRadius: 'md',
  overflow: 'hidden',
});

const captionClassName = css({
  fontSize: 'sm',
  color: 'text.muted',
  maxWidth: 'prose',
  mb: '3',
});

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const NOW_ISO = new Date().toISOString();

/** Returns an ISO string N seconds from now. */
function isoFromNow(seconds: number): string {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

const BASE_CALL: PendingCall = {
  callId: 'call-0001',
  sessionId: 'ses-abcd-1234',
  toolName: 'uikit-preview.demo.echo_write',
  toolArgs: {
    message: 'hello world',
    destination: 'activity-log',
    dry_run: false,
  },
  summary: "Record message: 'hello world'",
  createdAt: NOW_ISO,
  expiresAt: isoFromNow(120),
  status: 'pending',
};

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

export const SinglePending = () => (
  <div>
    <p className={captionClassName}>
      A single pending tool call (queueLength 1). No queue badge is shown.
      Approve and Deny buttons are no-ops in this preview.
    </p>
    <div className={frameClassName}>
      <ConfirmToolCallDialog
        pendingCall={BASE_CALL}
        queueLength={1}
        onApprove={() => {}}
        onDeny={() => {}}
      />
    </div>
  </div>
);

export const QueuedCalls = () => {
  const call: PendingCall = {
    ...BASE_CALL,
    callId: 'call-0002',
    toolName: 'uikit-preview.identities.update',
    toolArgs: {
      identity_id: 'SYN-042',
      field: 'expression',
      value: 'a*b*c',
    },
    summary: "Update identity SYN-042: change expression to 'a*b*c'",
  };

  return (
    <div>
      <p className={captionClassName}>
        Three calls in the queue. The "1 of 3 pending" badge is shown in the
        header. Approve and Deny buttons are no-ops in this preview.
      </p>
      <div className={frameClassName}>
        <ConfirmToolCallDialog
          pendingCall={call}
          queueLength={3}
          onApprove={() => {}}
          onDeny={() => {}}
        />
      </div>
    </div>
  );
};

export const CountdownActive = () => {
  // Expires ~30 seconds from when the story is rendered, so the countdown
  // bar is visibly non-full and ticking.
  const call: PendingCall = {
    ...BASE_CALL,
    callId: 'call-0003',
    toolName: 'uikit-preview.demo.echo_write',
    toolArgs: {
      message: 'urgent write',
      destination: 'audit-trail',
      dry_run: false,
    },
    summary: "Record urgent message: 'urgent write'",
    createdAt: new Date(Date.now() - 90 * 1000).toISOString(),
    expiresAt: isoFromNow(30),
    status: 'pending',
  };

  return (
    <div>
      <p className={captionClassName}>
        Call with ~30 seconds remaining. The orange countdown progress bar is
        partially depleted and continues ticking. Approve and Deny are no-ops.
      </p>
      <div className={frameClassName}>
        <ConfirmToolCallDialog
          pendingCall={call}
          queueLength={1}
          onApprove={() => {}}
          onDeny={() => {}}
        />
      </div>
    </div>
  );
};

export const NoPendingCall = () => (
  <div>
    <p className={captionClassName}>
      pendingCall is null: the dialog renders nothing (hidden state). The dashed
      border shows where the dialog would appear.
    </p>
    <div className={frameClassName}>
      <ConfirmToolCallDialog
        pendingCall={null}
        queueLength={0}
        onApprove={() => {}}
        onDeny={() => {}}
      />
    </div>
  </div>
);
