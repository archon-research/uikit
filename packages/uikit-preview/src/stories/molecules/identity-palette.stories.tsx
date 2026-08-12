import { Figure, useIdentityPalette } from '@archon-research/design-system';

import { css } from '../../../styled-system/css';

export default {
  title: 'Molecules/IdentityPalette',
};

const frameClassName = css({
  display: 'grid',
  gap: '4',
  p: '6',
  backgroundColor: 'surface.canvas',
  fontFamily: 'sans',
  color: 'text.default',
});

const captionClassName = css({ fontSize: 'sm', color: 'text.muted' });

const rowClassName = css({
  display: 'flex',
  alignItems: 'center',
  gap: '2',
  fontSize: 'sm',
});

const swatchClassName = css({
  width: '4',
  height: '4',
  borderRadius: 'sm',
  flexShrink: 0,
});

const IDS = ['BTC-USD', 'ETH-USD', 'SOL-USD', 'AVAX-USD', 'MATIC-USD'];

// `useIdentityPalette` assigns each id a STABLE color (hash → slot, order
// independent) from the `colors.identity.*` tokens — so an entity keeps one
// color across every view, unlike an index-into-a-palette scheme.
export const Swatches = () => {
  const palette = useIdentityPalette(IDS);
  return (
    <div className={frameClassName}>
      <p className={captionClassName}>
        Stable per-id colors from <code>useIdentityPalette</code>.
      </p>
      {IDS.map((id) => (
        <span key={id} className={rowClassName}>
          <span
            className={swatchClassName}
            style={{ background: palette[id] }}
            aria-hidden="true"
          />
          <span>{id}</span>
          <Figure value={palette[id]} tone="muted" size="sm" />
        </span>
      ))}
    </div>
  );
};
