import { describe, expect, it } from 'vitest';

import {
  CONNECTION_TOKEN_TTL_SECONDS,
  decodeConnectionToken,
  mintConnectionToken,
  parseBearer,
  sessionIdFromToken,
} from '../tokens.js';

const SECRET = 'test-secret-1234567890abcdef';
const SESSION_ID = 'session-abc-123';
const TAB_ID = 'tab-xyz-456';

describe('tokens', () => {
  describe('mintConnectionToken / sessionIdFromToken round-trip', () => {
    it('returns the session_id from a freshly minted token', async () => {
      const token = await mintConnectionToken(SESSION_ID, TAB_ID, SECRET);
      const result = await sessionIdFromToken(token, SECRET);
      expect(result).toBe(SESSION_ID);
    });

    it('returns null for a token signed with a different secret', async () => {
      const token = await mintConnectionToken(SESSION_ID, TAB_ID, SECRET);
      const result = await sessionIdFromToken(token, 'wrong-secret');
      expect(result).toBeNull();
    });

    it('returns null for a tampered payload', async () => {
      const token = await mintConnectionToken(SESSION_ID, TAB_ID, SECRET);
      const parts = token.split('.');
      // Flip a byte in the payload.
      const payloadBytes = atob(
        parts[1]!.replace(/-/g, '+').replace(/_/g, '/'),
      );
      const tampered = payloadBytes.slice(0, -2) + 'XX';
      const tamperedB64 = btoa(tampered)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
      const tamperedToken = `${parts[0]}.${tamperedB64}.${parts[2]}`;
      const result = await sessionIdFromToken(tamperedToken, SECRET);
      expect(result).toBeNull();
    });

    it('returns null for an expired token', async () => {
      const token = await mintConnectionToken(SESSION_ID, TAB_ID, SECRET, -1);
      const result = await sessionIdFromToken(token, SECRET);
      expect(result).toBeNull();
    });

    it('carries channel_id equal to session_id', async () => {
      const token = await mintConnectionToken(SESSION_ID, TAB_ID, SECRET);
      const claims = await decodeConnectionToken(token, SECRET);
      expect(claims?.channel_id).toBe(SESSION_ID);
      expect(claims?.tab_id).toBe(TAB_ID);
    });

    it('sets iss and aud correctly', async () => {
      const token = await mintConnectionToken(SESSION_ID, TAB_ID, SECRET);
      const claims = await decodeConnectionToken(token, SECRET);
      expect(claims?.iss).toBe('urn:webmcp-relay');
      expect(claims?.aud).toBe('synome-mcp');
    });

    it('respects a custom TTL', async () => {
      const before = Math.floor(Date.now() / 1000);
      const ttl = 3600;
      const token = await mintConnectionToken(SESSION_ID, TAB_ID, SECRET, ttl);
      const claims = await decodeConnectionToken(token, SECRET);
      expect(claims?.exp).toBeGreaterThanOrEqual(before + ttl - 1);
      expect(claims?.exp).toBeLessThanOrEqual(before + ttl + 2);
    });

    it('uses CONNECTION_TOKEN_TTL_SECONDS by default (12 h)', () => {
      expect(CONNECTION_TOKEN_TTL_SECONDS).toBe(12 * 3600);
    });
  });

  describe('parseBearer', () => {
    it('extracts a bearer token', () => {
      expect(parseBearer('Bearer my-token-123')).toBe('my-token-123');
    });

    it('is case-insensitive for the scheme', () => {
      expect(parseBearer('bearer abc')).toBe('abc');
    });

    it('returns null for missing auth', () => {
      expect(parseBearer(null)).toBeNull();
      expect(parseBearer(undefined)).toBeNull();
      expect(parseBearer('')).toBeNull();
    });

    it('returns null for non-bearer scheme', () => {
      expect(parseBearer('Basic dXNlcjpwYXNz')).toBeNull();
    });
  });
});
