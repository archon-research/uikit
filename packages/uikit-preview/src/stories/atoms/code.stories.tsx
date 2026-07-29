import { Code, CodeBlock } from '@archon-research/design-system';

import { css } from '../../../styled-system/css';

export default {
  title: 'Atoms/Code',
};

const frameClassName = css({
  display: 'grid',
  gap: '6',
  p: '6',
  backgroundColor: 'surface.canvas',
  fontFamily: 'sans',
  color: 'text.default',
  maxWidth: '68ch',
});

const proseClassName = css({
  fontSize: 'md',
  lineHeight: 'relaxed',
  color: 'text.default',
});

const captionClassName = css({
  fontSize: 'sm',
  color: 'text.muted',
});

// Inline `<code>` sits on the text baseline inside running prose.
export const Inline = () => (
  <div className={frameClassName}>
    <p className={proseClassName}>
      Run <Code>npm run generate</Code> to regenerate the styled-system, then
      import tokens from <Code>@archon-research/design-system</Code>. The{' '}
      <Code>surface.canvas</Code> token backs the page frame.
    </p>
  </div>
);

// `CodeBlock` renders a multi-line, scrollable `<pre><code>` block.
export const Block = () => (
  <div className={frameClassName}>
    <p className={captionClassName}>Multi-line block</p>
    <CodeBlock>{`import { Panel, StatTile } from '@archon-research/design-system';

export function Summary() {
  return (
    <Panel title="Overview">
      <StatTile label="AUM" value="$10.68M" />
    </Panel>
  );
}`}</CodeBlock>
  </div>
);

// Inline and block variants side by side.
export const Both = () => (
  <div className={frameClassName}>
    <p className={proseClassName}>
      Install the package with <Code>npm i @archon-research/design-system</Code>{' '}
      and wire the provider:
    </p>
    <CodeBlock>{`import { ThemeProvider } from '@archon-research/design-system';

<ThemeProvider>
  <App />
</ThemeProvider>`}</CodeBlock>
  </div>
);
