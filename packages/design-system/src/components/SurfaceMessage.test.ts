import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  SurfaceMessage,
  SurfaceMessageBody,
  SurfaceMessageRoot,
} from './SurfaceMessage.js';

// `SurfaceMessage` renders no DOM state and no effects, so static SSR markup is
// the whole observable output — no DOM environment needed (this package's vitest
// config runs in `node`). Structural assertions are on `data-part`, the stable
// contract the component stamps on every slot. The one class-name assertion
// (tone) is deliberate rather than an exception: this package ships no generated
// `styled-system`, so the Panda class names ARE its styling contract, spelled
// out at the top of `SurfaceMessage.tsx`.
const BODY = 'The last completed run finished 42 minutes ago.';

describe('SurfaceMessage title', () => {
  it('renders a title element when a title is given', () => {
    const html = renderToStaticMarkup(
      createElement(SurfaceMessage, {
        title: 'Reconciliation lagging',
        body: BODY,
      }),
    );

    expect(html).toContain('data-part="title"');
    expect(html).toContain('Reconciliation lagging');
  });

  it('renders NO title element when the title is omitted', () => {
    const html = renderToStaticMarkup(
      createElement(SurfaceMessage, { body: BODY }),
    );

    // Not an empty <p>: the element is absent entirely, so it cannot occupy a
    // line box or contribute the title slot's spacing.
    expect(html).not.toContain('data-part="title"');
    expect(html).toContain('data-part="body"');
  });

  it('treats an empty-string title as omitted', () => {
    // The degenerate case a data-driven caller actually hits (`title={row.label}`
    // where the label is blank). A rendered-but-empty heading would still take a
    // line box and still push the body down by the title's margin, which is the
    // exact defect the optional path exists to avoid.
    const html = renderToStaticMarkup(
      createElement(SurfaceMessage, { title: '', body: BODY }),
    );

    expect(html).not.toContain('data-part="title"');
  });

  it('matches the parts composition exactly when the title is omitted', () => {
    // The compound is meant to be pure sugar over the parts. A body-only
    // message must therefore be byte-identical to Root + Body composed by hand
    // — no stray wrapper, no empty class attribute, no extra slot.
    const compound = renderToStaticMarkup(
      createElement(SurfaceMessage, { body: BODY }),
    );
    const parts = renderToStaticMarkup(
      createElement(
        SurfaceMessageRoot,
        null,
        createElement(SurfaceMessageBody, null, BODY),
      ),
    );

    expect(compound).toBe(parts);
  });

  it('keeps a critical body-only message on the critical root', () => {
    const html = renderToStaticMarkup(
      createElement(SurfaceMessage, { body: BODY, tone: 'critical' }),
    );

    expect(html).toContain('surfaceMessage__root--tone_critical');
    expect(html).not.toContain('data-part="title"');
  });
});
