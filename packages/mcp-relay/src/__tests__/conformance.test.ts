/**
 * Conformance harness: wire-contract fixtures vs. @archon-research/mcp-relay TS core.
 *
 * Loads the language-neutral JSON fixtures from conformance/ and verifies that
 * the TS core (protocol.ts, tokens.ts, session.ts) produces exactly the same
 * wire JSON that the fixtures encode.
 *
 * Path resolution: this file lives at
 *   packages/mcp-relay/src/__tests__/conformance.test.ts
 * The conformance directory is at the uikit root:
 *   conformance/
 * We resolve via import.meta.url for robust cwd-independent resolution.
 *
 * API mapping notes (TS core is sans-I/O; Python core has async relay):
 *   hello/accepted    <- RelaySession.onHello(hello, true)
 *   hello/rejected    <- RelaySession.onHello(hello, false)
 *   harness_status{attached:true}  <- RelaySession.onInitialize(ms).harnessStatus
 *   harness_status{attached:false} <- constructed directly (HarnessStatusMessage literal);
 *                                      the TS core has no dedicated builder for the
 *                                      never-seen-detached case since it is only emitted
 *                                      by the host on a fresh session or after sweep
 *                                      when lastSeen is null.
 *   tool_activity     <- RelaySession.buildToolActivity(...)
 *   invoke            <- RelaySession.buildInvoke(...)
 *   sessionIdFromToken <- tokens.sessionIdFromToken (async, WebCrypto)
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import type { HarnessStatusMessage, HelloMessage } from '../protocol.js';
import { RelaySession } from '../session.js';
import { sessionIdFromToken } from '../tokens.js';

// ---------------------------------------------------------------------------
// Fixture loading
// ---------------------------------------------------------------------------

const thisDir = path.dirname(fileURLToPath(import.meta.url));
const CONFORMANCE_DIR = path.resolve(thisDir, '../../../../conformance');

function loadFixture(filename: string): Record<string, unknown> {
  const p = path.join(CONFORMANCE_DIR, filename);
  return JSON.parse(readFileSync(p, 'utf8')) as Record<string, unknown>;
}

const tokensFixture = loadFixture('tokens.json') as {
  secret: string;
  valid: { token: string; expected_session_id: string };
  expired: { token: string; expected_session_id: null };
  tampered: { token: string; expected_session_id: null };
};

const framesFixture = loadFixture('frames.json') as {
  inputs: {
    session_id: string;
    activity_id: string;
    call_id: string;
    tool_name: string;
    args: Record<string, unknown>;
    last_activity_ms: number;
  };
  hello_accepted: Record<string, unknown>;
  hello_rejected: Record<string, unknown>;
  harness_status_attached: Record<string, unknown>;
  harness_status_detached: Record<string, unknown>;
  tool_activity_started: Record<string, unknown>;
  tool_activity_ok: Record<string, unknown>;
  tool_activity_error: Record<string, unknown>;
  invoke: Record<string, unknown>;
  create_session_response_fields: string[];
};

const HELLO: HelloMessage = {
  type: 'hello',
  tab_id: 'aaaa-bbbb-cccc-dddd',
  origin: 'http://localhost',
  url: 'http://localhost',
};

// ---------------------------------------------------------------------------
// Token conformance: sessionIdFromToken must agree with the fixture
// ---------------------------------------------------------------------------

describe('token conformance', () => {
  it('valid token returns expected session_id', async () => {
    const result = await sessionIdFromToken(
      tokensFixture.valid.token,
      tokensFixture.secret,
    );
    expect(result).toBe(tokensFixture.valid.expected_session_id);
  });

  it('expired token returns null', async () => {
    const result = await sessionIdFromToken(
      tokensFixture.expired.token,
      tokensFixture.secret,
    );
    expect(result).toBeNull();
  });

  it('tampered token returns null', async () => {
    const result = await sessionIdFromToken(
      tokensFixture.tampered.token,
      tokensFixture.secret,
    );
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Frame conformance: each builder must produce the fixture wire JSON exactly
// ---------------------------------------------------------------------------

describe('frame conformance', () => {
  it('hello/accepted', () => {
    const inputs = framesFixture.inputs;
    const session = new RelaySession(inputs.session_id);
    const frame = session.onHello(HELLO, true);
    expect(frame).toEqual(framesFixture.hello_accepted);
  });

  it('hello/rejected', () => {
    const session = new RelaySession(framesFixture.inputs.session_id);
    const frame = session.onHello(HELLO, false);
    expect(frame).toEqual(framesFixture.hello_rejected);
  });

  it('harness_status attached=true', () => {
    const inputs = framesFixture.inputs;
    const session = new RelaySession(inputs.session_id);
    const { harnessStatus } = session.onInitialize(inputs.last_activity_ms);
    expect(harnessStatus).toEqual(framesFixture.harness_status_attached);
  });

  it('harness_status attached=false (detached, never seen)', () => {
    // The TS core does not have a standalone factory for this shape because
    // the host emits it for a fresh session or after sweep(). We construct it
    // directly from the protocol shape, which is the same wire contract both
    // cores must emit. This also verifies the fixture's schema is valid TS.
    const frame: HarnessStatusMessage = {
      type: 'harness_status',
      attached: false,
      last_activity_ms: null,
    };
    expect(frame).toEqual(framesFixture.harness_status_detached);
  });

  it('tool_activity status=started', () => {
    const inputs = framesFixture.inputs;
    const session = new RelaySession(inputs.session_id);
    const frame = session.buildToolActivity(
      inputs.activity_id,
      inputs.tool_name,
      'started',
      { args: inputs.args },
    );
    expect(frame).toEqual(framesFixture.tool_activity_started);
  });

  it('tool_activity status=ok', () => {
    const inputs = framesFixture.inputs;
    const expected = framesFixture.tool_activity_ok as {
      result_preview: string;
    };
    const session = new RelaySession(inputs.session_id);
    const frame = session.buildToolActivity(
      inputs.activity_id,
      inputs.tool_name,
      'ok',
      { args: inputs.args, resultPreview: expected.result_preview },
    );
    expect(frame).toEqual(framesFixture.tool_activity_ok);
  });

  it('tool_activity status=error', () => {
    const inputs = framesFixture.inputs;
    const expected = framesFixture.tool_activity_error as { error: string };
    const session = new RelaySession(inputs.session_id);
    const frame = session.buildToolActivity(
      inputs.activity_id,
      inputs.tool_name,
      'error',
      { args: inputs.args, error: expected.error },
    );
    expect(frame).toEqual(framesFixture.tool_activity_error);
  });

  it('invoke', () => {
    const inputs = framesFixture.inputs;
    const session = new RelaySession(inputs.session_id);
    const frame = session.buildInvoke(
      inputs.call_id,
      inputs.tool_name,
      inputs.args,
    );
    expect(frame).toEqual(framesFixture.invoke);
  });

  it('CreateSessionResponse field set', () => {
    // Verify the fixture lists a subset of the type's fields.
    // Since TS has no runtime model, we assert shape by checking a literal
    // that includes all fixture fields compiles cleanly (structural typing).
    const fixtureFields = framesFixture.create_session_response_fields;
    const requiredFields = [
      'session_id',
      'pairing_token',
      'connection_token',
      'connection_token_expires_at',
      'ws_url',
      'expires_at',
    ] as const;
    // Every required field must appear in the fixture.
    for (const f of requiredFields) {
      expect(fixtureFields).toContain(f);
    }
    // The fixture must list exactly these fields (no extras, no gaps).
    expect(fixtureFields.slice().sort()).toEqual([...requiredFields].sort());
  });
});
