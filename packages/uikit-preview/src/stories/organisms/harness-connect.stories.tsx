/**
 * HarnessConnect stories
 *
 * Static state previews of the HarnessConnect icon-button and connection
 * modal. Each story documents one of the four indicatorStatus values so the
 * dot color is visible at a glance.
 *
 * Note: these are purely prop-driven previews. The live ready -> connected
 * transition is driven by an actual harness attaching over the relay and is
 * not exercised on the static preview site.
 *
 * The "ModalOpen" variants use defaultOpen={true} to show the modal content
 * without requiring a click. For the plain icon stories, click the icon to
 * open the modal.
 */

import { HarnessConnect } from '@archon-research/mcp-connect';

import { css } from '../../../styled-system/css';

export default {
  title: 'Organisms/Harness Connect',
};

const RELAY_BASE_URL = 'https://synome.example.com';

// A realistic-looking JWT-shaped dummy token (not a real credential).
const FAKE_TOKEN =
  'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9' +
  '.eyJzdWIiOiJ1c3ItMDEyMyIsInNlc3Npb24iOiJzZXMtYWJjZCIsImV4cCI6MTc1MzQ4MDAwMH0' +
  '.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

const frameClassName = css({
  p: '6',
  display: 'flex',
  flexDirection: 'column',
  gap: '4',
  maxWidth: 'lg',
});

const captionClassName = css({
  fontSize: 'sm',
  color: 'text.muted',
  maxWidth: 'prose',
});

// ---------------------------------------------------------------------------
// Icon-only stories (click the icon to open the modal)
// ---------------------------------------------------------------------------

export const Disconnected = () => (
  <div className={frameClassName}>
    <p className={captionClassName}>
      Status: disconnected. The indicator dot is grey (idle). No connection
      token is available; the modal shows a "connect first" placeholder. Click
      the icon to open the modal.
    </p>
    <HarnessConnect
      indicatorStatus="disconnected"
      relayBaseUrl={RELAY_BASE_URL}
      connectionToken={null}
    />
  </div>
);

export const Ready = () => (
  <div className={frameClassName}>
    <p className={captionClassName}>
      Status: ready. The session and WebSocket are up but no harness has
      attached yet. The dot is yellow. Click the icon to open the modal.
    </p>
    <HarnessConnect
      indicatorStatus="ready"
      relayBaseUrl={RELAY_BASE_URL}
      connectionToken={FAKE_TOKEN}
    />
  </div>
);

export const Connected = () => (
  <div className={frameClassName}>
    <p className={captionClassName}>
      Status: connected. A harness is attached and active. The dot is green.
      Click the icon to open the modal.
    </p>
    <HarnessConnect
      indicatorStatus="connected"
      relayBaseUrl={RELAY_BASE_URL}
      connectionToken={FAKE_TOKEN}
    />
  </div>
);

export const Reconnecting = () => (
  <div className={frameClassName}>
    <p className={captionClassName}>
      Status: reconnecting. The WebSocket dropped and is retrying. The dot is
      amber/pending. Click the icon to open the modal.
    </p>
    <HarnessConnect
      indicatorStatus="reconnecting"
      relayBaseUrl={RELAY_BASE_URL}
      connectionToken={FAKE_TOKEN}
    />
  </div>
);

// ---------------------------------------------------------------------------
// Modal-open variants (defaultOpen=true for documentation)
// ---------------------------------------------------------------------------

export const ModalOpenWithToken = () => (
  <div className={frameClassName}>
    <p className={captionClassName}>
      Connected state with the modal pre-opened. Shows the relay URL, connection
      token, and the Claude Code / GitHub Copilot CLI add commands.
    </p>
    <HarnessConnect
      indicatorStatus="connected"
      relayBaseUrl={RELAY_BASE_URL}
      connectionToken={FAKE_TOKEN}
      defaultOpen
    />
  </div>
);

export const ModalOpenNoToken = () => (
  <div className={frameClassName}>
    <p className={captionClassName}>
      Disconnected state with the modal pre-opened. Shows the "connect first"
      placeholder because no connection token is available yet.
    </p>
    <HarnessConnect
      indicatorStatus="disconnected"
      relayBaseUrl={RELAY_BASE_URL}
      connectionToken={null}
      defaultOpen
    />
  </div>
);
