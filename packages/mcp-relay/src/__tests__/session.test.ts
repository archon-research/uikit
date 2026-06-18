import { describe, expect, it } from 'vitest';

import { HARNESS_LIVENESS_TTL_MS, RelaySession } from '../session.js';

const SESSION_ID = 'test-session-001';

function makeSession(): RelaySession {
  return new RelaySession(SESSION_ID);
}

describe('RelaySession', () => {
  describe('onHello', () => {
    it('returns hello/accepted when tokenValid=true', () => {
      const s = makeSession();
      const reply = s.onHello(
        {
          type: 'hello',
          tab_id: 'tab-1',
          origin: 'http://localhost',
          url: 'http://localhost',
        },
        true,
      );
      expect(reply.type).toBe('hello/accepted');
      if (reply.type === 'hello/accepted') {
        expect(reply.session_id).toBe(SESSION_ID);
      }
    });

    it('returns hello/rejected when tokenValid=false', () => {
      const s = makeSession();
      const reply = s.onHello(
        {
          type: 'hello',
          tab_id: 'tab-1',
          origin: 'http://localhost',
          url: 'http://localhost',
        },
        false,
      );
      expect(reply.type).toBe('hello/rejected');
    });

    it('transitions state to connected on acceptance', () => {
      const s = makeSession();
      s.onHello(
        {
          type: 'hello',
          tab_id: 'tab-1',
          origin: 'http://localhost',
          url: 'http://localhost',
        },
        true,
      );
      expect(s.state).toBe('connected');
    });
  });

  describe('onInitialize', () => {
    it('flips harnessAttached to true', () => {
      const s = makeSession();
      expect(s.harnessAttached).toBe(false);
      s.onInitialize(Date.now());
      expect(s.harnessAttached).toBe(true);
    });

    it('returns a harness_status frame with attached=true', () => {
      const s = makeSession();
      const now = Date.now();
      const { harnessStatus } = s.onInitialize(now);
      expect(harnessStatus.type).toBe('harness_status');
      expect(harnessStatus.attached).toBe(true);
      expect(harnessStatus.last_activity_ms).toBe(now);
    });
  });

  describe('sweep', () => {
    it('returns null when harness is not attached', () => {
      const s = makeSession();
      const frame = s.sweep(Date.now());
      expect(frame).toBeNull();
    });

    it('returns null when TTL has not elapsed', () => {
      const s = makeSession();
      const now = Date.now();
      s.onInitialize(now);
      const frame = s.sweep(now + 1000, HARNESS_LIVENESS_TTL_MS);
      expect(frame).toBeNull();
    });

    it('returns harness_status{attached:false} when TTL has elapsed', () => {
      const s = makeSession();
      const now = Date.now();
      s.onInitialize(now);
      // Simulate TTL + 1 ms elapsed.
      const frame = s.sweep(now + HARNESS_LIVENESS_TTL_MS + 1);
      expect(frame).not.toBeNull();
      expect(frame?.type).toBe('harness_status');
      expect(frame?.attached).toBe(false);
    });

    it('reverts harnessAttached to false after sweep', () => {
      const s = makeSession();
      const now = Date.now();
      s.onInitialize(now);
      s.sweep(now + HARNESS_LIVENESS_TTL_MS + 1);
      expect(s.harnessAttached).toBe(false);
    });

    it('does not revert a second time once already false', () => {
      const s = makeSession();
      const now = Date.now();
      s.onInitialize(now);
      s.sweep(now + HARNESS_LIVENESS_TTL_MS + 1);
      const secondSweep = s.sweep(now + HARNESS_LIVENESS_TTL_MS + 2);
      expect(secondSweep).toBeNull();
    });
  });

  describe('setTools / listToolsResult', () => {
    it('stores and lists tools', () => {
      const s = makeSession();
      s.setTools([
        {
          name: 'click_button',
          description: 'Clicks a button',
          input_schema: {
            type: 'object',
            properties: { selector: { type: 'string' } },
            required: ['selector'],
          },
        },
      ]);
      const result = s.listToolsResult(42) as {
        result: { tools: { name: string }[] };
      };
      expect(result.result.tools).toHaveLength(1);
      expect(result.result.tools[0]?.name).toBe('click_button');
    });
  });

  describe('buildInvoke', () => {
    it('returns an invoke frame with the correct shape', () => {
      const s = makeSession();
      const frame = s.buildInvoke('call-001', 'click_button', {
        selector: '#btn',
      });
      expect(frame.type).toBe('invoke');
      expect(frame.call_id).toBe('call-001');
      expect(frame.tool_name).toBe('click_button');
      expect(frame.args).toEqual({ selector: '#btn' });
    });
  });

  describe('buildToolActivity', () => {
    it('returns a tool_activity frame with status=started', () => {
      const s = makeSession();
      const frame = s.buildToolActivity('act-001', 'click_button', 'started', {
        args: { selector: '#btn' },
      });
      expect(frame.type).toBe('tool_activity');
      expect(frame.status).toBe('started');
      expect(frame.tool_name).toBe('click_button');
      expect(frame.args).toEqual({ selector: '#btn' });
    });

    it('returns a tool_activity frame with status=ok and result_preview', () => {
      const s = makeSession();
      const frame = s.buildToolActivity('act-001', 'click_button', 'ok', {
        resultPreview: 'clicked',
      });
      expect(frame.status).toBe('ok');
      expect(frame.result_preview).toBe('clicked');
    });

    it('defaults kind to "ui" but honours an explicit kind', () => {
      const s = makeSession();
      expect(s.buildToolActivity('a', 't', 'started').kind).toBe('ui');
      expect(
        s.buildToolActivity('a', 't', 'started', { kind: 'mutation' }).kind,
      ).toBe('mutation');
    });
  });

  describe('toSnapshot / fromSnapshot (DO hibernation durability)', () => {
    it('round-trips the full durable state losslessly', () => {
      const s = makeSession();
      s.setTools([
        {
          name: 'click_button',
          description: 'Clicks a button',
          input_schema: { type: 'object', properties: {}, required: [] },
        },
      ]);
      s.onHello(
        {
          type: 'hello',
          tab_id: 't',
          origin: 'http://localhost',
          url: 'http://localhost',
        },
        true,
      );
      s.onInitialize(1700001234567);

      const restored = RelaySession.fromSnapshot(s.toSnapshot());
      expect(restored.toSnapshot()).toEqual(s.toSnapshot());
      expect(restored.state).toBe('connected');
      expect(restored.harnessAttached).toBe(true);
      expect(restored.lastSeenMs).toBe(1700001234567);
      expect(restored.tools).toHaveLength(1);
    });

    it('defaults unknown/legacy snapshot fields instead of trusting them', () => {
      // Simulates a snapshot written by an older code version (bad state, no
      // attached/lastSeen, non-array tools). fromSnapshot must coerce rather
      // than emit undefined values over the wire afterwards.
      const restored = RelaySession.fromSnapshot({
        sessionId: SESSION_ID,
        // @ts-expect-error deliberately invalid persisted state
        sessionState: 'bogus',
        // @ts-expect-error deliberately invalid persisted tools
        tools: undefined,
        // @ts-expect-error deliberately missing persisted attached
        attached: undefined,
        // @ts-expect-error deliberately missing persisted lastSeen
        lastSeen: undefined,
      });
      expect(restored.state).toBe('pending');
      expect(restored.tools).toEqual([]);
      expect(restored.harnessAttached).toBe(false);
      expect(restored.lastSeenMs).toBeNull();
    });
  });
});
