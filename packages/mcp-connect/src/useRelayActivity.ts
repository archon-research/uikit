import type { ToolActivityMessage } from '@archon-research/webmcp';
import { useEffect, useState } from 'react';

/**
 * Consumes `tool_activity` frames from a session back-channel WebSocket and
 * maintains a capped, time-ordered feed of what a connected harness is doing in
 * the page (the "Harness activity" feed in the chat window).
 *
 * Each tools/call emits a `started` frame then a terminal one (`ok`/`error`/
 * `denied`), correlated by `activity_id`; this hook collapses them into one
 * entry per call whose status flips as the terminal frame arrives. The browser
 * stamps the receive time. Pass `null` for `backChannel` when not connected.
 */

export type ActivityStatus = 'started' | 'ok' | 'error' | 'denied';
export type ActivityKind = 'data' | 'ui' | 'mutation';

export type HarnessActivity = {
  activityId: string;
  toolName: string;
  kind: ActivityKind;
  status: ActivityStatus;
  args: Record<string, unknown>;
  resultPreview?: string | null;
  error?: string | null;
  /** Client-stamped time the first frame for this call arrived. */
  startedAt: number;
};

const MAX_ENTRIES = 100;

export function useRelayActivity(
  backChannel: WebSocket | null,
): HarnessActivity[] {
  const [activity, setActivity] = useState<HarnessActivity[]>([]);

  useEffect(() => {
    if (!backChannel) return;

    const handleMessage = (event: MessageEvent<string>) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(event.data);
      } catch {
        return;
      }
      if (
        !parsed ||
        typeof parsed !== 'object' ||
        (parsed as Record<string, unknown>)['type'] !== 'tool_activity'
      ) {
        return;
      }

      const msg = parsed as ToolActivityMessage;
      setActivity((previous) => {
        const existingIndex = previous.findIndex(
          (entry) => entry.activityId === msg.activity_id,
        );

        if (existingIndex !== -1) {
          // Terminal frame for a call we already show: update status/result.
          const next = [...previous];
          const existing = next[existingIndex];
          if (existing) {
            next[existingIndex] = {
              ...existing,
              status: msg.status,
              resultPreview: msg.result_preview ?? existing.resultPreview,
              error: msg.error ?? existing.error,
            };
          }
          return next;
        }

        const entry: HarnessActivity = {
          activityId: msg.activity_id,
          toolName: msg.tool_name,
          kind: msg.kind,
          status: msg.status,
          args: msg.args ?? {},
          resultPreview: msg.result_preview ?? null,
          error: msg.error ?? null,
          startedAt: Date.now(),
        };
        // Newest first; cap the feed.
        return [entry, ...previous].slice(0, MAX_ENTRIES);
      });
    };

    backChannel.addEventListener('message', handleMessage);
    return () => {
      backChannel.removeEventListener('message', handleMessage);
    };
  }, [backChannel]);

  return activity;
}
