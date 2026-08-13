import { FlashOnChange } from '@archon-research/design-system';
import { useState } from 'react';

import { css } from '../../../styled-system/css';

export default {
  title: 'Atoms/FlashOnChange',
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
  gap: '4',
});

const captionClassName = css({
  fontSize: 'sm',
  color: 'text.muted',
});

const valueClassName = css({
  fontFamily: 'mono',
  fontVariantNumeric: 'tabular-nums',
  fontSize: 'lg',
});

// Resting state (snapshots capture this): FlashOnChange renders its value
// plainly until the value changes, when it flashes a two-phase tint — or, under
// prefers-reduced-motion, shows a discrete marker on a matching timer.
export const Resting = () => (
  <div className={frameClassName}>
    <p className={captionClassName}>
      Wrap any changing value; the flash fires on update.
    </p>
    <div className={rowClassName}>
      <FlashOnChange className={valueClassName} value="1,204.00" />
    </div>
  </div>
);

// Interactive: press to change the value and watch it flash (positive on an
// increase, critical on a decrease).
export const Interactive = () => {
  const [value, setValue] = useState(1200);
  return (
    <div className={frameClassName}>
      <div className={rowClassName}>
        <FlashOnChange
          className={valueClassName}
          value={value.toLocaleString('en-US')}
        />
      </div>
      <div className={rowClassName}>
        <button type="button" onClick={() => setValue((v) => v + 25)}>
          Increase
        </button>
        <button type="button" onClick={() => setValue((v) => v - 25)}>
          Decrease
        </button>
      </div>
    </div>
  );
};
