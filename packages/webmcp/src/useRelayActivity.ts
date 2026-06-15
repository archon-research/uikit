/**
 * useRelayActivity
 *
 * Thin console.info logger for tool_activity frames from the relay back-channel.
 * Each tool call arrival is logged to devtools; no feed state is maintained.
 * Pass null for backChannel when not connected.
 */
import { useEffect } from 'react';

import type { ToolActivityMessage } from './protocol.js';

export function useRelayActivity(backChannel: WebSocket | null): void {
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
      console.info(
        '[web-mcp] tool_activity',
        msg.tool_name,
        msg.status,
        msg.args ?? {},
      );
    };

    backChannel.addEventListener('message', handleMessage);
    return () => {
      backChannel.removeEventListener('message', handleMessage);
    };
  }, [backChannel]);
}
