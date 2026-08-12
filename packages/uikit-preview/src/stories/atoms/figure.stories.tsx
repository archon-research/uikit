import { Figure } from '@archon-research/design-system';

import { css } from '../../../styled-system/css';

export default {
  title: 'Atoms/Figure',
};

const frameClassName = css({
  display: 'grid',
  gap: '6',
  p: '6',
  backgroundColor: 'surface.canvas',
  fontFamily: 'sans',
  color: 'text.default',
});

const rowClassName = css({
  alignItems: 'center',
  display: 'flex',
  flexWrap: 'wrap',
  gap: '4',
});

const captionClassName = css({
  fontSize: 'sm',
  color: 'text.muted',
});

// tone recolors the figure via semantic text tokens; `default` inherits.
export const Tones = () => (
  <div className={frameClassName}>
    <p className={captionClassName}>tabular-figures numeric display</p>
    <div className={rowClassName}>
      <Figure value="1,234.56" />
      <Figure value="1,234.56" tone="muted" />
      <Figure value="1,234.56" tone="strong" />
      <Figure value="+2.4%" tone="success" />
      <Figure value="±0.0%" tone="warning" />
      <Figure value="-8.1%" tone="critical" />
    </div>
  </div>
);

export const Sizes = () => (
  <div className={frameClassName}>
    <div className={rowClassName}>
      <Figure value="$10.68M" size="sm" />
      <Figure value="$10.68M" size="md" />
      <Figure value="$10.68M" size="lg" />
    </div>
  </div>
);

// Figures share tabular widths, so a column of them aligns down the digits.
export const Column = () => (
  <div className={frameClassName}>
    <div className={css({ display: 'grid', gap: '1', justifyItems: 'end' })}>
      <Figure value="$1,204.00" />
      <Figure value="$86.40" />
      <Figure value="$1,234,567.89" />
      <Figure value="$0.02" />
    </div>
  </div>
);

// `emptyValue` renders when the value is null/undefined (default em dash), so a
// nullable figure needn't be guarded at the call site.
export const EmptyValue = () => (
  <div className={frameClassName}>
    <div className={rowClassName}>
      <Figure value="1,204.00" />
      <Figure value={null} />
      <Figure value={null} emptyValue="n/a" tone="muted" />
    </div>
  </div>
);

// `format` applies a numeric formatter to a raw number (a pre-formatted string
// passes through unchanged) — so one formatter can feed a Figure and an axis.
const usd = (n: number) =>
  n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
export const Formatted = () => (
  <div className={frameClassName}>
    <div className={rowClassName}>
      <Figure value={1234567} format={usd} />
      <Figure value={-8200} format={usd} tone="critical" />
      <Figure value={null} format={usd} />
    </div>
  </div>
);
