import { Badge } from '@archon-research/design-system';

import { css } from '../../../styled-system/css';

export default {
  title: 'Atoms/Badge',
};

const frameClassName = css({
  display: 'grid',
  gap: '6',
  p: '6',
  fontFamily: 'sans',
});

const rowClassName = css({
  alignItems: 'center',
  display: 'flex',
  flexWrap: 'wrap',
  gap: '3',
});

const captionClassName = css({
  fontSize: 'sm',
  color: 'text.muted',
});

const VARIANTS = ['solid', 'subtle', 'surface', 'outline'] as const;
const PALETTES = ['neutral', 'green', 'red', 'amber', 'blue'] as const;

// The full variant × colorPalette matrix. Each role token carries a `_dark`
// value, so every cell is structurally dark-aware.
export const Matrix = () => (
  <div className={frameClassName}>
    {VARIANTS.map((variant) => (
      <div key={variant}>
        <p className={captionClassName}>variant="{variant}"</p>
        <div className={rowClassName}>
          {PALETTES.map((colorPalette) => (
            <Badge
              key={colorPalette}
              variant={variant}
              colorPalette={colorPalette}
            >
              {colorPalette}
            </Badge>
          ))}
        </div>
      </div>
    ))}
  </div>
);

export const Sizes = () => (
  <div className={frameClassName}>
    <div className={rowClassName}>
      <Badge size="sm" colorPalette="blue">
        Small
      </Badge>
      <Badge size="md" colorPalette="blue">
        Medium
      </Badge>
    </div>
  </div>
);

// Back-compat: the deprecated `tone` prop still maps onto (colorPalette, subtle).
export const Tones = () => (
  <div className={frameClassName}>
    <p className={captionClassName}>
      Deprecated <code>tone</code> prop (maps to colorPalette +
      variant="subtle").
    </p>
    <div className={rowClassName}>
      <Badge tone="neutral">Neutral</Badge>
      <Badge tone="success">Success</Badge>
      <Badge tone="warning">Warning</Badge>
      <Badge tone="danger">Danger</Badge>
    </div>
  </div>
);

export const InContext = () => (
  <div className={frameClassName}>
    <div className={rowClassName}>
      <span>Build pipeline</span>
      <Badge colorPalette="green">Healthy</Badge>
    </div>
    <div className={rowClassName}>
      <span>Incident response</span>
      <Badge colorPalette="amber">Needs attention</Badge>
    </div>
    <div className={rowClassName}>
      <span>Release</span>
      <Badge variant="solid" colorPalette="blue">
        Shipping
      </Badge>
    </div>
  </div>
);
