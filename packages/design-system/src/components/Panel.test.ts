import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Panel } from './Panel.js';

// `PanelProps.title` is the header heading, declared `ReactNode`. It only really
// is one because the props type omits the native `title` attribute instead of
// intersecting with it: `ReactNode & string` collapses to `string`, and this
// case stopped compiling. The assertion is therefore as much a type-check (this
// file is inside `type:check`'s program) as a render check.
describe('Panel title', () => {
  it('accepts a ReactNode title, not just a string', () => {
    const html = renderToStaticMarkup(
      createElement(
        Panel,
        {
          title: createElement(
            'span',
            { 'data-testid': 'rich-title' },
            'Exposure',
          ),
        },
        'body',
      ),
    );

    expect(html).toContain('data-testid="rich-title"');
    expect(html).toContain('Exposure');
  });

  it('renders no header at all without a title, meta, or actions', () => {
    const html = renderToStaticMarkup(createElement(Panel, null, 'body'));

    expect(html).not.toContain('data-part="header"');
  });
});
