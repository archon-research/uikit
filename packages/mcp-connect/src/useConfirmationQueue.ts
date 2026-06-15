import { useCallback, useEffect, useState } from 'react';

import type {
  ConfirmationDecision,
  ConfirmationExpiredEvent,
  ConfirmationRequestEvent,
  PendingCall,
} from './types.js';

/**
 * Consumes confirmation_request and confirmation_expired messages
 * from a session back-channel WebSocket and maintains an ordered queue of
 * PendingCall items.
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
   * Called when the user resolves the head-of-queue call. The caller is
   * responsible for sending confirmation_response back over the channel.
   */
  onDecision?: (callId: string, decision: ConfirmationDecision) => void;
};

export type UseConfirmationQueueResult = {
  /** The call at the head of the queue (currently shown to the user). */
  activePendingCall: PendingCall | null;
  /** Total number of pending items (including the active one). */
  queueLength: number;
  /** Approve the active pending call. */
  approve: () => void;
  /** Deny the active pending call. */
  deny: () => void;
  /** Manually enqueue a call (used for testing). */
  enqueuePendingCall: (call: PendingCall) => void;
};

export function useConfirmationQueue({
  backChannel,
  onDecision,
}: UseConfirmationQueueOptions): UseConfirmationQueueResult {
  const [queue, setQueue] = useState<PendingCall[]>([]);

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
        const pendingCall: PendingCall = {
          callId: req.call_id,
          sessionId: '',
          toolName: req.tool_name,
          toolArgs: req.args_preview,
          summary: req.summary,
          createdAt: new Date().toISOString(),
          expiresAt: req.expires_at,
          status: 'pending',
        };
        setQueue((previous) => [...previous, pendingCall]);
        return;
      }

      if (msg['type'] === 'confirmation_expired') {
        const exp = msg as unknown as ConfirmationExpiredEvent;
        setQueue((previous) =>
          previous.filter((call) => call.callId !== exp.call_id),
        );
      }
    };

    backChannel.addEventListener('message', handleMessage);
    return () => {
      backChannel.removeEventListener('message', handleMessage);
    };
  }, [backChannel]);

  const resolveHead = useCallback(
    (decision: ConfirmationDecision) => {
      setQueue((previous) => {
        const head = previous[0];
        if (!head) {
          return previous;
        }

        onDecision?.(head.callId, decision);

        if (backChannel && backChannel.readyState === WebSocket.OPEN) {
          backChannel.send(
            JSON.stringify({
              type: 'confirmation_response',
              call_id: head.callId,
              decision,
            }),
          );
        }

        return previous.slice(1);
      });
    },
    [backChannel, onDecision],
  );

  const approve = useCallback(() => {
    resolveHead('approved');
  }, [resolveHead]);

  const deny = useCallback(() => {
    resolveHead('denied');
  }, [resolveHead]);

  const enqueuePendingCall = useCallback((call: PendingCall) => {
    setQueue((previous) => [...previous, call]);
  }, []);

  return {
    activePendingCall: queue[0] ?? null,
    queueLength: queue.length,
    approve,
    deny,
    enqueuePendingCall,
  };
}
