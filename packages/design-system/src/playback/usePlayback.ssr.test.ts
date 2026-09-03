import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { createLiveSource, createReplaySource } from './types.js';
import { usePlayback } from './usePlayback.js';

// Server rendering runs no effects, so every state the hook exposes must have
// a safe initial value without touching a live source or the DOM —
// `renderToStaticMarkup` doesn't need a DOM/RTL harness, so it can exercise
// that without one, matching how `Panel.test.ts` covers its own server-render
// case.
describe('usePlayback SSR', () => {
  function ReplayProbe() {
    const playback = usePlayback({ source: createReplaySource([]) });
    return createElement('div', null, playback.events.length);
  }

  function LiveProbe() {
    const playback = usePlayback({ source: createLiveSource(() => () => {}) });
    return createElement('div', null, playback.events.length);
  }

  it('renders a replay source on the server without throwing', () => {
    expect(() =>
      renderToStaticMarkup(createElement(ReplayProbe)),
    ).not.toThrow();
  });

  it('renders a live source on the server without throwing', () => {
    expect(() => renderToStaticMarkup(createElement(LiveProbe))).not.toThrow();
  });
});
