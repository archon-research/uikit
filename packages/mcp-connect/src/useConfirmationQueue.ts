import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  ConfirmationDecision,
  ConfirmationExpiredEvent,
  ConfirmationRequestEvent,
  PendingCallRecord,
} from './types.js';

/**
 * Consumes confirmation_request and confirmation_expired messages
 * from a session back-channel WebSocket and maintains an ordered queue of
 * PendingCallRecord items.
 *
 * The queue is processed one item at a time: the head of the queue is the
 * currently-visible call. Calls are removed from the head when the user
 * resolves them (approve/deny) or when the server sends a
 * confirmation_expired event.
 *
 * Pass null for backChannel when not yet connected. Inject pending calls via
 * enqueuePendingCall directly for tests.
 */

export type UseConfirmationQueueOptions = {
  /** Live session back-channel. Pass null when not yet connected. */
  backChannel: WebSocket | null;
  /**
   * Notification fired AFTER the hook has sent the confirmation_response over
   * the channel and removed the call from the queue. Use it for telemetry or
   * local UI updates; the hook owns the wire send, so do not send again here.
   */
  onDecision?: (callId: string, decision: ConfirmationDecision) => void;
};

export type UseConfirmationQueueResult = {
  /** The call at the head of the queue (currently shown to the user). */
  activePendingCall: PendingCallRecord | null;
  /** Total number of pending items (including the active one). */
  queueLength: number;
  /** Approve the active pending call. */
  approve: () => void;
  /** Deny the active pending call. */
  deny: () => void;
  /** Manually enqueue a call (used for testing). */
  enqueuePendingCall: (call: PendingCallRecord) => void;
};

export function useConfirmationQueue({
  backChannel,
  onDecision,
}: UseConfirmationQueueOptions): UseConfirmationQueueResult {
  const [queue, setQueue] = useState<PendingCallRecord[]>([]);
  // Mirror the queue in a ref so resolveHead can read the current head without
  // performing side effects inside a state updater (which React double-invokes
  // under StrictMode, and which must stay pure).
  const queueRef = useRef<PendingCallRecord[]>(queue);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);
  // call_ids whose confirmation_expired arrived before (or without) a matching
  // confirmation_request. A later request for one of these is dropped so an
  // out-of-order expiry is never silently lost into a stuck dialog.
  const expiredBeforeSeen = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!backChannel) {
      return;
    }

    const handleMessage = (event: MessageEvent<string>) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(event.data);
      } catch {
        return;
      }

      if (!parsed || typeof parsed !== 'object') {
        return;
      }

      const msg = parsed as Record<string, unknown>;

      if (msg['type'] === 'confirmation_request') {
        const req = msg as unknown as ConfirmationRequestEvent;
        // Drop a request whose expiry we already saw out of order.
        if (expiredBeforeSeen.current.delete(req.call_id)) {
          return;
        }
        const pendingCall: PendingCallRecord = {
          callId: req.call_id,
          sessionId: '',
          toolName: req.tool_name,
          toolArgs: req.args_preview,
          summary: req.summary,
          createdAt: new Date().toISOString(),
          expiresAt: req.expires_at,
          status: 'pending',
        };
        setQueue((previous) =>
          // Dedup by call_id: a duplicated request must not enqueue the
          // same mutation (and its approval) twice.
          previous.some((call) => call.callId === pendingCall.callId)
            ? previous
            : [...previous, pendingCall],
        );
        return;
      }

      if (msg['type'] === 'confirmation_expired') {
        const exp = msg as unknown as ConfirmationExpiredEvent;
        let matched = false;
        setQueue((previous) => {
          const next = previous.filter((call) => call.callId !== exp.call_id);
          matched = next.length !== previous.length;
          return next;
        });
        // If nothing matched, the expiry beat its request; remember it so the
        // request, when it arrives, is dropped rather than shown stale.
        if (!matched) {
          expiredBeforeSeen.current.add(exp.call_id);
        }
      }
    };

    backChannel.addEventListener('message', handleMessage);
    return () => {
      backChannel.removeEventListener('message', handleMessage);
    };
  }, [backChannel]);

  const resolveHead = useCallback(
    (decision: ConfirmationDecision) => {
      const head = queueRef.current[0];
      if (!head) {
        return;
      }
      // Require an open channel and a successful send before consuming the
      // decision. If the socket is down or the send throws, keep the call
      // queued so the harness is not left hanging on a decision we dropped.
      if (!backChannel || backChannel.readyState !== WebSocket.OPEN) {
        return;
      }
      try {
        backChannel.send(
          JSON.stringify({
            type: 'confirmation_response',
            call_id: head.callId,
            decision,
          }),
        );
      } catch {
        return;
      }
      setQueue((previous) =>
        previous.filter((call) => call.callId !== head.callId),
      );
      onDecision?.(head.callId, decision);
    },
    [backChannel, onDecision],
  );

  const approve = useCallback(() => {
    resolveHead('approved');
  }, [resolveHead]);

  const deny = useCallback(() => {
    resolveHead('denied');
  }, [resolveHead]);

  const enqueuePendingCall = useCallback((call: PendingCallRecord) => {
    setQueue((previous) =>
      previous.some((existing) => existing.callId === call.callId)
        ? previous
        : [...previous, call],
    );
  }, []);

  return {
    activePendingCall: queue[0] ?? null,
    queueLength: queue.length,
    approve,
    deny,
    enqueuePendingCall,
  };
}
