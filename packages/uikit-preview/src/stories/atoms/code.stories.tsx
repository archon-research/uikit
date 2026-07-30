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

const smallProseClassName = css({
  fontSize: 'sm',
  lineHeight: 'relaxed',
  color: 'text.default',
});

// Inline code sizes relative to its surrounding text (0.9em), so it stays a
// touch smaller than the prose it sits in at any prose size rather than
// snapping to one absolute step.
export const InlineInProse = () => (
  <div className={frameClassName}>
    <p className={proseClassName}>
      In 16px body copy, <Code>npm run generate</Code> tracks the line it sits
      in.
    </p>
    <p className={smallProseClassName}>
      In 14px caption copy, <Code>npm run generate</Code> scales down with the
      surrounding text.
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
